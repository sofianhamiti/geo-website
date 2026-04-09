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

export interface ColoredTrackSegment {
  readonly path: readonly (readonly [number, number])[];
  readonly color: readonly [number, number, number, number];
  readonly category: number;
  readonly stormName: string;
  readonly stormId: string;
  readonly segmentType: 'historical' | 'forecast';
}

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

export interface HurricaneLayerData {
  readonly positions: readonly HurricaneFeature[];
  readonly trajectories: readonly TrajectoryFeature[];
  readonly processedStorms: readonly ProcessedStorm[];
  readonly lastUpdate: Date | null;
  readonly error: string | null;
}

export interface HurricaneApiResponse {
  readonly features: readonly any[];
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly details?: readonly string[];
  };
}