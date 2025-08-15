/**
 * Real-time Aircraft Tracking Layer using OpenSky Network API
 * Displays live aircraft positions with category-based styling and hover information
 */

import { IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../config';
import { safeAsyncOperation } from '../utils/errorHandler';

// OpenSky Network API interfaces
interface OpenSkyStateVector {
  icao24: string;           // Unique ICAO 24-bit address of the transponder in hex string representation
  callsign: string | null;  // Callsign of the vehicle (8 chars). Can be null if no callsign has been received
  origin_country: string;   // Country name inferred from the ICAO 24-bit address
  time_position: number | null; // Unix timestamp (seconds) for the last position update. Can be null if no position report was received by OpenSky within the past 15s
  last_contact: number;     // Unix timestamp (seconds) for the last update in general. This field is updated for any new, valid message received from the transponder
  longitude: number | null; // WGS-84 longitude in decimal degrees. Can be null
  latitude: number | null;  // WGS-84 latitude in decimal degrees. Can be null
  baro_altitude: number | null; // Barometric altitude in meters. Can be null
  on_ground: boolean;       // Boolean value which indicates if the position was retrieved from a surface position report
  velocity: number | null;  // Velocity over ground in m/s. Can be null
  true_track: number | null; // True track in decimal degrees clockwise from north (north=0°). Can be null
  vertical_rate: number | null; // Vertical rate in m/s. A positive value indicates that the airplane is climbing, a negative value indicates that it descends. Can be null
  sensors: number[] | null; // IDs of the receivers which contributed to this state vector. Is null if no filtering for sensor was used in the request
  geo_altitude: number | null; // Geometric altitude in meters. Can be null
  squawk: string | null;    // The transponder code aka Squawk. Can be null
  spi: boolean;            // Whether flight status indicates special purpose indicator
  position_source: number; // Origin of this state's position: 0 = ADS-B, 1 = ASTERIX, 2 = MLAT, 3 = FLARM
  category: number;        // Aircraft category: 0=No information, 1=Light, 2=Small, 3=Large, 4=High Vortex Large, 5=Heavy, 6=High Performance, 7=Rotorcraft, etc.
}

interface OpenSkyResponse {
  time: number;           // Time which the state vectors in this response are associated with. All vectors represent the state of an aircraft with the interval [time-1, time].
  states: (string | number | boolean | null)[][] | null; // The state vectors. Each vector is an array containing the following fields in the given order
}

interface PlaneLayerData {
  aircraft: OpenSkyStateVector[];
  lastUpdate: Date | null;
  nextUpdate: Date | null;
  error: string | null;
  totalCount: number;
  activeCount: number; // Aircraft not on ground
}

// Aircraft data cache
let planeDataCache: PlaneLayerData = {
  aircraft: [],
  lastUpdate: null,
  nextUpdate: null,
  error: null,
  totalCount: 0,
  activeCount: 0,
};

// Simple golden yellow aircraft icon - no complex color coding bullshit
const AIRCRAFT_ICON = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24">
  <path fill="#FFD700" d="M14 8.947L22 14v2l-8-2.526v5.36l3 1.666V22l-4.5-1L8 22v-1.5l3-1.667v-5.36L3 16v-2l8-5.053V3.5a1.5 1.5 0 0 1 3 0z"/>
</svg>`)}`;

/**
 * Convert OpenSky raw state vector array to structured object
 */
function parseStateVector(stateArray: (string | number | boolean | null)[]): OpenSkyStateVector | null {
  if (!stateArray || stateArray.length < 17) return null;

  // Validate essential fields
  if (!stateArray[0] || stateArray[5] === null || stateArray[6] === null) {
    return null; // Missing ICAO24 or position
  }

  return {
    icao24: stateArray[0] as string,
    callsign: stateArray[1] as string | null,
    origin_country: stateArray[2] as string,
    time_position: stateArray[3] as number | null,
    last_contact: stateArray[4] as number,
    longitude: stateArray[5] as number,
    latitude: stateArray[6] as number,
    baro_altitude: stateArray[7] as number | null,
    on_ground: stateArray[8] as boolean,
    velocity: stateArray[9] as number | null,
    true_track: stateArray[10] as number | null,
    vertical_rate: stateArray[11] as number | null,
    sensors: stateArray[12] as number[] | null,
    geo_altitude: stateArray[13] as number | null,
    squawk: stateArray[14] as string | null,
    spi: stateArray[15] as boolean,
    position_source: stateArray[16] as number,
    category: stateArray[17] as number || 0,
  };
}

/**
 * OAuth2 token cache
 */
let tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token using client credentials flow
 */
async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  console.log('🛩️ Getting new OAuth2 access token...');
  
  const response = await fetch(CONFIG.styles.planes.oauth2.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: CONFIG.styles.planes.oauth2.grantType,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
  }

  const tokenData = await response.json();
  
  // Cache the token with configured expiration
  tokenCache = {
    token: tokenData.access_token,
    expiresAt: Date.now() + CONFIG.styles.planes.oauth2.tokenCacheExpirationMs,
  };

  console.log('🛩️ OAuth2 access token obtained successfully');
  return tokenData.access_token;
}

/**
 * Get current map viewport bounds for geographic filtering
 * This reduces API costs from 4 credits to 1-2 credits per call
 */
function getViewportBounds(): { lamin: number; lomin: number; lamax: number; lomax: number } | null {
  // Default to a reasonable global area if no map bounds available
  // You can integrate this with your map's viewport later
  return {
    lamin: -85,   // Southern latitude limit
    lomin: -180,  // Western longitude limit  
    lamax: 85,    // Northern latitude limit
    lomax: 180    // Eastern longitude limit
  };
}

/**
 * Fetch aircraft data from OpenSky Network API with OAuth2 authentication and geographic filtering
 */
async function fetchAircraftData(): Promise<OpenSkyResponse> {
  const baseUrl = `${CONFIG.styles.planes.apiBaseUrl}${CONFIG.styles.planes.endpoint}`;
  
  // Build URL with query parameters for optimization
  const params = new URLSearchParams();
  
  // Add extended=1 to get aircraft category information
  params.append('extended', '1');
  
  // Add geographic bounding box to reduce API costs
  const bounds = getViewportBounds();
  if (bounds) {
    params.append('lamin', bounds.lamin.toString());
    params.append('lomin', bounds.lomin.toString());
    params.append('lamax', bounds.lamax.toString());
    params.append('lomax', bounds.lomax.toString());
  }
  
  const url = `${baseUrl}?${params.toString()}`;

  let headers: HeadersInit = {};
  let usingAuth = false;
  
  try {
    const credentialsResponse = await fetch('/credentials.json');
    if (credentialsResponse.ok) {
      const credentials = await credentialsResponse.json();
      
      // Handle OAuth2 client credentials flow
      if (credentials.clientId && credentials.clientSecret) {
        console.log('🛩️ Using OAuth2 Client Credentials flow');
        const accessToken = await getAccessToken(credentials.clientId, credentials.clientSecret);
        headers = {
          'Authorization': `Bearer ${accessToken}`
        };
        usingAuth = true;
        console.log('🛩️ Using OAuth2 authenticated requests');
      } else {
        console.log('🛩️ No valid credentials found, using anonymous requests');
      }
    }
  } catch (error) {
    console.log('🛩️ Authentication failed, using anonymous requests:', error);
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`OpenSky API rate limit exceeded. ${usingAuth ? 'Try reducing update frequency.' : 'Consider adding valid credentials for higher limits.'}`);
    }
    if (response.status === 401 && usingAuth) {
      console.log('🛩️ Authentication failed, token may be expired. Clearing cache and falling back to anonymous requests');
      tokenCache = null; // Clear expired token
      // Retry without authentication
      const retryResponse = await fetch(url);
      if (!retryResponse.ok) {
        throw new Error(`OpenSky API error: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      return await retryResponse.json();
    }
    throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}


/**
 * Update aircraft data from OpenSky API
 */
async function updateAircraftData(): Promise<void> {
  const result = await safeAsyncOperation(
    async () => {
      console.log('🛩️ Fetching aircraft data from OpenSky API...');
      const data = await fetchAircraftData();
      
      console.log('🛩️ Raw API response:', {
        time: data.time,
        statesCount: data.states?.length || 0,
        statesNull: data.states === null
      });
      
      // Validate response structure
      if (!data.states || !Array.isArray(data.states)) {
        throw new Error('Invalid OpenSky response format');
      }
      
      // Parse all aircraft - no filtering, show everything
      const validAircraft: OpenSkyStateVector[] = [];
      
      for (const stateArray of data.states) {
        const aircraft = parseStateVector(stateArray);
        if (aircraft) {
          validAircraft.push(aircraft);
        }
      }
      
      console.log('🛩️ Aircraft processed:', {
        total: data.states.length,
        parsed: validAircraft.length
      });
      
      // Calculate active aircraft count (not on ground)
      const activeCount = validAircraft.filter(aircraft => !aircraft.on_ground).length;
      
      const newData = {
        aircraft: validAircraft,
        lastUpdate: new Date(),
        nextUpdate: new Date(Date.now() + CONFIG.styles.planes.updateIntervalMs),
        error: null,
        totalCount: validAircraft.length,
        activeCount
      };
      
      return newData;
    },
    'fetch aircraft data from OpenSky Network API',
    {
      aircraft: [],
      lastUpdate: null as Date | null,
      nextUpdate: null as Date | null,
      error: 'Failed to fetch aircraft data' as string | null,
      totalCount: 0,
      activeCount: 0,
    } as PlaneLayerData
  );
  
  planeDataCache = result;
}

/**
 * PlaneManager class using BaseDataManager
 */
import { BaseDataManager } from '../utils/BaseDataManager';

export class PlaneManager extends BaseDataManager<PlaneLayerData> {
  constructor() {
    super({
      updateFunction: updateAircraftData,
      updateIntervalMs: CONFIG.styles.planes.updateIntervalMs,
      getDataCache: () => planeDataCache
    });
  }
}

/**
 * Get aircraft icon rotation based on heading
 */
function getAircraftRotation(aircraft: OpenSkyStateVector): number {
  // Convert true track to rotation angle (deck.gl expects degrees)
  return aircraft.true_track || 0;
}

/**
 * Get aircraft size - simple uniform size
 */
function getAircraftSize(): number {
  return CONFIG.styles.planes.iconSize * CONFIG.styles.planes.iconSizeMultiplier;
}

/**
 * Create aircraft visualization layers
 */
export function createPlaneLayers(currentTime: Date): Layer[] {
  const layers: Layer[] = [];
  const { aircraft, error } = planeDataCache;
  
  console.log('🛩️ createPlaneLayers called:', {
    aircraftCount: aircraft.length,
    error: error,
    cacheData: planeDataCache
  });

  // Error handling - show error message if API fails
  if (error) {
    console.log('🛩️ Showing error layer:', error);
    layers.push(new TextLayer({
      id: 'planes-error',
      data: [{ position: [0, 0], text: `Aircraft Error: ${error}` }],
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: CONFIG.styles.planes.errorTextSize,
      getColor: CONFIG.styles.planes.errorTextColor,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      background: true,
      getBackgroundColor: CONFIG.styles.planes.errorBackgroundColor,
      backgroundPadding: CONFIG.styles.planes.errorBackgroundPadding,
      pickable: false,
    }));
    return layers;
  }

  // Main aircraft icons layer
  if (aircraft.length > 0) {
    console.log('🛩️ Creating IconLayer with:', {
      aircraftCount: aircraft.length,
      sampleAircraft: aircraft.slice(0, 3).map((a: OpenSkyStateVector) => ({
        icao24: a.icao24,
        position: [a.longitude, a.latitude],
        category: a.category
      }))
    });
    
    layers.push(new IconLayer({
      id: CONFIG.layerIds.planePositions,
      data: aircraft,
      getPosition: (d: OpenSkyStateVector) => [d.longitude!, d.latitude!],
      getIcon: () => ({
        url: AIRCRAFT_ICON,
        width: CONFIG.styles.planes.icon.width,
        height: CONFIG.styles.planes.icon.height,
        anchorY: CONFIG.styles.planes.icon.anchorY,
        anchorX: CONFIG.styles.planes.icon.anchorX,
      }),
      getSize: () => getAircraftSize(),
      getAngle: (d: OpenSkyStateVector) => getAircraftRotation(d),
      sizeScale: 1,
      sizeUnits: 'pixels',
      pickable: true,
      autoHighlight: false, // Disable hover shadow effects to match other layers
      alphaCutoff: -1, // Include ALL pixels for picking
      updateTriggers: {
        getPosition: currentTime.getTime(),
        getSize: currentTime.getTime(),
        getAngle: currentTime.getTime(),
      },
    }));
  } else {
    console.log('🛩️ No aircraft to display - empty layer array returned');
  }

  console.log('🛩️ Returning layers:', layers.length);
  return layers;
}

/**
 * Check if planes layer is properly configured (always true - no API key needed)
 */
export function isPlanesLayerConfigured(): boolean {
  return true;
}
