/**
 * Earthquake Layer using USGS GeoJSON API
 * Real-time earthquake data with magnitude-based styling and significance filtering
 */

import { IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../config';
import { safeAsyncOperation } from '../utils/errorHandler';

// USGS Earthquake API interfaces
interface USGSEarthquakeProperties {
  mag: number;           // Magnitude (0.0-10.0+)
  place: string;         // Location description
  time: number;          // Unix timestamp in milliseconds
  updated: number;       // Last update timestamp
  tz: number;           // Timezone offset
  url: string;          // USGS event page URL
  detail: string;       // API detail URL
  felt?: number;        // Number of "Did You Feel It?" responses
  cdi?: number;         // Maximum reported intensity
  mmi?: number;         // Maximum estimated intensity
  alert?: string;       // Alert level (green, yellow, orange, red)
  status: string;       // Review status (automatic, reviewed, deleted)
  tsunami: number;      // 1 if tsunami-related, 0 otherwise
  sig: number;          // Significance score (0-1000+)
  net: string;          // Network source ID
  code: string;         // Event code
  ids: string;          // Comma-separated event IDs
  sources: string;      // Network contributors
  types: string;        // Available product types
  nst?: number;         // Number of seismic stations
  dmin?: number;        // Minimum distance to stations
  rms?: number;         // Root-mean-square travel time residual
  gap?: number;         // Largest azimuthal gap between stations
  magType: string;      // Magnitude type (ml, mb, mw, etc.)
  type: string;         // Event type (earthquake, explosion, etc.)
  title: string;        // Full event title
}

interface USGSEarthquakeFeature {
  type: 'Feature';
  properties: USGSEarthquakeProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number, number]; // [longitude, latitude, depth_km]
  };
  id: string;
}

interface USGSEarthquakeResponse {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: USGSEarthquakeFeature[];
}

interface EarthquakeLayerData {
  earthquakes: USGSEarthquakeFeature[];
  lastUpdate: Date | null;
  nextUpdate: Date | null;
  error: string | null;
  totalCount: number;
  significantCount: number; // Magnitude 4.5+
}

// Earthquake data cache
let earthquakeDataCache: EarthquakeLayerData = {
  earthquakes: [],
  lastUpdate: null,
  nextUpdate: null,
  error: null,
  totalCount: 0,
  significantCount: 0,
};

// Generate earthquake epicenter SVG icon data URL from config (same pattern as ISS)
const EARTHQUAKE_EPICENTER_ICON = `data:image/svg+xml;base64,${btoa(CONFIG.styles.earthquakes.icon.svgData)}`;

/**
 * Fetch earthquake data from USGS API
 */
async function fetchEarthquakeData(): Promise<USGSEarthquakeResponse> {
  const url = `${CONFIG.styles.earthquakes.apiBaseUrl}${CONFIG.styles.earthquakes.endpoint}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Validate earthquake feature data
 */
function validateEarthquakeFeature(feature: USGSEarthquakeFeature): boolean {
  return !!(
    feature.geometry?.coordinates &&
    feature.geometry.coordinates.length >= 2 &&
    typeof feature.properties?.mag === 'number' &&
    feature.properties.mag >= CONFIG.styles.earthquakes.minMagnitudeDisplay &&
    feature.properties.place &&
    feature.properties.time
  );
}

/**
 * Update earthquake data from USGS API
 */
async function updateEarthquakeData(): Promise<void> {
  const result = await safeAsyncOperation(
    async () => {
      const data = await fetchEarthquakeData();
      
      // Validate response structure
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error('Invalid USGS response format');
      }
      
      // Filter and process earthquakes
      const validEarthquakes = data.features.filter(validateEarthquakeFeature);
      
      // Apply performance limits
      const limitedEarthquakes = validEarthquakes.slice(0, CONFIG.styles.earthquakes.maxEarthquakes);
      
      // Calculate significant earthquake count
      const significantCount = limitedEarthquakes.filter(
        eq => eq.properties.mag >= CONFIG.styles.earthquakes.significantThreshold
      ).length;
      
      const newData = {
        earthquakes: limitedEarthquakes,
        lastUpdate: new Date(),
        nextUpdate: new Date(Date.now() + CONFIG.styles.earthquakes.updateIntervalMs),
        error: null,
        totalCount: limitedEarthquakes.length,
        significantCount
      };
      
      return newData;
    },
    'fetch earthquake data from USGS API',
    {
      earthquakes: [],
      lastUpdate: null as Date | null,
      nextUpdate: null as Date | null,
      error: 'Failed to fetch earthquake data' as string | null,
      totalCount: 0,
      significantCount: 0,
    } as EarthquakeLayerData
  );
  
  earthquakeDataCache = result;
}

/**
 * EarthquakeManager class using BaseDataManager
 */
import { BaseDataManager } from '../utils/BaseDataManager';

export class EarthquakeManager extends BaseDataManager<EarthquakeLayerData> {
  constructor() {
    super({
      updateFunction: updateEarthquakeData,
      updateIntervalMs: CONFIG.styles.earthquakes.updateIntervalMs,
      getDataCache: () => earthquakeDataCache
    });
  }
}


/**
 * Get magnitude-based size
 */
function getMagnitudeSize(magnitude: number): number {
  const magSizes = CONFIG.styles.earthquakes.magnitudeSizes;
  const magLevel = Math.floor(Math.max(0, magnitude));
  const sizeKey = Math.min(magLevel, 9); // Cap at magnitude 9
  return magSizes[sizeKey as keyof typeof magSizes] || magSizes[0];
}


/**
 * Level-of-detail filtering based on zoom level
 */
function getFilteredEarthquakes(zoom: number, earthquakes: USGSEarthquakeFeature[]): USGSEarthquakeFeature[] {
  if (!CONFIG.styles.earthquakes.lodFiltering.enabled) {
    return earthquakes;
  }
  
  let minMagnitude = 0;
  const breakpoints = CONFIG.styles.earthquakes.lodFiltering.zoomBreakpoints;
  
  // Apply zoom-based filtering for performance
  if (zoom < 2) {
    minMagnitude = breakpoints[2] || CONFIG.styles.earthquakes.significantThreshold;
  } else if (zoom < 4) {
    minMagnitude = breakpoints[4] || 2.0;
  } else if (zoom < 6) {
    minMagnitude = breakpoints[6] || 1.0;
  }
  // else show all earthquakes
  
  return earthquakes.filter(eq => eq.properties.mag >= minMagnitude);
}

/**
 * Create earthquake visualization layers
 */
export function createEarthquakeLayers(currentTime: Date, currentZoom: number = 2): Layer[] {
  const layers: Layer[] = [];
  const { earthquakes, error } = earthquakeDataCache;

  // Error handling - show error message if API fails
  if (error) {
    layers.push(new TextLayer({
      id: 'earthquake-error',
      data: [{ position: [0, 0], text: `Earthquake Error: ${error}` }],
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: CONFIG.styles.earthquakes.errorTextSize,
      getColor: CONFIG.styles.earthquakes.errorTextColor,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      background: true,
      getBackgroundColor: CONFIG.styles.earthquakes.errorBackgroundColor,
      backgroundPadding: CONFIG.styles.earthquakes.errorBackgroundPadding,
      pickable: false,
    }));
    return layers;
  }

  // Apply level-of-detail filtering
  const filteredEarthquakes = getFilteredEarthquakes(currentZoom, earthquakes);

  // Main earthquake epicenter icons layer
  if (filteredEarthquakes.length > 0) {
    layers.push(new IconLayer({
      id: CONFIG.layerIds.earthquakePositions,
      data: filteredEarthquakes,
      getPosition: (d: USGSEarthquakeFeature) => [
        d.geometry.coordinates[0], // longitude
        d.geometry.coordinates[1]  // latitude
      ],
      getIcon: () => ({
        url: EARTHQUAKE_EPICENTER_ICON,
        width: CONFIG.styles.earthquakes.icon.width,
        height: CONFIG.styles.earthquakes.icon.height,
        anchorY: CONFIG.styles.earthquakes.icon.anchorY,
        anchorX: CONFIG.styles.earthquakes.icon.anchorX,
      }),
      getSize: (d: USGSEarthquakeFeature) => getMagnitudeSize(d.properties.mag) * 
        (CONFIG.styles.earthquakes.magnitudeScaling.baseMultiplier + 
         d.properties.mag * CONFIG.styles.earthquakes.magnitudeScaling.magnitudeWeight) * 
        CONFIG.styles.earthquakes.sizeMultiplier,
      sizeScale: CONFIG.styles.earthquakes.iconDisplay.sizeScale,
      sizeUnits: 'pixels',
      pickable: true,
      autoHighlight: false,
      alphaCutoff: CONFIG.styles.earthquakes.iconDisplay.alphaCutoff, // Include ALL pixels (including transparent) for picking
      updateTriggers: {
        getPosition: currentTime.getTime(),
        getSize: currentTime.getTime(),
      },
    }));

  }

  return layers;
}

/**
 * Check if earthquake layer is properly configured (always true - no API key needed)
 */
export function isEarthquakeLayerConfigured(): boolean {
  return true;
}

