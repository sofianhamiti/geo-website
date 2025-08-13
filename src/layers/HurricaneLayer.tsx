/**
 * Hurricane Layer - Enhanced with Trajectory Cones and Forecasts
 * Renders trajectory cones, forecast tracks, and storm positions using optimized multi-layer approach
 */

import { IconLayer, TextLayer, PolygonLayer, PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Query from '@arcgis/core/rest/support/Query';
import { CONFIG } from '../config';
import { safeAsyncOperation } from '../utils/errorHandler';

// Hurricane data interfaces
interface HurricaneFeature {
  attributes: {
    STORMNAME: string;
    STORMID: string;
    LAT: number;
    LON: number;
    INTENSITY: number;
    MSLP: number;
    STORMTYPE: string;
    BASIN: string;
    DTG: number;
    SS: number; // Saffir-Simpson scale
    DATELBL?: string;
    TIMEZONE?: string;
    FCST_HR?: number; // Forecast hour (0 for current, 12, 24, 48, etc.)
  };
  geometry: {
    x: number;
    y: number;
  };
}

// Trajectory cone interface
interface TrajectoryFeature {
  attributes: {
    STORMNAME: string;
    STORMID: string;
    FCST_HR: number; // Forecast hour (12, 24, 48, 72, etc.)
    SS: number;
    STORMTYPE: string;
    BASIN: string;
  };
  geometry: {
    rings: number[][][]; // Polygon rings for cone geometry
  };
}

// Forecast track interface  
interface ForecastTrackFeature {
  attributes: {
    STORMNAME: string;
    STORMID: string;
    SS: number;
    STORMTYPE: string;
    BASIN: string;
  };
  geometry: {
    paths: number[][]; // LineString paths for forecast track
  };
}

// Enhanced data structure
interface HurricaneLayerData {
  positions: HurricaneFeature[];     // Current + historical + forecast positions
  trajectories: TrajectoryFeature[]; // Forecast uncertainty cones
  tracks: ForecastTrackFeature[];    // Forecast centerlines
  lastUpdate: Date | null;
  error: string | null;
}

// Hurricane data cache - enhanced structure
let hurricaneDataCache: HurricaneLayerData = {
  positions: [],
  trajectories: [],
  tracks: [],
  lastUpdate: null,
  error: null,
};

// Hurricane SVG content - optimized for ocean visibility
const hurricaneSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <!-- Center circle -->
    <circle cx="64" cy="64" r="22" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    
    <!-- Upper sweep line -->
    <path d="M50 29.2l-1 1.9A67.4 67.4 0 0 0 42.2 66.8" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    
    <!-- Lower sweep line -->
    <path d="M78 98.8l1-1.9A67.4 67.4 0 0 0 85.8 61.2" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
</svg>`;

// Create FeatureLayers for hurricane data
let hurricanePositionLayer: FeatureLayer | null = null;
let hurricaneTrajectoryLayer: FeatureLayer | null = null;
let hurricaneTrackLayer: FeatureLayer | null = null;

/**
 * Initialize Hurricane FeatureLayers
 */
function initializeHurricaneLayers() {
  if (hurricanePositionLayer && hurricaneTrajectoryLayer && hurricaneTrackLayer) {
    return;
  }

  try {
    // Layer 0: Trajectory Cones
    hurricaneTrajectoryLayer = new FeatureLayer({
      url: `${CONFIG.weather.hurricanes.serviceUrl}/0`,
      refreshInterval: CONFIG.weather.hurricanes.refreshIntervalMinutes,
      outFields: ['*'],
      title: 'Hurricane Trajectory Cones'
    });

    // Layer 1: Observed Positions
    hurricanePositionLayer = new FeatureLayer({
      url: `${CONFIG.weather.hurricanes.serviceUrl}/1`,
      refreshInterval: CONFIG.weather.hurricanes.refreshIntervalMinutes,
      outFields: ['*'],
      title: 'Hurricane Positions'
    });

    // Layer 2: Forecast Tracks
    hurricaneTrackLayer = new FeatureLayer({
      url: `${CONFIG.weather.hurricanes.serviceUrl}/2`,
      refreshInterval: CONFIG.weather.hurricanes.refreshIntervalMinutes,
      outFields: ['*'],
      title: 'Hurricane Forecast Tracks'
    });
  } catch (error) {
    console.error('❌ Failed to initialize Hurricane FeatureLayers:', error);
    throw error;
  }
}

/**
 * Fetch hurricane position data from ArcGIS service (Layer 1)
 */
async function fetchHurricanePositions(): Promise<HurricaneFeature[]> {
  if (!hurricanePositionLayer) {
    throw new Error('Hurricane position layer not initialized');
  }

  try {
    const query = new Query({
      where: '1=1',
      outFields: ['*'],
      returnGeometry: true
    });

    const result = await hurricanePositionLayer.queryFeatures(query);
    
    if (result.features.length === 0) {
      return [];
    }

    const mappedFeatures = result.features.map((feature: any) => ({
      attributes: feature.attributes,
      geometry: {
        x: feature.geometry.longitude,
        y: feature.geometry.latitude
      }
    }));
    
    return mappedFeatures;
  } catch (error) {
    console.error('❌ Error fetching hurricane positions:', error);
    throw error;
  }
}

/**
 * Fetch hurricane trajectory cone data - try multiple layers to find the right format
 */
async function fetchHurricaneTrajectories(): Promise<TrajectoryFeature[]> {
  // Try different layers - some services put cones in layer 3, 4, or 5
  const layersToTry = [0, 3, 4, 5];
  
  for (const layerNum of layersToTry) {
    try {
      const trajectoryLayer = new FeatureLayer({
        url: `${CONFIG.weather.hurricanes.serviceUrl}/${layerNum}`,
        outFields: ['*']
      });

      const query = new Query({
        where: '1=1',
        outFields: ['*'],
        returnGeometry: true
      });

      const result = await trajectoryLayer.queryFeatures(query);
      
      if (result.features.length > 0) {
        const mappedFeatures = result.features
          .map((feature: any) => {
            if (!feature.geometry || !feature.geometry.rings || feature.geometry.rings.length === 0) {
              return null;
            }
            
            return {
              attributes: feature.attributes,
              geometry: {
                rings: feature.geometry.rings
              }
            };
          })
          .filter(Boolean) as TrajectoryFeature[];
          
        if (mappedFeatures.length > 0) {
          return mappedFeatures;
        }
      }
    } catch (error) {
      // Continue to next layer
      continue;
    }
  }
  
  // No trajectory cones found in any layer
  return [];
}

/**
 * Fetch hurricane forecast track data from ArcGIS service (Layer 2)
 */
async function fetchHurricaneTracks(): Promise<ForecastTrackFeature[]> {
  if (!hurricaneTrackLayer) {
    return [];
  }

  try {
    const query = new Query({
      where: '1=1',
      outFields: ['*'],
      returnGeometry: true
    });

    const result = await hurricaneTrackLayer.queryFeatures(query);
    
    if (result.features.length === 0) {
      return [];
    }

    const mappedFeatures = result.features.map((feature: any) => ({
      attributes: feature.attributes,
      geometry: {
        paths: feature.geometry.paths || []
      }
    }));
    
    return mappedFeatures;
  } catch (error) {
    console.error('❌ Error fetching hurricane tracks:', error);
    return [];
  }
}

/**
 * Update hurricane data from ArcGIS service - fetch all layers
 */
async function updateHurricaneData(): Promise<void> {
  const result = await safeAsyncOperation(
    async () => {
      // Fetch data from all three layers in parallel for better performance
      const [positions, trajectories, tracks] = await Promise.all([
        fetchHurricanePositions(),
        fetchHurricaneTrajectories(), 
        fetchHurricaneTracks()
      ]);
      
      const newData: HurricaneLayerData = {
        positions,
        trajectories,
        tracks,
        lastUpdate: new Date(),
        error: null,
      };
      
      return newData;
    },
    'fetch hurricane data from ArcGIS API',
    {
      positions: [],
      trajectories: [],
      tracks: [],
      lastUpdate: null as Date | null,
      error: 'Failed to fetch hurricane data' as string | null,
    } as HurricaneLayerData
  );
  
  hurricaneDataCache = result;
}

/**
 * Get hurricane color based on Saffir-Simpson category
 */
function getHurricaneColor(category: number): [number, number, number, number] {
  const colors = CONFIG.weather.hurricanes.categoryColors;
  return colors[category as keyof typeof colors] || colors[0];
}

/**
 * Get hurricane size based on category
 */
function getHurricaneSize(category: number): number {
  const sizes = CONFIG.weather.hurricanes.categorySizes;
  return sizes[category as keyof typeof sizes] || sizes[0];
}

/**
 * Create category-specific colored hurricane SVG icon
 */
function createHurricaneIcon(category: number): string {
  const color = getHurricaneColor(category);
  const hexColor = `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
  
  // Replace the default stroke color #ffffff with the category color
  const coloredSvgContent = hurricaneSvgContent.replace(/#ffffff/g, hexColor);
  
  return `data:image/svg+xml;base64,${btoa(coloredSvgContent)}`;
}

/**
 * Create category-specific colored dot SVG icon for older hurricane positions
 */
function createDotIcon(category: number): string {
  const color = getHurricaneColor(category);
  const hexColor = `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
  
  const dotSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="32" fill="${hexColor}" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(dotSvgContent)}`;
}

/**
 * Cache for category-specific hurricane icons
 */
const hurricaneIconCache: { [key: number]: string } = {};

/**
 * Cache for category-specific dot icons
 */
const dotIconCache: { [key: number]: string } = {};

/**
 * Get cached or create hurricane icon for category
 */
function getHurricaneIcon(category: number): string {
  if (!hurricaneIconCache[category]) {
    hurricaneIconCache[category] = createHurricaneIcon(category);
  }
  return hurricaneIconCache[category];
}

/**
 * Get cached or create dot icon for category
 */
function getDotIcon(category: number): string {
  if (!dotIconCache[category]) {
    dotIconCache[category] = createDotIcon(category);
  }
  return dotIconCache[category];
}

/**
 * Hurricane Manager class - follows same pattern as ISS and Earthquake managers
 */
export class HurricaneManager {
  private updateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      initializeHurricaneLayers();
      await updateHurricaneData();
      
      this.updateInterval = setInterval(() => {
        updateHurricaneData().catch(error => {
          console.error('❌ Hurricane update error:', error);
        });
      }, CONFIG.weather.hurricanes.refreshIntervalMinutes * 60 * 1000);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Hurricane Manager:', error);
      throw error;
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
  }

  getData(): HurricaneLayerData {
    return hurricaneDataCache;
  }
}

/**
 * Create hurricane visualization layers - Enhanced multi-layer approach
 */
export function createHurricaneLayers(currentTime: Date): Layer[] {
  const layers: Layer[] = [];
  const { positions, trajectories, tracks, error } = hurricaneDataCache;

  // Error handling - show error message if API fails
  if (error) {
    layers.push(new TextLayer({
      id: 'hurricane-error',
      data: [{ position: [0, 0], text: `Hurricane Error: ${error}` }],
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: 16,
      getColor: [255, 107, 53, 255], // Orange error text
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      background: true,
      getBackgroundColor: [15, 23, 42, 204],
      backgroundPadding: [8, 4, 8, 4],
      pickable: false,
    }));
    return layers;
  }

  // Layer 1: Trajectory Cones (PolygonLayer) - render first so they appear behind other elements  
  if (trajectories.length > 0) {
    layers.push(new PolygonLayer({
      id: 'hurricane-trajectory-cones',
      data: trajectories,
      getPolygon: (d: TrajectoryFeature) => {
        const rings = d.geometry.rings;
        if (!rings || rings.length === 0) {
          return [];
        }
        
        const outerRing = rings[0];
        return outerRing.map(coord => [coord[0], coord[1]]);
      },
      getFillColor: (d: TrajectoryFeature): [number, number, number, number] => {
        const opacity = Math.max(40, 120 - (d.attributes.FCST_HR || 0) * 1.5);
        return [200, 200, 200, opacity]; // Light grey with dynamic opacity
      },
      getLineColor: (_d: TrajectoryFeature): [number, number, number, number] => {
        return [255, 255, 255, 180]; // White border
      },
      getLineWidth: 3,
      lineWidthUnits: 'pixels',
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      wireframe: false,
      getTooltip: ({object}: {object: TrajectoryFeature}) => {
        if (!object) return null;
        const attrs = object.attributes;
        return {
          html: `
            <div style="
              background: rgba(15, 23, 42, 0.95);
              color: white;
              padding: 8px 12px;
              border-radius: 6px;
              font-family: Inter, sans-serif;
              font-size: 13px;
            ">
              <div style="font-weight: 600; margin-bottom: 4px;">
                🌀 ${attrs.STORMNAME || 'Storm'} Forecast Cone
              </div>
              <div style="color: #e5e7eb;">
                <div>Forecast Hour: ${attrs.FCST_HR}h</div>
                <div>Category: ${attrs.SS > 0 ? attrs.SS : 'TS'}</div>
                <div>Basin: ${attrs.BASIN?.toUpperCase() || 'Unknown'}</div>
              </div>
            </div>
          `
        };
      }
    }));
  }

  // Layer 2: Forecast Tracks (PathLayer)
  if (tracks.length > 0) {
    layers.push(new PathLayer({
      id: 'hurricane-forecast-tracks',
      data: tracks,
      getPath: (d: ForecastTrackFeature) => d.geometry.paths[0],
      getColor: (_d: ForecastTrackFeature) => {
        return [220, 220, 220, 200]; // Light grey for forecast tracks
      },
      getWidth: 3,
      widthUnits: 'pixels',
      pickable: true,
      getDashArray: [8, 4], // Dashed line to differentiate from observed track
      dashJustified: true,
      getTooltip: ({object}: {object: ForecastTrackFeature}) => {
        if (!object) return null;
        const attrs = object.attributes;
        return {
          html: `
            <div style="
              background: rgba(15, 23, 42, 0.95);
              color: white;
              padding: 8px 12px;
              border-radius: 6px;
              font-family: Inter, sans-serif;
              font-size: 13px;
            ">
              <div style="font-weight: 600; margin-bottom: 4px;">
                🌀 ${attrs.STORMNAME || 'Storm'} Forecast Track
              </div>
              <div style="color: #e5e7eb;">
                <div>Category: ${attrs.SS > 0 ? attrs.SS : 'TS'}</div>
                <div>Basin: ${attrs.BASIN?.toUpperCase() || 'Unknown'}</div>
              </div>
            </div>
          `
        };
      }
    }));
  }

  // Layer 3: Storm Positions (IconLayer) - render last so they appear on top
  if (positions.length > 0) {
    // Group hurricanes by storm ID and find latest position per storm
    const stormGroups = positions.reduce((groups: Record<string, HurricaneFeature[]>, hurricane: HurricaneFeature) => {
      const stormId = hurricane.attributes.STORMID;
      if (!groups[stormId]) groups[stormId] = [];
      groups[stormId].push(hurricane);
      return groups;
    }, {} as Record<string, HurricaneFeature[]>);

    // Create set of latest position identifiers
    const latestPositions = new Set<string>();
    Object.values(stormGroups).forEach((stormHurricanes: HurricaneFeature[]) => {
      const latest = stormHurricanes.reduce((latest: HurricaneFeature, current: HurricaneFeature) => {
        return current.attributes.DTG > latest.attributes.DTG ? current : latest;
      });
      const positionId = `${latest.attributes.STORMID}-${latest.attributes.DTG}`;
      latestPositions.add(positionId);
    });

    layers.push(new IconLayer({
      id: 'hurricane-positions',
      data: positions,
      getPosition: (d: HurricaneFeature) => [d.geometry.x, d.geometry.y],
      getIcon: (d: HurricaneFeature) => {
        const positionId = `${d.attributes.STORMID}-${d.attributes.DTG}`;
        const isLatestPosition = latestPositions.has(positionId);
        
        if (isLatestPosition) {
          // Latest position gets full hurricane icon
          return {
            url: getHurricaneIcon(d.attributes.SS || 0),
            width: CONFIG.weather.hurricanes.icon.width,
            height: CONFIG.weather.hurricanes.icon.height,
            anchorY: CONFIG.weather.hurricanes.icon.anchorY,
            anchorX: CONFIG.weather.hurricanes.icon.anchorX,
          };
        } else {
          // Older positions get dot icons
          return {
            url: getDotIcon(d.attributes.SS || 0),  
            width: 96, // Bigger dots for better visibility
            height: 96,
            anchorY: 48,
            anchorX: 48,
          };
        }
      },
      getSize: (d: HurricaneFeature) => {
        const positionId = `${d.attributes.STORMID}-${d.attributes.DTG}`;
        const isLatestPosition = latestPositions.has(positionId);
        
        const baseSize = getHurricaneSize(d.attributes.SS || 0) *
          (CONFIG.weather.hurricanes.categoryScaling.baseMultiplier +
           (d.attributes.SS || 0) * CONFIG.weather.hurricanes.categoryScaling.categoryWeight) *
          CONFIG.weather.hurricanes.sizeMultiplier;
        
        // Bigger dots for better visibility
        return isLatestPosition ? baseSize : baseSize * 0.65;
      },
      sizeScale: 1,
      sizeUnits: 'pixels',
      pickable: true,
      autoHighlight: false,
      alphaCutoff: -1, // Include ALL pixels for picking
      updateTriggers: {
        getPosition: currentTime.getTime(),
        getSize: currentTime.getTime(),
        getIcon: positions.length, // Trigger icon updates when data changes
      },
      getTooltip: ({object}: {object: HurricaneFeature}) => {
        if (!object) return null;
        const attrs = object.attributes;
        const intensity = attrs.INTENSITY || 0;
        const pressure = attrs.MSLP || 0;
        const category = attrs.SS || 0;
        const categoryText = category > 0 ? `Category ${category} Hurricane` : attrs.STORMTYPE || 'Tropical Storm';
        
        return {
          html: `
            <div style="
              background: rgba(15, 23, 42, 0.95);
              color: white;
              padding: 10px 14px;
              border-radius: 8px;
              border: 2px solid ${category > 0 ? '#ef4444' : '#3b82f6'};
              font-family: Inter, sans-serif;
              font-size: 14px;
              line-height: 1.4;
              backdrop-filter: blur(8px);
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
              max-width: 280px;
            ">
              <div style="font-weight: 700; color: #ff4444; margin-bottom: 8px; font-size: 16px;">
                🌀 ${attrs.STORMNAME || 'Unknown Storm'}
              </div>
              <div style="margin-bottom: 6px;">
                <span style="
                  background: ${category > 2 ? '#ef4444' : category > 0 ? '#f59e0b' : '#3b82f6'};
                  color: white;
                  padding: 3px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 600;
                ">
                  ${categoryText}
                </span>
              </div>
              <div style="color: #e5e7eb; font-size: 13px;">
                <div style="margin-bottom: 3px;">
                  <strong>Max Winds:</strong> ${intensity} knots (${Math.round(intensity * 1.15)} mph)
                </div>
                <div style="margin-bottom: 3px;">
                  <strong>Pressure:</strong> ${pressure} mb
                </div>
                <div style="margin-bottom: 3px;">
                  <strong>Basin:</strong> ${attrs.BASIN?.toUpperCase() || 'Unknown'}
                </div>
                <div style="margin-bottom: 3px;">
                  <strong>Position:</strong> ${object.geometry.y.toFixed(2)}°N, ${Math.abs(object.geometry.x).toFixed(2)}°W
                </div>
              </div>
              <div style="color: #9ca3af; font-size: 11px; margin-top: 6px; border-top: 1px solid #374151; padding-top: 6px;">
                Last updated: ${new Date(attrs.DTG).toLocaleString()}
              </div>
            </div>
          `
        };
      }
    }));

  }

  return layers;
}

/**
 * Check if hurricane layer is properly configured
 */
export function isHurricaneLayerConfigured(): boolean {
  return true; // Always available since we're using Esri's service
}

/**
 * Get the refresh interval from config
 */
export function getHurricaneRefreshInterval(): number {
  return CONFIG.weather.hurricanes.refreshIntervalMinutes * 60 * 1000; // Convert minutes to milliseconds
}
