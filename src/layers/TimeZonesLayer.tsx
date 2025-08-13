/**
 * Time Zones Layer using ArcGIS World Time Zones Feature Service
 * Displays world timezone boundaries with UTC offset-based coloring
 * Uses GeoJSON + PolygonLayer for full styling control
 */

import { PolygonLayer, TextLayer } from '@deck.gl/layers';
import { CONFIG } from '../config';

// Cache for timezone data to avoid repeated API calls
let timezonesCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create the deck.gl PolygonLayer with timezone polygons only
 */
export function createTimeZonesLayers(): Promise<PolygonLayer[]> {
  return fetchTimeZonesData()
    .then(data => {
      if (!data || data.length === 0) {
        return [createEmptyTimeZonesLayer()];
      }

      // Create timezone polygon layer - borders only, no fill, single color
      const timeZonesLayer = new PolygonLayer({
        id: CONFIG.layerIds.timezones,
        data: data,
        pickable: false, // No interactions needed
        stroked: true,
        filled: false, // No fill - only border lines
        wireframe: false,
        lineWidthMinPixels: 1,
        getPolygon: (d: any) => d.coordinates,
        getLineColor: [182, 193, 255, 100],
        getLineWidth: CONFIG.styles.timezones.strokeWidth,
        parameters: {
          depthTest: false,
        },
      });

      return [timeZonesLayer];
    })
    .catch(error => {
      console.error('Error creating timezone layers:', error);
      return [createEmptyTimeZonesLayer()];
    });
}

/**
 * Fetch timezone data from ArcGIS World Time Zones Feature Service
 */
async function fetchTimeZonesData(): Promise<any[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (timezonesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return timezonesCache;
    }

    // Fetch from ArcGIS REST API - get ALL records, not just 1000
    const url = `${CONFIG.styles.timezones.serviceUrl}/0/query?` + 
      'where=1%3D1&' +
      'outFields=*&' +
      'outSR=4326&' +
      'f=geojson&' +
      'resultRecordCount=10000'; // Increased limit to get all timezones

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const geojsonData = await response.json();
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('No timezone features found in response');
    }

    // Transform GeoJSON features to deck.gl format - handle MultiPolygons properly
    const processedData: any[] = [];
    
    geojsonData.features.forEach((feature: any) => {
      if (feature.geometry.type === 'Polygon') {
        processedData.push({
          coordinates: feature.geometry.coordinates,
          properties: {
            ...feature.properties,
            UTC_OFFSET: parseUtcOffset(feature.properties.ZONE || feature.properties.UTC_OFFSET || feature.properties.GMT_OFFSET || 0),
            NAME: feature.properties.ZONE_NAME || feature.properties.NAME || feature.properties.TIMEZONE || 'Unknown'
          }
        });
      } else if (feature.geometry.type === 'MultiPolygon') {
        // For MultiPolygon, create separate entries for each polygon to ensure all parts are rendered
        feature.geometry.coordinates.forEach((polygonCoords: any, index: number) => {
          processedData.push({
            coordinates: polygonCoords,
            properties: {
              ...feature.properties,
              UTC_OFFSET: parseUtcOffset(feature.properties.ZONE || feature.properties.UTC_OFFSET || feature.properties.GMT_OFFSET || 0),
              NAME: (feature.properties.ZONE_NAME || feature.properties.NAME || feature.properties.TIMEZONE || 'Unknown') + (index > 0 ? ` (${index + 1})` : ''),
              MULTI_PART: index + 1,
              TOTAL_PARTS: feature.geometry.coordinates.length
            }
          });
        });
      }
    });

    // Cache the processed data
    timezonesCache = processedData;
    cacheTimestamp = now;

    return processedData;

  } catch (error) {
    console.error('Error fetching timezone data:', error);
    return [];
  }
}

/**
 * Parse UTC offset from various formats
 */
function parseUtcOffset(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Handle formats like "UTC+5", "GMT-3", "+05:00", etc.
    const match = value.match(/([+-]?\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return 0; // Default to UTC
}

/**
 * Create an empty layer as fallback
 */
function createEmptyTimeZonesLayer(): PolygonLayer {
  return new PolygonLayer({
    id: CONFIG.layerIds.timezones,
    data: [],
    pickable: false,
  });
}

/**
 * Check if timezone layer is properly configured
 */
export function isTimeZonesLayerConfigured(): boolean {
  return Boolean(CONFIG.styles.timezones?.serviceUrl);
}

/**
 * Get unique timezone offsets from cached data for world clock display
 */
export function getUniqueTimezoneOffsets(): number[] {
  if (!timezonesCache) return [];
  
  // Extract unique UTC offsets and sort them
  const offsets = [...new Set(
    timezonesCache.map(tz => tz.properties.UTC_OFFSET)
  )].filter(offset => typeof offset === 'number').sort((a, b) => a - b);
  
  return offsets;
}

/**
 * Create timezone text layer with geographic positioning
 */
export function createTimeZoneTextLayers(currentTime: Date): Promise<TextLayer[]> {
  return fetchTimeZonesData()
    .then(data => {
      if (!data || data.length === 0) {
        return [];
      }

      // Group timezones by UTC offset to avoid duplicate text
      const timezoneGroups = new Map<number, any[]>();
      
      data.forEach(tz => {
        const offset = tz.properties.UTC_OFFSET;
        if (!timezoneGroups.has(offset)) {
          timezoneGroups.set(offset, []);
        }
        timezoneGroups.get(offset)!.push(tz);
      });

      // Create text data with geographic positioning
      const textData: any[] = [];
      
      timezoneGroups.forEach((timezones, offset) => {
        // Find the largest/most representative timezone for this offset
        const mainTimezone = timezones.reduce((largest, current) => {
          const currentArea = calculatePolygonArea(current.coordinates);
          const largestArea = calculatePolygonArea(largest.coordinates);
          return currentArea > largestArea ? current : largest;
        });

        // Calculate the "top" position of this timezone
        const topPosition = calculateTimezoneTopPosition(mainTimezone.coordinates);
        
        if (topPosition) {
          // Calculate current time in this timezone
          const localTime = new Date(currentTime.getTime() + (offset * 60 * 60 * 1000));
          const timeDisplay = localTime.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Format UTC offset display
          const offsetSign = offset >= 0 ? '+' : '';
          const offsetDisplay = `UTC${offsetSign}${offset}`;
          
          textData.push({
            position: topPosition,
            text: `${timeDisplay}\n${offsetDisplay}`,
            utcOffset: offset,
            timezone: mainTimezone.properties.NAME
          });
        }
      });

      // Create the text layer
      const textLayer = new TextLayer({
        id: `${CONFIG.layerIds.timezones}-text`,
        data: textData,
        pickable: false,
        getPosition: (d: any) => d.position,
        getText: (d: any) => d.text,
        getColor: [255, 255, 255, 220],
        getSize: 14,
        getAngle: 0,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
        fontWeight: 'bold',
        backgroundColor: [0, 0, 0, 120],
        getBackgroundColor: [0, 0, 0, 120],
        backgroundPadding: [4, 2, 4, 2],
        parameters: {
          depthTest: false,
        },
        updateTriggers: {
          getText: currentTime.getMinutes(), // Update every minute
        }
      });

      return [textLayer];
    })
    .catch(error => {
      console.error('Error creating timezone text layers:', error);
      return [];
    });
}

/**
 * Calculate the approximate area of a polygon for comparison
 */
function calculatePolygonArea(coordinates: number[][][]): number {
  if (!coordinates || !coordinates[0]) return 0;
  
  const ring = coordinates[0]; // Use outer ring
  let area = 0;
  
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Calculate the "top" position of a timezone for text placement
 * Returns the northernmost point that's roughly in the center longitude-wise
 */
function calculateTimezoneTopPosition(coordinates: number[][][]): [number, number] | null {
  if (!coordinates || !coordinates[0]) return null;
  
  const ring = coordinates[0]; // Use outer ring
  
  // Find bounding box
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  ring.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  // Calculate center longitude and use top latitude (with slight offset)
  const centerLon = (minLon + maxLon) / 2;
  const topLat = maxLat - (maxLat - minLat) * 0.1; // 10% down from absolute top
  
  return [centerLon, topLat];
}

/**
 * Get timezone text data for external use
 */
export function getTimezoneTextData(currentTime: Date): Promise<any[]> {
  return fetchTimeZonesData()
    .then(data => {
      if (!data || data.length === 0) {
        return [];
      }

      // Group timezones by UTC offset
      const timezoneGroups = new Map<number, any[]>();
      
      data.forEach(tz => {
        const offset = tz.properties.UTC_OFFSET;
        if (!timezoneGroups.has(offset)) {
          timezoneGroups.set(offset, []);
        }
        timezoneGroups.get(offset)!.push(tz);
      });

      // Create text data array
      const textData: any[] = [];
      
      timezoneGroups.forEach((timezones, offset) => {
        const mainTimezone = timezones.reduce((largest, current) => {
          const currentArea = calculatePolygonArea(current.coordinates);
          const largestArea = calculatePolygonArea(largest.coordinates);
          return currentArea > largestArea ? current : largest;
        });

        const topPosition = calculateTimezoneTopPosition(mainTimezone.coordinates);
        
        if (topPosition) {
          const localTime = new Date(currentTime.getTime() + (offset * 60 * 60 * 1000));
          const timeDisplay = localTime.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const offsetSign = offset >= 0 ? '+' : '';
          const offsetDisplay = `UTC${offsetSign}${offset}`;
          
          textData.push({
            position: topPosition,
            text: `${timeDisplay}\n${offsetDisplay}`,
            utcOffset: offset,
            timezone: mainTimezone.properties.NAME
          });
        }
      });

      return textData;
    })
    .catch(error => {
      console.error('Error getting timezone text data:', error);
      return [];
    });
}

/**
 * Clear timezone cache (useful for debugging or manual refresh)
 */
export function clearTimeZonesCache(): void {
  timezonesCache = null;
  cacheTimestamp = 0;
}
