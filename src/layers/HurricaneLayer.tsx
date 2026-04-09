import { PolygonLayer, PathLayer, ScatterplotLayer, IconLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../config';
import { hurricaneDataManager } from '../services/HurricaneDataManager';
import { safeSyncOperation } from '../utils/errorHandler';
import { getCategoryColor } from '../utils/IconFactory';
import type {
  TrajectoryFeature,
  ProcessedStorm,
  HurricaneLayerData
} from '../types/hurricane';


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


const CYCLONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><path fill="COLOR" d="M22.6521,4.1821l-2.177,2.5142L19.0713,8.3174,20.7864,9.605A7.9361,7.9361,0,0,1,23.9963,16l.0008.0576.0017.0415c.018.4317.2412,10.1113-14.6538,11.7222l2.18-2.5176,1.4039-1.6211L11.2139,22.395A7.9361,7.9361,0,0,1,8.0037,16l-.0008-.0576-.0017-.0415C7.9832,15.47,7.7605,5.8071,22.6521,4.1821M24.9978,2c-.0164,0-.0327,0-.0493.001C5.2532,2.9146,6.0037,16,6.0037,16a9.975,9.975,0,0,0,4.0095,7.9946L6.2368,28.3555A1.0044,1.0044,0,0,0,7.0022,30c.0164,0,.0327,0,.0493-.001C26.7468,29.0854,25.9963,16,25.9963,16a9.9756,9.9756,0,0,0-4.0092-7.9946l3.7761-4.3609A1.0044,1.0044,0,0,0,24.9978,2Z"/></svg>`;

function buildCycloneIcon(category: number): string {
  const color = getCategoryColor(category);
  const hex = `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
  return `data:image/svg+xml;base64,${btoa(CYCLONE_SVG.replace('COLOR', hex))}`;
}

// Pre-build icons for categories 0-5
const CYCLONE_ICONS: Record<number, string> = {};
for (let cat = 0; cat <= 5; cat++) {
  CYCLONE_ICONS[cat] = buildCycloneIcon(cat);
}

function getHurricaneSize(category: number): number {
  // TS=28px, Cat1=34px, Cat2=40px, Cat3=48px, Cat4=56px, Cat5=66px
  return 28 + category * 7.5;
}

/**
 * Create rotating cyclone icon for current hurricane positions
 */
function createCurrentPositionLayers(processedStorms: readonly ProcessedStorm[], rotationAngle: number): Layer[] {
  const layers: Layer[] = [];

  if (!processedStorms || processedStorms.length === 0) return layers;

  const currentPositions = processedStorms
    .filter(storm => storm.current)
    .map(storm => ({ ...storm.current!, stormName: storm.stormName, currentCategory: storm.currentCategory }));

  if (currentPositions.length === 0) return layers;

  // Rotating cyclone icon
  layers.push(new IconLayer({
    id: 'hurricane-positions',
    data: currentPositions,
    getPosition: (d: any) => [d.geometry.x, d.geometry.y],
    getIcon: (d: any) => {
      const cat = Math.max(0, Math.min(5, d.attributes.SS || 0));
      return {
        url: CYCLONE_ICONS[cat],
        width: 128,
        height: 128,
        anchorX: 64,
        anchorY: 64,
      };
    },
    getSize: (d: any) => getHurricaneSize(d.attributes.SS || 0),
    getAngle: rotationAngle,
    sizeUnits: 'pixels',
    pickable: true,
    alphaCutoff: -1,
  }));

  return layers;
}

/**
 * Create per-storm trajectory paths — one PathLayer per storm to prevent cross-storm links
 */
function createStormTrackLayers(processedStorms: readonly ProcessedStorm[]): Layer[] {
  const layers: Layer[] = [];
  if (!processedStorms || processedStorms.length === 0) return layers;

  for (const storm of processedStorms) {
    // Build full path: historical positions → current → forecast
    const path: [number, number][] = [];

    for (const pos of storm.historical) {
      path.push([pos.geometry.x, pos.geometry.y]);
    }
    if (storm.current) {
      path.push([storm.current.geometry.x, storm.current.geometry.y]);
    }
    for (const pos of storm.forecast) {
      path.push([pos.geometry.x, pos.geometry.y]);
    }

    if (path.length < 2) continue;

    const color = getCategoryColor(storm.currentCategory);

    layers.push(new PathLayer({
      id: `hurricane-track-${storm.stormId}`,
      data: [{ path }],
      getPath: (d: any) => d.path,
      getColor: [color[0], color[1], color[2], 180],
      getWidth: 2,
      widthUnits: 'pixels',
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }));
  }

  return layers;
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

export function createHurricaneLayers(rotationAngle: number = 0): Layer[] {
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

  // 2. Per-storm trajectory paths (one PathLayer per storm — no cross-storm links)
  layers.push(...createStormTrackLayers(data.processedStorms || []));

  // 3. SSNUM forecast dots
  const ssnumDotsLayer = createSSNUMForecastDotsLayer((data as any).ssnumForecastPositions || []);
  if (ssnumDotsLayer) layers.push(ssnumDotsLayer);

  // 4. Current position — rotating cyclone icon (on top)
  layers.push(...createCurrentPositionLayers(data.processedStorms || [], rotationAngle));

  return layers;
}

export class HurricaneManager {
  public async start(): Promise<void> {
    await hurricaneDataManager.initialize();
  }

  public stop(): void {
    hurricaneDataManager.destroy();
  }

  public getData() {
    return hurricaneDataManager.getData();
  }

  public async refresh(): Promise<void> {
    return hurricaneDataManager.refresh();
  }
}

export { hurricaneDataManager };
