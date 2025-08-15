/**
 * Hurricane Layer Components Index
 * Exports all hurricane layer creation functions for easy importing
 */

export { createConeLayer } from './ConeLayer';
export { createTrackLayer } from './TrackLayer';
export { createForecastCenterlineLayer } from './ForecastCenterlineLayer';
export { 
  createHistoricalPositionLayer,
  createCurrentPositionLayer,
  createForecastPositionLayer
} from './PositionLayers';

// Re-export types for convenience
export type { TrajectoryFeature, ProcessedStorm, ColoredTrackSegment } from '../../types/hurricane';
