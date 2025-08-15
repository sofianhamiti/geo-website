/**
 * Hurricane Data Type Definitions
 * Clean, minimal interfaces for hurricane data fetching and processing
 */

/**
 * Raw hurricane position data from ArcGIS REST API
 */
export interface HurricaneFeature {
  readonly attributes: {
    readonly STORMNAME: string;
    readonly STORMID: string;
    readonly LAT: number;
    readonly LON: number;
    readonly INTENSITY: number;
    readonly MSLP: number;
    readonly STORMTYPE: string;
    readonly BASIN: string;
    readonly DTG: number;
    readonly SS: number; // Saffir-Simpson scale
    readonly DATELBL?: string;
    readonly TIMEZONE?: string;
    readonly FCST_HR?: number; // Forecast hour (0 for current, 12, 24, 48, etc.)
  };
  readonly geometry: {
    readonly x: number;
    readonly y: number;
  };
}

/**
 * Hurricane trajectory cone data (uncertainty cones)
 */
export interface TrajectoryFeature {
  readonly attributes: {
    readonly STORMNAME: string;
    readonly STORMID: string;
    readonly FCST_HR: number; // Forecast hour (12, 24, 48, 72, etc.)
    readonly SS: number;
    readonly STORMTYPE: string;
    readonly BASIN: string;
  };
  readonly geometry: {
    readonly rings: readonly (readonly number[][])[];
  };
}

/**
 * Forecast track centerline data
 */
export interface ForecastTrackFeature {
  readonly attributes: {
    readonly STORMNAME: string;
    readonly STORMID: string;
    readonly SS: number;
    readonly STORMTYPE: string;
    readonly BASIN: string;
  };
  readonly geometry: {
    readonly paths: readonly (readonly number[][])[];
  };
}

/**
 * Track segment with category-based coloring for visualization
 */
export interface ColoredTrackSegment {
  readonly path: readonly (readonly [number, number])[];
  readonly color: readonly [number, number, number, number];
  readonly category: number;
  readonly stormName: string;
  readonly stormId: string;
  readonly segmentType: 'historical' | 'forecast';
}

/**
 * Processed storm data ready for clean visualization
 */
export interface ProcessedStorm {
  readonly stormId: string;
  readonly stormName: string;
  readonly basin: string;
  readonly currentCategory: number;
  readonly historical: readonly HurricaneFeature[];
  readonly current: HurricaneFeature | null;
  readonly forecast: readonly HurricaneFeature[];
  readonly historicalTrackPath: readonly number[][];
  readonly forecastTrackPath: readonly number[][];
  readonly coloredTrackSegments: readonly ColoredTrackSegment[];
}

/**
 * Complete hurricane data structure for the layer
 */
export interface HurricaneLayerData {
  readonly positions: readonly HurricaneFeature[];
  readonly trajectories: readonly TrajectoryFeature[];
  readonly tracks: readonly ForecastTrackFeature[];
  readonly processedStorms: readonly ProcessedStorm[];
  readonly lastUpdate: Date | null;
  readonly error: string | null;
}

/**
 * API response structure from ArcGIS REST service
 */
export interface HurricaneApiResponse {
  readonly features: readonly any[];
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly details?: readonly string[];
  };
}

/**
 * Configuration for hurricane API layer numbers
 */
export interface HurricaneApiLayers {
  readonly positions: number;
  readonly tracks: number;
  readonly trajectories: readonly number[];
}