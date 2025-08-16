/**
 * Hurricane Layer - ACTUALLY FUCKING SIMPLIFIED
 * Single file implementation following the pattern of other layers
 * 
 * Collapsed from 6 separate files into one cohesive layer following
 * the same pattern as EarthquakeLayer and PlanesLayer.
 * 
 * Features:
 * - All layer creation in one place
 * - Uses centralized tooltip factory (NO inline tooltips)
 * - Proper layer IDs matching tooltip factory expectations
 * - Consistent with other layer patterns
 */

import { PolygonLayer, PathLayer, ScatterplotLayer, IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../config';
import { hurricaneDataManager } from '../services/HurricaneDataManager';
import { safeSyncOperation } from '../utils/errorHandler';
import { getCategoryColor, getIconFactory, getStormSize } from '../utils/IconFactory';
import { HurricaneProcessor } from '../utils/HurricaneProcessor';
import type { 
  TrajectoryFeature, 
  ProcessedStorm, 
  ColoredTrackSegment,
  HurricaneLayerData 
} from '../types/hurricane';

// Create processor instance for wind speed conversion
const hurricaneProcessor = new HurricaneProcessor();

/**
 * Interface for trajectory segment colored by SSNUM
 */
interface SSNUMTrajectorySegment {
  path: [number, number][];
  color: [number, number, number, number];
  category: number;
  stormName: string;
  stormId: string;
  fromHour: number;
  toHour: number;
}


/**
 * Create error display layer for API failures
 */
function createErrorLayer(error: string): Layer {
  return new TextLayer({
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
  });
}

/**
 * Create hurricane uncertainty cone layer
 */
function createConeLayer(trajectories: readonly TrajectoryFeature[]): Layer | null {
  return safeSyncOperation(
    () => {
      if (!trajectories || trajectories.length === 0) {
        return null;
      }

      return new PolygonLayer({
        id: 'hurricane-cones', // Standard ID for tooltip factory
        data: trajectories,
        getPolygon: (d: TrajectoryFeature) => {
          const rings = d.geometry.rings;
          if (!rings || rings.length === 0) return [];
          const outerRing = rings[0];
          return outerRing.map(coord => [coord[0], coord[1]]);
        },
        getFillColor: CONFIG.weather.hurricanes.zoomEarthColors.uncertaintyCone,
        getLineColor: CONFIG.weather.hurricanes.visualParams.coneStrokeColor,
        getLineWidth: CONFIG.weather.hurricanes.visualParams.coneStrokeWidth,
        lineWidthUnits: 'pixels',
        pickable: true, // Enable tooltips for cone
        stroked: true,
        filled: true,
        // NO getTooltip - let factory handle it
      });
    },
    'create hurricane uncertainty cone layer',
    null
  );
}

/**
 * Create hurricane track segments layer
 */
function createTrackLayer(processedStorms: readonly ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      const allTrackSegments = processedStorms.flatMap(storm => storm.coloredTrackSegments);
      
      if (allTrackSegments.length === 0) {
        return null;
      }

      return new PathLayer({
        id: 'hurricane-tracks', // Standard ID for tooltip factory
        data: allTrackSegments,
        getPath: (d: ColoredTrackSegment) => d.path as any,
        getColor: (d: ColoredTrackSegment) => d.color as any,
        getWidth: (d: ColoredTrackSegment) => {
          return d.segmentType === 'historical' 
            ? CONFIG.weather.hurricanes.visualParams.historicalTrackWidth 
            : CONFIG.weather.hurricanes.visualParams.forecastTrackWidth;
        },
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: false, // No tooltips on track segments
      });
    },
    'create hurricane track layer',
    null
  );
}

/**
 * Create SSNUM trajectory segments from forecast positions
 */
function createSSNUMTrajectorySegments(ssnumPositions: any[]): SSNUMTrajectorySegment[] {
  if (!ssnumPositions || ssnumPositions.length === 0) {
    return [];
  }

  // Group ALL positions by storm (including TAU=0 current positions)
  const stormPositions = new Map<string, any[]>();
  
  for (const position of ssnumPositions) {
    const attrs = position.attributes;
    const stormId = attrs.STORMID || 'unknown';
    
    if (attrs.TAU !== null && attrs.TAU !== undefined && attrs.LAT && attrs.LON) {
      if (!stormPositions.has(stormId)) {
        stormPositions.set(stormId, []);
      }
      stormPositions.get(stormId)!.push(position);
    }
  }

  const segments: SSNUMTrajectorySegment[] = [];

  for (const [stormId, positions] of stormPositions.entries()) {
    if (positions.length < 2) continue;

    positions.sort((a, b) => (a.attributes.TAU || 0) - (b.attributes.TAU || 0));
    const stormName = positions[0].attributes.STORMNAME || 'Unknown Storm';

    for (let i = 0; i < positions.length - 1; i++) {
      const currentPos = positions[i];
      const nextPos = positions[i + 1];
      
      const currentAttrs = currentPos.attributes;
      const nextAttrs = nextPos.attributes;

      const category = nextAttrs.SSNUM || currentAttrs.SSNUM || 0;
      const color = getCategoryColor(category);

      const path: [number, number][] = [
        [currentAttrs.LON, currentAttrs.LAT],
        [nextAttrs.LON, nextAttrs.LAT]
      ];

      segments.push({
        path,
        color: [color[0], color[1], color[2], 200] as [number, number, number, number],
        category,
        stormName,
        stormId,
        fromHour: currentAttrs.TAU || 0,
        toHour: nextAttrs.TAU || 0
      });
    }
  }

  return segments;
}

/**
 * Create SSNUM trajectory layer
 */
function createSSNUMTrajectoryLayer(ssnumForecastPositions: any[]): Layer | null {
  return safeSyncOperation(
    () => {
      const trajectorySegments = createSSNUMTrajectorySegments(ssnumForecastPositions);
      
      if (trajectorySegments.length === 0) {
        return null;
      }

      return new PathLayer({
        id: 'hurricane-ssnum-trajectories', // Standard ID for tooltip factory
        data: trajectorySegments,
        getPath: (d: SSNUMTrajectorySegment) => d.path,
        getColor: (d: SSNUMTrajectorySegment) => d.color,
        getWidth: CONFIG.weather.hurricanes.visualParams.forecastTrackWidth + 1,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: false, // No tooltips on SSNUM trajectory lines
      });
    },
    'create SSNUM trajectory layer',
    null
  );
}

/**
 * Create historical position dots layer
 */
function createHistoricalPositionLayer(processedStorms: readonly ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      const historicalPositions = processedStorms.flatMap(storm => 
        storm.historical.map(pos => ({...pos, stormName: storm.stormName, currentCategory: storm.currentCategory}))
      );
      
      if (historicalPositions.length === 0) {
        return null;
      }

      return new ScatterplotLayer({
        id: 'hurricane-historical-positions', // Standard ID for tooltip factory
        data: historicalPositions,
        getPosition: (d: any) => [d.geometry.x, d.geometry.y],
        getRadius: CONFIG.weather.hurricanes.visualParams.historicalDotRadius,
        getFillColor: (d: any) => {
          const color = getCategoryColor(d.attributes.SS || 0);
          return [color[0], color[1], color[2], 255];
        },
        getLineColor: CONFIG.weather.hurricanes.visualParams.historicalDotStroke,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        pickable: true,
        // NO getTooltip - let factory handle it
      });
    },
    'create hurricane historical position layer',
    null
  );
}

/**
 * Create current position icons layer
 */
function createCurrentPositionLayer(processedStorms: readonly ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      const currentPositions = processedStorms
        .filter(storm => storm.current)
        .map(storm => ({...storm.current!, stormName: storm.stormName, currentCategory: storm.currentCategory}));
      
      if (currentPositions.length === 0) {
        return null;
      }

      return new IconLayer({
        id: 'hurricane-positions', // Standard ID for tooltip factory (matches existing factory)
        data: currentPositions,
        getPosition: (d: any) => [d.geometry.x, d.geometry.y],
        getIcon: (d: any) => {
          const iconFactory = getIconFactory();
          return iconFactory.getIconConfig('current', d.attributes.SS || 0);
        },
        getSize: (d: any) => getStormSize(d.attributes.SS || 0, true),
        sizeUnits: 'pixels',
        pickable: true,
        // NO getTooltip - let factory handle it
      });
    },
    'create hurricane current position layer',
    null
  );
}

/**
 * Create forecast position dots layer
 */
function createForecastPositionLayer(processedStorms: readonly ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      const forecastPositions = processedStorms.flatMap(storm => 
        storm.forecast.map(pos => ({...pos, stormName: storm.stormName, currentCategory: storm.currentCategory}))
      );
      
      if (forecastPositions.length === 0) {
        return null;
      }

      return new ScatterplotLayer({
        id: 'hurricane-forecast-positions', // Standard ID for tooltip factory
        data: forecastPositions,
        getPosition: (d: any) => [d.geometry.x, d.geometry.y],
        getRadius: CONFIG.weather.hurricanes.visualParams.forecastDotRadius,
        getFillColor: (d: any) => {
          const windSpeed = d.attributes.INTENSITY || 0;
          const predictedCategory = windSpeed > 0 
            ? hurricaneProcessor.windSpeedToCategory(windSpeed)  
            : (d.attributes.SS || 0);
          const color = getCategoryColor(predictedCategory);
          return [color[0], color[1], color[2], 220];
        },
        getLineColor: CONFIG.weather.hurricanes.visualParams.forecastDotStroke,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        pickable: true,
        // NO getTooltip - let factory handle it
      });
    },
    'create hurricane forecast position layer',
    null
  );
}

/**
 * Create SSNUM forecast dots layer
 */
function createSSNUMForecastDotsLayer(ssnumForecastPositions: any[]): Layer | null {
  return safeSyncOperation(
    () => {
      const forecastPositions = ssnumForecastPositions.filter((position) => {
        const attrs = position.attributes;
        return attrs.TAU && attrs.TAU > 0 &&
               attrs.SSNUM !== null && attrs.SSNUM !== undefined &&
               attrs.LAT && attrs.LON;
      });
      
      if (forecastPositions.length === 0) {
        return null;
      }

      return new ScatterplotLayer({
        id: 'hurricane-ssnum-forecast-dots', // Standard ID for tooltip factory
        data: forecastPositions,
        getPosition: (d: any) => [d.attributes.LON, d.attributes.LAT],
        getRadius: CONFIG.weather.hurricanes.visualParams.forecastDotRadius + 2,
        getFillColor: (d: any) => {
          const category = d.attributes.SSNUM || 0;
          const color = getCategoryColor(category);
          return [color[0], color[1], color[2], 255];
        },
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        pickable: true,
        // NO getTooltip - let factory handle it
      });
    },
    'create SSNUM forecast dots layer',
    null
  );
}

/**
 * Create hurricane visualization layers - CONSOLIDATED SINGLE FUNCTION
 * 
 * This replaces the scattered approach of 6 separate files with one
 * cohesive function that creates all hurricane layers following the
 * same pattern as EarthquakeLayer and PlanesLayer.
 */
export function createHurricaneLayers(): Layer[] {
  // Get data from the centralized data manager
  const data = hurricaneDataManager.getData() as HurricaneLayerData;

  // Handle error state - show error message if API fails
  if (data.error) {
    return [createErrorLayer(data.error)];
  }

  // Create all layers - order matters for proper rendering
  const layers: Layer[] = [];

  // 1. Uncertainty cones (background)
  const coneLayer = createConeLayer(data.trajectories || []);
  if (coneLayer) layers.push(coneLayer);

  // 2. Track segments (middle layer)
  const trackLayer = createTrackLayer(data.processedStorms || []);
  if (trackLayer) layers.push(trackLayer);

  // 3. SSNUM trajectory paths
  const ssnumTrajectoryLayer = createSSNUMTrajectoryLayer((data as any).ssnumForecastPositions || []);
  if (ssnumTrajectoryLayer) layers.push(ssnumTrajectoryLayer);

  // 4. Historical position dots
  const historicalLayer = createHistoricalPositionLayer(data.processedStorms || []);
  if (historicalLayer) layers.push(historicalLayer);

  // 5. Forecast position dots  
  const forecastLayer = createForecastPositionLayer(data.processedStorms || []);
  if (forecastLayer) layers.push(forecastLayer);

  // 6. SSNUM forecast dots
  const ssnumDotsLayer = createSSNUMForecastDotsLayer((data as any).ssnumForecastPositions || []);
  if (ssnumDotsLayer) layers.push(ssnumDotsLayer);

  // 7. Current position icons (on top for best visibility)
  const currentLayer = createCurrentPositionLayer(data.processedStorms || []);
  if (currentLayer) layers.push(currentLayer);

  console.log('🌀 Total hurricane layers created:', layers.length);
  return layers;
}

/**
 * Check if hurricane layer is properly configured
 */
export function isHurricaneLayerConfigured(): boolean {
  return true; // Always available since we're using Esri's public service
}

/**
 * Hurricane Manager using the new HurricaneDataManager
 * 
 * Maintains backward compatibility with existing code that uses
 * the HurricaneManager class directly.
 */
export class HurricaneManager {
  /**
   * Start the manager (delegates to HurricaneDataManager.initialize)
   */
  public async start(): Promise<void> {
    await hurricaneDataManager.initialize();
  }

  /**
   * Stop the manager (delegates to HurricaneDataManager.destroy)
   */
  public stop(): void {
    hurricaneDataManager.destroy();
  }

  /**
   * Get current data
   */
  public getData() {
    return hurricaneDataManager.getData();
  }

  /**
   * Manual refresh
   */
  public async refresh(): Promise<void> {
    return hurricaneDataManager.refresh();
  }
}

/**
 * Export the singleton data manager instance for direct usage
 */
export { hurricaneDataManager };

/**
 * Export types for backward compatibility
 */
export type {
  HurricaneFeature,
  TrajectoryFeature,
  ColoredTrackSegment,
  ProcessedStorm,
  HurricaneLayerData
} from '../types/hurricane';
