/**
 * Hurricane Layer - Clean and Simple Implementation
 * Uses the user's simplified SVG icon and follows working layer patterns
 */

import { IconLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Query from '@arcgis/core/rest/support/Query';
import { CONFIG } from '../config';

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
  };
  geometry: {
    x: number;
    y: number;
  };
}

interface HurricaneLayerData {
  hurricanes: HurricaneFeature[];
  lastUpdate: Date | null;
  error: string | null;
}

// Hurricane data cache
let hurricaneDataCache: HurricaneLayerData = {
  hurricanes: [],
  lastUpdate: null,
  error: null,
};

// Hurricane SVG content using user's simplified icon
const hurricaneSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <!-- Center circle -->
    <circle cx="64" cy="64" r="22" fill="none" stroke="#d4d7dd" stroke-width="6" stroke-linecap="round"/>
    
    <!-- Upper sweep line -->
    <path d="M50 29.2l-1 1.9A67.4 67.4 0 0 0 42.2 66.8" fill="none" stroke="#d4d7dd" stroke-width="6" stroke-linecap="round"/>
    
    <!-- Lower sweep line -->
    <path d="M78 98.8l1-1.9A67.4 67.4 0 0 0 85.8 61.2" fill="none" stroke="#d4d7dd" stroke-width="6" stroke-linecap="round"/>
</svg>`;

// Note: Hurricane icons are now generated dynamically per category using getHurricaneIcon()

// Create FeatureLayer for hurricane data
let hurricaneLayer: FeatureLayer | null = null;

/**
 * Initialize Hurricane FeatureLayer
 */
function initializeHurricaneLayer() {
  if (hurricaneLayer) {
    console.log('🌀 [DEBUG] Hurricane layer already initialized');
    return; // Already initialized
  }

  console.log('🌀 [DEBUG] Initializing Hurricane FeatureLayer...');
  console.log('🌀 [DEBUG] Service URL:', `${CONFIG.weather.hurricanes.serviceUrl}/1`);
  
  try {
    hurricaneLayer = new FeatureLayer({
      url: `${CONFIG.weather.hurricanes.serviceUrl}/1`, // Observed positions
      refreshInterval: CONFIG.weather.hurricanes.refreshIntervalMinutes,
      outFields: ['*'],
      title: 'Hurricane Positions'
    });
    
    console.log('✅ [DEBUG] Hurricane FeatureLayer initialized successfully');
  } catch (error) {
    console.error('❌ [ERROR] Failed to initialize Hurricane FeatureLayer:', error);
    throw error;
  }
}

/**
 * Fetch hurricane data from ArcGIS service
 */
async function fetchHurricaneData(): Promise<HurricaneFeature[]> {
  console.log('🌀 [DEBUG] fetchHurricaneData() called');
  
  if (!hurricaneLayer) {
    console.error('❌ [ERROR] Hurricane layer not initialized when fetching data');
    return [];
  }

  try {
    console.log('🌀 [DEBUG] Fetching hurricane data from ArcGIS...');
    
    const query = new Query({
      where: '1=1',
      outFields: ['*'],
      returnGeometry: true
    });

    console.log('🌀 [DEBUG] Executing query against hurricane layer...');
    const result = await hurricaneLayer.queryFeatures(query);
    console.log(`🌀 [DEBUG] Hurricane query successful: ${result.features.length} hurricanes found`);
    
    if (result.features.length === 0) {
      console.log('🌀 [INFO] No active hurricanes found');
      return [];
    }

    const mappedFeatures = result.features.map((feature: any) => {
      console.log('🌀 [DEBUG] Processing hurricane feature:', feature.attributes?.STORMNAME || 'Unknown');
      return {
        attributes: feature.attributes,
        geometry: {
          x: feature.geometry.longitude,
          y: feature.geometry.latitude
        }
      };
    });
    
    console.log('🌀 [DEBUG] Successfully mapped', mappedFeatures.length, 'hurricane features');
    return mappedFeatures;
  } catch (error) {
    console.error('❌ [ERROR] Error fetching hurricane data:', error);
    console.error('❌ [ERROR] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Find the latest hurricane based on DTG timestamp
 */
function findLatestHurricane(hurricanes: HurricaneFeature[]): HurricaneFeature | null {
  console.log('🌀 [DEBUG] findLatestHurricane() called with', hurricanes.length, 'hurricanes');
  
  if (hurricanes.length === 0) {
    console.log('🌀 [DEBUG] No hurricanes found, returning null');
    return null;
  }
  
  const latest = hurricanes.reduce((latest, current) => {
    console.log('🌀 [DEBUG] Comparing hurricanes:', {
      current: current.attributes.STORMNAME,
      currentDTG: current.attributes.DTG,
      latest: latest?.attributes.STORMNAME || 'None',
      latestDTG: latest?.attributes.DTG || 0
    });
    return (!latest || current.attributes.DTG > latest.attributes.DTG) ? current : latest;
  }, null as HurricaneFeature | null);
  
  console.log('🌀 [DEBUG] Latest hurricane selected:', latest?.attributes.STORMNAME || 'None', 'DTG:', latest?.attributes.DTG);
  return latest;
}

/**
 * Update hurricane data
 */
async function updateHurricaneData(): Promise<void> {
  try {
    const hurricanes = await fetchHurricaneData();
    
    hurricaneDataCache = {
      hurricanes,
      lastUpdate: new Date(),
      error: null,
    };
    
    console.log(`✅ Hurricane data updated: ${hurricanes.length} active storms`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    hurricaneDataCache.error = errorMessage;
    console.error('❌ Failed to fetch hurricane data:', errorMessage);
  }
}

/**
 * Get hurricane color based on Saffir-Simpson category (following earthquake pattern)
 */
function getHurricaneColor(category: number): [number, number, number, number] {
  const colors = CONFIG.weather.hurricanes.categoryColors;
  return colors[category as keyof typeof colors] || colors[0];
}

/**
 * Get hurricane size based on category (following earthquake pattern)
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
  
  // Replace the default stroke color #d4d7dd with the category color
  const coloredSvgContent = hurricaneSvgContent.replace(/#d4d7dd/g, hexColor);
  
  return `data:image/svg+xml;base64,${btoa(coloredSvgContent)}`;
}

/**
 * Cache for category-specific hurricane icons
 */
const hurricaneIconCache: { [key: number]: string } = {};

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
 * Hurricane Manager class
 */
export class HurricaneManager {
  private updateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    console.log('🌀 [DEBUG] HurricaneManager.initialize() called');
    
    if (this.isInitialized) {
      console.log('🌀 [DEBUG] Hurricane Manager already initialized');
      return;
    }
    
    try {
      console.log('🌀 [DEBUG] Initializing hurricane layer...');
      // Initialize layer
      initializeHurricaneLayer();
      
      console.log('🌀 [DEBUG] Fetching initial hurricane data...');
      // Initial data fetch
      await updateHurricaneData();
      
      console.log('🌀 [DEBUG] Setting up automatic updates...');
      // Set up automatic updates
      this.updateInterval = setInterval(() => {
        updateHurricaneData().catch(error => {
          console.error('❌ [ERROR] Hurricane update error:', error);
        });
      }, CONFIG.weather.hurricanes.refreshIntervalMinutes * 60 * 1000);
      
      this.isInitialized = true;
      console.log('✅ [DEBUG] Hurricane Manager initialized successfully');
    } catch (error) {
      console.error('❌ [ERROR] Failed to initialize Hurricane Manager:', error);
      throw error;
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
    console.log('✅ Hurricane Manager destroyed');
  }

  getData(): HurricaneLayerData {
    return hurricaneDataCache;
  }
}

/**
 * Create hurricane visualization layers
 */
export function createHurricaneLayers(): Layer[] {
  console.log('🌀 [DEBUG] createHurricaneLayers() called');
  const layers: Layer[] = [];
  const { hurricanes, error } = hurricaneDataCache;

  console.log('🌀 [DEBUG] Hurricane data cache state:', {
    hurricanes: hurricanes.length,
    error,
    lastUpdate: hurricaneDataCache.lastUpdate
  });

  // If there's an error, return empty (no error display needed)
  if (error) {
    console.error('🌀 [ERROR] Hurricane layer error:', error);
    return layers;
  }

  // Create hurricane position icons
  if (hurricanes.length > 0) {
    console.log(`🌀 [DEBUG] Creating hurricane icons for ${hurricanes.length} storms`);
    
    // Find the latest hurricane for rotation
    const latestHurricane = findLatestHurricane(hurricanes);
    console.log('🌀 [DEBUG] Latest hurricane for rotation:', latestHurricane?.attributes.STORMNAME || 'None');
    
    const iconLayer = new IconLayer({
      id: 'hurricane-positions',
      data: hurricanes,
      getPosition: (d: HurricaneFeature) => [d.geometry.x, d.geometry.y],
      getIcon: (d: HurricaneFeature) => ({
        url: getHurricaneIcon(d.attributes.SS || 0),
        width: CONFIG.weather.hurricanes.icon.width,
        height: CONFIG.weather.hurricanes.icon.height,
        anchorY: CONFIG.weather.hurricanes.icon.anchorY,
        anchorX: CONFIG.weather.hurricanes.icon.anchorX,
      }),
      getSize: (d: HurricaneFeature) => getHurricaneSize(d.attributes.SS || 0) *
        (CONFIG.weather.hurricanes.categoryScaling.baseMultiplier +
         (d.attributes.SS || 0) * CONFIG.weather.hurricanes.categoryScaling.categoryWeight) *
        CONFIG.weather.hurricanes.sizeMultiplier,
      getAngle: (d: HurricaneFeature) => {
        // Only rotate the latest hurricane
        const isLatest = latestHurricane && d.attributes.STORMID === latestHurricane.attributes.STORMID;
        
        console.log('🌀 [DEBUG] getAngle called for storm:', d.attributes.STORMNAME, 'isLatest:', isLatest);
        
        if (isLatest) {
          const slowRotationSpeed = 0.008; // Increased speed for visibility (10x faster)
          const angle = (Date.now() * slowRotationSpeed) % (2 * Math.PI);
          console.log('🌀 [DEBUG] Rotation angle for', d.attributes.STORMNAME, ':', angle, 'radians, degrees:', (angle * 180 / Math.PI).toFixed(1));
          return angle;
        }
        return 0; // No rotation for other hurricanes
      },
      sizeScale: 1,
      sizeUnits: 'pixels',
      pickable: true,
      autoHighlight: false,
      alphaCutoff: -1, // Include ALL pixels for picking
      updateTriggers: {
        getIcon: hurricanes.map(h => h.attributes.SS || 0), // Update when categories change
        getSize: hurricanes.map(h => h.attributes.SS || 0), // Update when categories change
        getAngle: Date.now(), // Update rotation continuously
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
    });
    
    layers.push(iconLayer);
    console.log(`✅ Created hurricane layer with ${hurricanes.length} storms`);
  } else {
    console.log('🌀 No active hurricanes found');
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