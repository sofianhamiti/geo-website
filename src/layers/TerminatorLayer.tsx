/**
 * Terminator Layer using SunCalc for accurate solar calculations
 * Displays the day/night boundary line on the map
 * Memory optimized - no useless caching
 */

import { PathLayer } from '@deck.gl/layers';
import {
  generateTerminatorCoordinates,
  parseColorToRGBA,
  validateTerminatorCoordinates
} from '../utils/solarCalculations';
import { CONFIG } from '../config';

/**
 * Create the deck.gl PathLayer with terminator coordinates
 */
export function createTerminatorLayer(date: Date = new Date()): PathLayer {
  try {
    const coordinates = generateCoordinatesForTerminator(date);
    
    if (!coordinates || coordinates.length === 0) {
      return createEmptyTerminatorLayer();
    }

    // Create terminator path data
    const terminatorPath = {
      path: coordinates,
      color: parseColorToRGBA(CONFIG.styles.terminator.color),
      width: CONFIG.styles.terminator.width,
    };

    // Creating terminator layer

    return new PathLayer({
      id: CONFIG.layerIds.terminator,
      data: [terminatorPath],
      pickable: false,
      getPath: (d: any) => d.path,
      getColor: (d: any) => d.color,
      getWidth: (d: any) => d.width,
      widthMinPixels: 2,
      widthMaxPixels: 8,
      widthScale: 1,
      opacity: CONFIG.styles.terminator.opacity,
      parameters: {
        depthTest: false,
      },
      updateTriggers: {
        getPath: date.getTime(),
      },
    });
  } catch (error) {
    return createEmptyTerminatorLayer();
  }
}

/**
 * Generate terminator coordinates - simplified direct implementation
 */
function generateCoordinatesForTerminator(date: Date): Array<[number, number]> {
  try {
    // Generate coordinates using SunCalc with 180 resolution (kept as requested)
    const terminatorPoints = generateTerminatorCoordinates(
      date,
      180 // Fixed resolution instead of CONFIG value
    );
    
    // Validate the generated coordinates
    if (!validateTerminatorCoordinates(terminatorPoints)) {
      return [];
    }
    
    // Convert to deck.gl format [longitude, latitude]
    const coordinates: Array<[number, number]> = terminatorPoints.map(point => [
      point.longitude,
      point.latitude
    ] as [number, number]);
    
    return coordinates;
  } catch (error) {
    return [];
  }
}

/**
 * Create an empty layer as fallback
 */
function createEmptyTerminatorLayer(): PathLayer {
  return new PathLayer({
    id: CONFIG.layerIds.terminator,
    data: [],
    pickable: false,
  });
}
