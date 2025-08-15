/**
 * Hurricane Data Processor
 * Consolidated data transformation logic for hurricane visualization
 * 
 * This processor handles all hurricane data transformations including:
 * - Raw API data processing and grouping
 * - Category-colored track segment creation
 * - Position type separation (historical, current, forecast)
 * - Track path generation for visualization
 * 
 * @author Generated for geo-website project
 */

import { CONFIG } from '../config';
import type {
  HurricaneFeature,
  ColoredTrackSegment,
  ProcessedStorm
} from '../types/hurricane';

/**
 * Position classification result for a storm
 */
interface StormPositions {
  readonly historical: readonly HurricaneFeature[];
  readonly current: HurricaneFeature | null;
  readonly forecast: readonly HurricaneFeature[];
}

/**
 * Track path generation result
 */
interface TrackPaths {
  readonly historicalTrackPath: readonly number[][];
  readonly forecastTrackPath: readonly number[][];
}

/**
 * Validation result for hurricane data
 */
interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Hurricane Data Processor Class
 * 
 * Provides clean, testable methods for transforming raw hurricane API data
 * into visualization-ready formats. All methods are pure functions that don't
 * modify input data and handle edge cases gracefully.
 */
export class HurricaneProcessor {
  /**
   * Process raw hurricane data into clean visualization format
   * 
   * This is the main processing method that takes raw API data and returns
   * fully processed storms ready for visualization.
   * 
   * @param positions - Raw hurricane position data from API
   * @returns Array of processed storm data
   * 
   * @example
   * ```typescript
   * const processor = new HurricaneProcessor();
   * const processedStorms = processor.processRawData(rawPositions);
   * // processedStorms[0].coloredTrackSegments contains the track data
   * ```
   */
  public processRawData(positions: readonly HurricaneFeature[]): readonly ProcessedStorm[] {
    try {
      // Validate input data
      const validation = this.validateHurricaneData(positions);
      if (!validation.isValid) {
        console.warn('Hurricane data validation failed:', validation.errors);
        return [];
      }

      // Group positions by storm ID
      const stormGroups = this.groupPositionsByStorm(positions);
      
      // Process each storm group
      const processedStorms = Object.entries(stormGroups).map(([stormId, stormPositions]) => {
        return this.processStormGroup(stormId, stormPositions);
      }).filter((storm): storm is ProcessedStorm => storm !== null);

      return processedStorms;
    } catch (error) {
      console.error('Error processing hurricane data:', error);
      return [];
    }
  }

  /**
   * Group hurricane positions by storm ID
   * 
   * Takes an array of hurricane positions and groups them by their STORMID,
   * creating a map where each key is a storm ID and the value is an array
   * of positions for that storm.
   * 
   * @param positions - Array of hurricane position features
   * @returns Object mapping storm IDs to their positions
   */
  public groupPositionsByStorm(
    positions: readonly HurricaneFeature[]
  ): Record<string, readonly HurricaneFeature[]> {
    try {
      const groups: Record<string, HurricaneFeature[]> = {};
      
      for (const position of positions) {
        const stormId = position.attributes.STORMID;
        if (!stormId) continue;
        
        if (!groups[stormId]) {
          groups[stormId] = [];
        }
        groups[stormId].push(position);
      }

      // Sort each group chronologically and make readonly
      const sortedGroups: Record<string, readonly HurricaneFeature[]> = {};
      for (const [stormId, stormPositions] of Object.entries(groups)) {
        sortedGroups[stormId] = [...stormPositions].sort((a, b) => a.attributes.DTG - b.attributes.DTG);
      }

      return sortedGroups;
    } catch (error) {
      console.error('Error grouping positions by storm:', error);
      return {};
    }
  }

  /**
   * Create category-colored track segments for zoom.earth style rendering
   * 
   * Generates colored line segments based on hurricane category at each point,
   * creating smooth transitions between different intensity levels.
   * 
   * @param stormPositions - Sorted positions for a single storm
   * @param stormName - Name of the storm
   * @param stormId - Unique identifier for the storm
   * @returns Array of colored track segments
   */
  public createTrackSegments(
    stormPositions: readonly HurricaneFeature[],
    stormName: string,
    stormId: string
  ): readonly ColoredTrackSegment[] {
    try {
      const segments: ColoredTrackSegment[] = [];
      
      // Create historical segments
      const historicalSegments = this.createHistoricalSegments(stormPositions, stormName, stormId);
      segments.push(...historicalSegments);
      
      // Create forecast segments
      const forecastSegments = this.createForecastSegments(stormPositions, stormName, stormId);
      segments.push(...forecastSegments);
      
      return segments;
    } catch (error) {
      console.error('Error creating track segments:', error);
      return [];
    }
  }

  /**
   * Separate positions into historical, current, and forecast types
   * 
   * Analyzes forecast hour values to classify positions into different types
   * for proper visualization rendering.
   * 
   * @param positions - Array of hurricane positions
   * @returns Classified positions by type
   */
  public separatePositionTypes(positions: readonly HurricaneFeature[]): StormPositions {
    try {
      const historical: HurricaneFeature[] = [];
      const forecast: HurricaneFeature[] = [];
      let current: HurricaneFeature | null = null;

      for (const position of positions) {
        const forecastHour = position.attributes.FCST_HR || 0;
        
        if (forecastHour === 0) {
          historical.push(position);
        } else if (forecastHour > 0) {
          forecast.push(position);
        }
      }

      // The last historical position is the current position
      if (historical.length > 0) {
        current = historical[historical.length - 1];
        // Remove current from historical array
        historical.pop();
      }

      return {
        historical,
        current,
        forecast
      };
    } catch (error) {
      console.error('Error separating position types:', error);
      return {
        historical: [],
        current: null,
        forecast: []
      };
    }
  }

  /**
   * Create track paths for historical and forecast visualization
   * 
   * Generates coordinate arrays suitable for PathLayer rendering,
   * ensuring proper connection between historical and forecast segments.
   * 
   * @param positions - Classified storm positions
   * @returns Track paths for visualization
   */
  public createTrackPaths(positions: StormPositions): TrackPaths {
    try {
      // Create historical track path
      const historicalTrackPath = positions.historical.map(p => [p.geometry.x, p.geometry.y]);
      
      // Create forecast track path
      let forecastTrackPath: number[][] = [];
      if (positions.forecast.length > 0 && positions.current) {
        // Start with current position, then add forecast positions
        forecastTrackPath = [
          [positions.current.geometry.x, positions.current.geometry.y],
          ...positions.forecast.map(p => [p.geometry.x, p.geometry.y])
        ];
      }

      return {
        historicalTrackPath,
        forecastTrackPath
      };
    } catch (error) {
      console.error('Error creating track paths:', error);
      return {
        historicalTrackPath: [],
        forecastTrackPath: []
      };
    }
  }

  /**
   * Convert wind speed in knots to Saffir-Simpson category
   * This is what zoom.earth does - they convert INTENSITY to categories
   * 
   * @param windSpeedKnots - Wind speed in knots
   * @returns Saffir-Simpson category (0-5)
   */
  public windSpeedToCategory(windSpeedKnots: number): number {
    if (windSpeedKnots >= 137) return 5;  // Cat 5: 137+ knots
    if (windSpeedKnots >= 113) return 4;  // Cat 4: 113-136 knots
    if (windSpeedKnots >= 96) return 3;   // Cat 3: 96-112 knots
    if (windSpeedKnots >= 83) return 2;   // Cat 2: 83-95 knots
    if (windSpeedKnots >= 64) return 1;   // Cat 1: 64-82 knots
    if (windSpeedKnots >= 34) return 0;   // Tropical Storm: 34-63 knots
    return 0; // Tropical Depression or less
  }

  /**
   * Get category color based on Saffir-Simpson scale
   * 
   * @param category - Hurricane category (0-5)
   * @returns RGBA color array
   */
  public getCategoryColor(category: number): readonly [number, number, number, number] {
    try {
      const colors = CONFIG.weather.hurricanes.categoryColors;
      const normalizedCategory = Math.max(0, Math.min(5, Math.floor(category))) as keyof typeof colors;
      return colors[normalizedCategory] || colors[0];
    } catch (error) {
      console.error('Error getting category color:', error);
      return CONFIG.weather.hurricanes.categoryColors[0];
    }
  }

  /**
   * Validate hurricane data for processing
   * 
   * @param data - Hurricane data to validate
   * @returns Validation result with errors if any
   */
  public validateHurricaneData(data: readonly HurricaneFeature[]): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Hurricane data must be an array');
      return { isValid: false, errors };
    }

    if (data.length === 0) {
      return { isValid: true, errors: [] }; // Empty data is valid
    }

    // Validate individual features
    for (let i = 0; i < Math.min(data.length, 10); i++) { // Check first 10 for performance
      const feature = data[i];
      
      if (!feature.attributes) {
        errors.push(`Feature ${i}: Missing attributes`);
        continue;
      }

      if (!feature.geometry) {
        errors.push(`Feature ${i}: Missing geometry`);
        continue;
      }

      // Validate required attributes
      const attrs = feature.attributes;
      if (!attrs.STORMID) {
        errors.push(`Feature ${i}: Missing STORMID`);
      }

      // Validate coordinates
      const geom = feature.geometry;
      if (typeof geom.x !== 'number' || typeof geom.y !== 'number') {
        errors.push(`Feature ${i}: Invalid coordinates`);
      }

      if (geom.x < -180 || geom.x > 180 || geom.y < -90 || geom.y > 90) {
        errors.push(`Feature ${i}: Coordinates out of bounds`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process a single storm group into ProcessedStorm format
   * 
   * @private
   * @param stormId - Storm identifier
   * @param stormPositions - Array of positions for this storm
   * @returns Processed storm data or null if invalid
   */
  private processStormGroup(
    stormId: string,
    stormPositions: readonly HurricaneFeature[]
  ): ProcessedStorm | null {
    try {
      if (stormPositions.length === 0) return null;

      // Separate position types
      const positions = this.separatePositionTypes(stormPositions);
      
      // Skip storms without current position
      if (!positions.current) return null;

      // Create track paths
      const trackPaths = this.createTrackPaths(positions);

      // Create colored track segments
      const coloredTrackSegments = this.createTrackSegments(
        stormPositions,
        positions.current.attributes.STORMNAME || 'Unknown Storm',
        stormId
      );

      return {
        stormId,
        stormName: positions.current.attributes.STORMNAME || 'Unknown Storm',
        basin: positions.current.attributes.BASIN || 'Unknown',
        currentCategory: positions.current.attributes.SS || 0,
        historical: positions.historical,
        current: positions.current,
        forecast: positions.forecast,
        historicalTrackPath: trackPaths.historicalTrackPath,
        forecastTrackPath: trackPaths.forecastTrackPath,
        coloredTrackSegments
      };
    } catch (error) {
      console.error(`Error processing storm group ${stormId}:`, error);
      return null;
    }
  }

  /**
   * Create historical track segments with category coloring
   * 
   * @private
   * @param stormPositions - All positions for the storm
   * @param stormName - Name of the storm
   * @param stormId - Storm identifier
   * @returns Array of historical colored segments
   */
  private createHistoricalSegments(
    stormPositions: readonly HurricaneFeature[],
    stormName: string,
    stormId: string
  ): readonly ColoredTrackSegment[] {
    const segments: ColoredTrackSegment[] = [];
    
    for (let i = 0; i < stormPositions.length - 1; i++) {
      const currentPoint = stormPositions[i];
      const nextPoint = stormPositions[i + 1];
      
      // Skip forecast points in historical segments
      if ((currentPoint.attributes.FCST_HR || 0) > 0 || (nextPoint.attributes.FCST_HR || 0) > 0) {
        continue;
      }
      
      const categoryAtTime = currentPoint.attributes.SS || 0;
      const color = this.getCategoryColor(categoryAtTime);
      
      segments.push({
        path: [
          [currentPoint.geometry.x, currentPoint.geometry.y],
          [nextPoint.geometry.x, nextPoint.geometry.y]
        ],
        color: [color[0], color[1], color[2], 220] as [number, number, number, number],
        category: categoryAtTime,
        stormName,
        stormId,
        segmentType: 'historical'
      });
    }
    
    return segments;
  }

  /**
   * Create forecast track segments with category coloring
   * 
   * @private
   * @param stormPositions - All positions for the storm
   * @param stormName - Name of the storm
   * @param stormId - Storm identifier
   * @returns Array of forecast colored segments
   */
  private createForecastSegments(
    stormPositions: readonly HurricaneFeature[],
    stormName: string,
    stormId: string
  ): readonly ColoredTrackSegment[] {
    const segments: ColoredTrackSegment[] = [];
    
    // Get forecast positions and current position
    const forecastPositions = stormPositions.filter(p => (p.attributes.FCST_HR || 0) > 0);
    const currentPosition = stormPositions.filter(p => (p.attributes.FCST_HR || 0) === 0).slice(-1)[0];
    
    if (forecastPositions.length === 0 || !currentPosition) {
      return segments;
    }
    
    // DEBUG: Log what fields we have in forecast positions
    if (forecastPositions.length > 0) {
      console.log('🌀 DEBUG - Forecast position attributes:', {
        stormName,
        firstForecastAttrs: forecastPositions[0].attributes,
        availableFields: Object.keys(forecastPositions[0].attributes),
        SS_values: forecastPositions.map(p => p.attributes.SS),
        INTENSITY_values: forecastPositions.map(p => p.attributes.INTENSITY),
        FCST_HR_values: forecastPositions.map(p => p.attributes.FCST_HR)
      });
    }
    
    // Connect current to first forecast
    const firstForecast = forecastPositions[0];
    const currentCategory = currentPosition.attributes.SS || 0;
    const color = this.getCategoryColor(currentCategory);
    
    segments.push({
      path: [
        [currentPosition.geometry.x, currentPosition.geometry.y],
        [firstForecast.geometry.x, firstForecast.geometry.y]
      ],
      color: [color[0], color[1], color[2], 180] as [number, number, number, number],
      category: currentCategory,
      stormName,
      stormId,
      segmentType: 'forecast'
    });
    
    // Connect forecast positions - USE INTENSITY AND CONVERT TO CATEGORY
    for (let i = 0; i < forecastPositions.length - 1; i++) {
      const currentForecast = forecastPositions[i];
      const nextForecast = forecastPositions[i + 1];
      
      // THE FUCKING FIX: Use INTENSITY field and convert to category
      // SS is always 0 for forecasts, but INTENSITY has the wind speed
      const windSpeed = currentForecast.attributes.INTENSITY || 0;
      const categoryAtTime = windSpeed > 0 ? this.windSpeedToCategory(windSpeed) : (currentForecast.attributes.SS || 0);
      const forecastColor = this.getCategoryColor(categoryAtTime);
      
      segments.push({
        path: [
          [currentForecast.geometry.x, currentForecast.geometry.y],
          [nextForecast.geometry.x, nextForecast.geometry.y]
        ],
        color: [forecastColor[0], forecastColor[1], forecastColor[2], 180] as [number, number, number, number],
        category: categoryAtTime,
        stormName,
        stormId,
        segmentType: 'forecast'
      });
    }
    
    return segments;
  }
}

/**
 * Utility function to get category text description
 *
 * @param category - Hurricane category (0-5)
 * @returns Human-readable category description
 */
export function getCategoryText(category: number): string {
  if (category >= 5) return 'Cat 5 Hurricane';
  if (category >= 4) return 'Cat 4 Hurricane';
  if (category >= 3) return 'Cat 3 Hurricane';
  if (category >= 2) return 'Cat 2 Hurricane';
  if (category >= 1) return 'Cat 1 Hurricane';
  return 'Tropical Storm';
}
