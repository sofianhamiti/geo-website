/**
 * Simplified Weather Precipitation Layer
 * Uses individual BitmapLayers for each tile - much more reliable
 * Works with your level 4 tiles (16x16 grid) at all zoom levels
 */

import { BitmapLayer } from '@deck.gl/layers';
import { CONFIG } from '../config';

interface WeatherTileMetadata {
  currentTileset?: string;
  lastUpdate?: string;
  tilesets: {
    [timestamp: string]: {
      created: string;
      tilesCount: number;
      success: boolean;
    }
  }
}

/**
 * Convert Web Mercator tile coordinates to geographic bounds
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 * @param z Zoom level
 * @returns [west, south, east, north] bounds in degrees
 */
function tileToGeoBounds(x: number, y: number, z: number): [number, number, number, number] {
  const n = Math.pow(2, z);
  
  // Calculate longitude bounds
  const west = (x / n) * 360.0 - 180.0;
  const east = ((x + 1) / n) * 360.0 - 180.0;
  
  // Calculate latitude bounds using Web Mercator projection formulas
  const latRadNorth = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const north = (latRadNorth * 180.0) / Math.PI;
  
  const latRadSouth = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
  const south = (latRadSouth * 180.0) / Math.PI;
  
  return [west, south, east, north];
}

/**
 * Create simplified weather precipitation layers using BitmapLayer
 * Maps your 16x16 level 4 tiles to world coordinates
 */
export async function createWeatherPrecipitationLayer(): Promise<BitmapLayer[] | null> {
  try {
    if (!CONFIG.weather.localTiles.enabled) {
      console.warn('❌ Local weather tiles disabled in configuration');
      return null;
    }

    // Get current tileset from metadata
    let currentTileset: string;
    
    try {
      console.log('🌦️ Loading weather tile metadata...');
      const response = await fetch('/weather-tiles/metadata.json');
      
      if (!response.ok) {
        throw new Error(`Metadata fetch failed: ${response.status} ${response.statusText}`);
      }
      
      const metadata: WeatherTileMetadata = await response.json();
      console.log('📊 Weather tile metadata loaded:', metadata);
      
      if (metadata.currentTileset) {
        currentTileset = metadata.currentTileset;
        console.log(`✅ Using weather tileset: ${currentTileset}`);
      } else {
        throw new Error('No currentTileset specified in metadata');
      }
    } catch (error) {
      console.error('❌ Failed to load weather tile metadata:', error);
      return null;
    }

    // Test if a sample tile exists
    try {
      const testTileUrl = `/weather-tiles/${currentTileset}/8/8.png`;
      const testResponse = await fetch(testTileUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.warn(`⚠️  Sample tile not found at ${testTileUrl}`);
      } else {
        console.log('✅ Sample tile verified - tileset appears valid');
      }
    } catch (error) {
      console.warn('⚠️  Could not verify sample tile:', error);
    }

    // Create individual BitmapLayers for each tile in the 16x16 grid
    const layers: BitmapLayer[] = [];
    const tilesPerSide = 16; // Level 4 = 2^4 = 16 tiles per side
    
    let tilesLoaded = 0;
    let tilesErrored = 0;

    for (let x = 0; x < tilesPerSide; x++) {
      for (let y = 0; y < tilesPerSide; y++) {
        // Calculate proper Web Mercator bounds for this tile
        const bounds = tileToGeoBounds(x, y, 4); // Using zoom level 4
        const [west, south, east, north] = bounds;
        
        const tileUrl = `/weather-tiles/${currentTileset}/${x}/${y}.png`;
        
        layers.push(new BitmapLayer({
          id: `weather-tile-${x}-${y}`,
          image: tileUrl,
          bounds: [west, south, east, north],
          opacity: CONFIG.weather.localTiles.opacity,
          pickable: false,
          // MAXIMUM INTENSITY weather radar visualization
          tintColor: [100, 255, 100], // Bright radioactive green - most visible radar color
          desaturate: 0, // Full saturation
          transparentColor: [0, 0, 0, 0], // Proper transparency handling
          parameters: {
            depthTest: false,
            // Screen blending mode for maximum brightness and contrast
            blend: true,
            blendFunc: [1, 769], // GL_ONE, GL_ONE_MINUS_SRC_COLOR (screen blending)
            blendEquation: 32774, // GL_FUNC_ADD
            // WebGL settings for maximum visibility
            [2929]: false, // GL_DEPTH_TEST disabled
            [3042]: true,  // GL_BLEND enabled
            [2884]: false, // GL_CULL_FACE disabled
            [2960]: false, // GL_STENCIL_TEST disabled
          },
          // Error handling for individual tiles
          onLoad: () => {
            tilesLoaded++;
            if (tilesLoaded % 50 === 0) {
              console.log(`🌦️ Loaded ${tilesLoaded}/256 weather tiles`);
            }
          },
          onError: (error: any) => {
            tilesErrored++;
            console.warn(`❌ Weather tile failed: ${x},${y}`, error);
          }
        }));
      }
    }

    console.log('🌦️ Weather precipitation layers created successfully');
    console.log(`   Tileset: ${currentTileset}`);
    console.log(`   Layers created: ${layers.length} (16×16 grid)`);
    console.log(`   Using proper Web Mercator tile coordinate system`);
    console.log(`   Opacity: ${CONFIG.weather.localTiles.opacity}`);
    console.log(`   Works at all zoom levels: 0-20`);

    return layers;
    
  } catch (error) {
    console.error('❌ Error creating precipitation layers:', error);
    return null;
  }
}

/**
 * Check if precipitation layer is properly configured
 */
export function isPrecipitationLayerConfigured(): boolean {
  return CONFIG.weather.localTiles.enabled;
}

/**
 * Get weather tile service status
 */
export async function getWeatherTileStatus() {
  try {
    const response = await fetch('/api/weather-tiles/status');
    if (!response.ok) {
      return { available: false, error: 'Service not available' };
    }
    
    const status = await response.json();
    return { available: true, ...status };
    
  } catch (error) {
    return { available: false, error: String(error) };
  }
}

/**
 * Force download new weather tiles
 */
export async function forceWeatherTileDownload() {
  try {
    const response = await fetch('/api/weather-tiles/download', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Download request failed');
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Failed to force weather tile download:', error);
    return { success: false, error: String(error) };
  }
}
