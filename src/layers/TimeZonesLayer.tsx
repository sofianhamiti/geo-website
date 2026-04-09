/**
 * Time Zones Layer - Local-first with ArcGIS API fallback
 * Loads timezone boundary data from local GeoJSON file for optimal performance,
 * with automatic fallback to ArcGIS World Time Zones service if needed.
 * Displays world timezone boundaries with UTC offset-based coloring.
 */

import { PolygonLayer } from '@deck.gl/layers';
import { CONFIG } from '../config';

// Simple cache for processed timezone data
let timezonesCache: any[] | null = null;

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
    .catch(() => {
      return [createEmptyTimeZonesLayer()];
    });
}

/**
 * Fetch timezone data from local file with ArcGIS API fallback
 */
async function fetchTimeZonesData(): Promise<any[]> {
  try {
    // Return cached data if available
    if (timezonesCache) {
      return timezonesCache;
    }

    // Try local file first
    try {
      const response = await fetch(CONFIG.styles.timezones.dataPath);
      
      if (response.ok) {
        const geojsonData = await response.json();
        
        if (geojsonData.features && geojsonData.features.length > 0) {
          const processedData = processGeoJsonFeatures(geojsonData);
          timezonesCache = processedData;
          return processedData;
        }
      }
    } catch (localFileError) {
      console.warn('Failed to load local timezone data, falling back to API:', localFileError);
    }

    // Fallback to ArcGIS API
    const url = `${CONFIG.styles.timezones.serviceUrl}/0/query?` + 
      'where=1%3D1&' +
      'outFields=*&' +
      'outSR=4326&' +
      'f=geojson&' +
      'resultRecordCount=10000';

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }

    const geojsonData = await response.json();
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('No timezone features found in API response');
    }

    const processedData = processGeoJsonFeatures(geojsonData);
    timezonesCache = processedData;

    return processedData;

  } catch (error) {
    console.error('Failed to load timezone data:', error);
    return [];
  }
}

/**
 * Process GeoJSON features into deck.gl format
 */
function processGeoJsonFeatures(geojsonData: any): any[] {
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

  return processedData;
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

