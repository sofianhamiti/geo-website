/**
 * ISS Tracking Layer using the "Where the ISS at?" API
 * Real-time tracking with trajectory display and information labels
 */

import { IconLayer, PathLayer, TextLayer } from '@deck.gl/layers';
import { CONFIG } from '../config';

// ISS API interfaces
interface ISSPosition {
  name: string;
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

interface ISSTrajectoryPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

interface ISSLayerData {
  currentPosition: ISSPosition | null;
  trajectory: ISSTrajectoryPoint[];
  lastUpdate: Date | null;
  error: string | null;
}

// ISS data cache
let issDataCache: ISSLayerData = {
  currentPosition: null,
  trajectory: [],
  lastUpdate: null,
  error: null,
};

// Generate Space station SVG icon data URL from config
const SPACE_STATION_ICON = `data:image/svg+xml;base64,${btoa(CONFIG.styles.iss.icon.svgData)}`;

/**
 * Fetch current ISS position from API
 */
async function fetchISSPosition(): Promise<ISSPosition> {
  const response = await fetch(`${CONFIG.styles.iss.apiBaseUrl}${CONFIG.styles.iss.satelliteId}`);
  if (!response.ok) {
    throw new Error(`ISS API error: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Fetch ISS trajectory for the next 90 minutes
 */
async function fetchISSTrajectory(): Promise<ISSTrajectoryPoint[]> {
  const currentTime = Math.floor(Date.now() / 1000);
  const endTime = currentTime + (CONFIG.styles.iss.trajectoryDurationMinutes * 60); // Duration from config
  
  // Generate timestamps every interval from config to avoid API limits
  const timestamps: number[] = [];
  for (let t = currentTime; t <= endTime; t += CONFIG.styles.iss.trajectoryPointIntervalSeconds) {
    timestamps.push(t);
  }
  
  const timestampQuery = timestamps.join(',');
  console.log(`🛰️ Requesting ISS trajectory with ${timestamps.length} points`);
  
  const url = `${CONFIG.styles.iss.apiBaseUrl}${CONFIG.styles.iss.satelliteId}/positions?timestamps=${timestampQuery}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unable to read error response');
    console.error('❌ ISS trajectory API error details:', {
      status: response.status,
      statusText: response.statusText,
      url: url.substring(0, 200) + (url.length > 200 ? '...' : ''),
      urlLength: url.length,
      timestampCount: timestamps.length,
      errorResponse: errorText
    });
    throw new Error(`ISS trajectory API error: ${response.status} ${response.statusText} (${timestamps.length} timestamps requested)`);
  }
  
  return await response.json();
}

/**
 * Update ISS data from API
 */
async function updateISSData(): Promise<void> {
  try {
    console.log('🛰️ Fetching ISS data...');
    
    // Fetch both current position and trajectory
    const [currentPosition, trajectory] = await Promise.all([
      fetchISSPosition(),
      fetchISSTrajectory()
    ]);
    
    issDataCache = {
      currentPosition,
      trajectory,
      lastUpdate: new Date(),
      error: null,
    };
    
    console.log(`✅ ISS data updated: Position [${currentPosition.latitude.toFixed(2)}, ${currentPosition.longitude.toFixed(2)}], Trajectory: ${trajectory.length} points`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    issDataCache.error = errorMessage;
    console.error('❌ Failed to fetch ISS data:', errorMessage);
  }
}

/**
 * ISS Manager class to handle data updates and layer creation
 */
export class ISSManager {
  private updateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Initial data fetch
    await updateISSData();
    
    // Set up automatic updates using config interval
    this.updateInterval = setInterval(() => {
      updateISSData().catch(error => {
        console.error('ISS update error:', error);
      });
    }, CONFIG.styles.iss.updateIntervalMs);
    
    this.isInitialized = true;
    console.log('✅ ISS Manager initialized');
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
    console.log('✅ ISS Manager destroyed');
  }

  getData(): ISSLayerData {
    return issDataCache;
  }
}

/**
 * Process trajectory to handle International Date Line crossings
 * Splits trajectory into segments when longitude jumps > 180°
 */
function processTrajectoryForDateline(trajectory: ISSTrajectoryPoint[]): number[][][] {
  if (trajectory.length <= 1) return [];
  
  const segments: number[][][] = [];
  let currentSegment: number[][] = [];
  
  for (let i = 0; i < trajectory.length; i++) {
    const point = trajectory[i];
    const currentCoord: number[] = [point.longitude, point.latitude];
    
    // Check for dateline crossing (longitude jump > 180°)
    if (i > 0) {
      const prevPoint = trajectory[i - 1];
      const longitudeDiff = Math.abs(point.longitude - prevPoint.longitude);
      
      // If longitude jump is greater than 180°, we've crossed the dateline
      if (longitudeDiff > 180) {
        // End current segment if it has points
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }
        // Start new segment with current point
        currentSegment = [currentCoord];
      } else {
        // Continue current segment
        currentSegment.push(currentCoord);
      }
    } else {
      // First point starts the first segment
      currentSegment.push(currentCoord);
    }
  }
  
  // Add final segment if it has points
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  
  return segments;
}

/**
 * Create ISS tracking layers
 */
export function createISSLayers(currentTime: Date, onISSClick?: (info: any) => void): any[] {
  const layers: any[] = [];
  const { currentPosition, trajectory, error } = issDataCache;

  // If there's an error, show error layer
  if (error) {
    layers.push(new TextLayer({
      id: 'iss-error',
      data: [{ position: [0, 0], text: `ISS Error: ${error}` }],
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: CONFIG.styles.iss.errorTextSize,
      getColor: CONFIG.styles.iss.errorTextColor,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      background: true,
      getBackgroundColor: CONFIG.styles.iss.errorBackgroundColor,
      backgroundPadding: CONFIG.styles.iss.errorBackgroundPadding,
      pickable: false,
    }));
    return layers;
  }

  // Current ISS position icon
  if (currentPosition) {
    layers.push(new IconLayer({
      id: 'iss-position',
      data: [currentPosition],
      getPosition: (d: ISSPosition) => [d.longitude, d.latitude],
      getIcon: () => ({
        url: SPACE_STATION_ICON,
        width: CONFIG.styles.iss.icon.width,
        height: CONFIG.styles.iss.icon.height,
        anchorY: CONFIG.styles.iss.icon.anchorY,
        anchorX: CONFIG.styles.iss.icon.anchorX,
      }),
      getSize: () => CONFIG.styles.iss.iconSize,
      sizeScale: 1,
      sizeUnits: 'pixels',
      pickable: true,
      autoHighlight: false, // Disable hover shadow effects
      alphaCutoff: -1, // Include ALL pixels (including transparent) for picking
      onClick: onISSClick, // Handle clicks for video overlay
      updateTriggers: {
        getPosition: currentTime.getTime(),
      },
    }));

  }

  // ISS trajectory path with dateline crossing handling
  if (trajectory.length > 1) {
    const trajectorySegments = processTrajectoryForDateline(trajectory);
    
    trajectorySegments.forEach((segment, index) => {
      layers.push(new PathLayer({
        id: `iss-trajectory-${index}`,
        data: [{ path: segment }],
        getPath: (d: any) => d.path,
        getColor: CONFIG.styles.iss.trajectoryColor,
        getWidth: CONFIG.styles.iss.trajectoryWidth,
        widthUnits: 'pixels',
        widthMinPixels: CONFIG.styles.iss.trajectoryWidthMin,
        widthMaxPixels: CONFIG.styles.iss.trajectoryWidthMax,
        opacity: CONFIG.styles.iss.trajectoryOpacity,
        pickable: false,
        parameters: {
          depthTest: false,
        },
        updateTriggers: {
          getPath: currentTime.getTime(),
        },
      }));
    });
  }

  return layers;
}

/**
 * Check if ISS tracking is properly configured (always true - no API key needed)
 */
export function isISSTrackingConfigured(): boolean {
  return true;
}
