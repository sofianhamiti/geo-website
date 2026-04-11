import { CONFIG } from '../config';
import { safeAsyncOperation } from '../utils/errorHandler';
import type {
  HurricaneFeature,
  TrajectoryFeature,
  HurricaneApiResponse,
  HurricaneLayerData
} from '../types/hurricane';

export class HurricaneAPI {
  private readonly serviceUrl: string;
  private readonly fallbackServiceUrl: string;
  private readonly fallbackPositionsLayer: number;
  private readonly apiTables: typeof CONFIG.weather.hurricanes.apiTables;

  constructor() {
    this.serviceUrl = CONFIG.weather.hurricanes.serviceUrl;
    this.fallbackServiceUrl = CONFIG.weather.hurricanes.fallbackServiceUrl;
    this.fallbackPositionsLayer = CONFIG.weather.hurricanes.fallbackPositionsLayer;
    this.apiTables = CONFIG.weather.hurricanes.apiTables;
  }

  /**
   * Query a table/layer from any FeatureServer URL
   */
  private async queryEndpoint(baseUrl: string, layerId: number, where: string = '1=1'): Promise<any[]> {
    const url = `${baseUrl}/${layerId}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&f=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hurricane API error: ${response.status} ${response.statusText}`);
    }

    const data: HurricaneApiResponse = await response.json();

    if (data.error) {
      throw new Error(`API Error: ${data.error.message}`);
    }

    return data.features ? [...data.features] : [];
  }

  /**
   * Query a table from the primary FeatureServer
   */
  private async queryTable(tableId: number, where: string = '1=1'): Promise<any[]> {
    return this.queryEndpoint(this.serviceUrl, tableId, where);
  }

  /**
   * Fetch all hurricane positions (observed + forecast) merged into HurricaneFeature format.
   *
   * Table 1 (Observed_Positions): 1 current position per storm (TAU=-1)
   * Table 2 (Forecast): multiple forecast positions per storm with SSNUM
   *
   * Maps both into a unified HurricaneFeature[] compatible with the processor.
   */
  async fetchPositions(): Promise<HurricaneFeature[]> {
    return safeAsyncOperation(
      async () => {
        const [observed, forecasts] = await Promise.all([
          this.queryTable(this.apiTables.observedPositions),
          this.queryTable(this.apiTables.forecast),
        ]);

        const features: HurricaneFeature[] = [];

        // Try fallback API for historical positions (Active_Hurricanes_v1)
        // This service has full track history when its layers are active
        let fallbackPositions: any[] = [];
        try {
          fallbackPositions = await this.queryEndpoint(
            this.fallbackServiceUrl,
            this.fallbackPositionsLayer,
          );
        } catch {
          // Fallback unavailable — continue with primary data only
        }

        // If fallback has data, use it as the primary source (it has full history + forecasts)
        if (fallbackPositions.length > 0) {
          return fallbackPositions.map((feature: any): HurricaneFeature => ({
            attributes: {
              STORMNAME: feature.attributes.STORMNAME || '',
              STORMID: feature.attributes.STORMID || '',
              LAT: feature.attributes.LAT || feature.geometry?.y || 0,
              LON: feature.attributes.LON || feature.geometry?.x || 0,
              INTENSITY: feature.attributes.INTENSITY || 0,
              MSLP: feature.attributes.MSLP || 0,
              STORMTYPE: feature.attributes.STORMTYPE || '',
              BASIN: feature.attributes.BASIN || '',
              DTG: feature.attributes.DTG || 0,
              SS: feature.attributes.SS || 0,
              FCST_HR: feature.attributes.FCST_HR || 0,
            },
            geometry: {
              x: feature.geometry?.x || feature.attributes.LON || 0,
              y: feature.geometry?.y || feature.attributes.LAT || 0,
            },
          }));
        }

        // Fallback unavailable — use primary API (current + forecast only)

        // Map observed positions (current) — FCST_HR = 0
        for (const f of observed) {
          const attrs = f.attributes;
          if (!attrs || attrs.LAT == null || attrs.LON == null) continue;

          features.push({
            attributes: {
              STORMNAME: attrs.STORMNAME || '',
              STORMID: attrs.STORMID || '',
              LAT: attrs.LAT,
              LON: attrs.LON,
              INTENSITY: attrs.INTENSITY || 0,
              MSLP: attrs.MSLP || 0,
              STORMTYPE: attrs.STORMTYPE || '',
              BASIN: attrs.BASIN || '',
              DTG: typeof attrs.DTG === 'string' ? new Date(attrs.DTG).getTime() : (attrs.DTG || 0),
              SS: attrs.SS || 0,
              FCST_HR: 0, // Current observed position
            },
            geometry: {
              x: attrs.LON,
              y: attrs.LAT,
            },
          });
        }

        // Group forecasts by storm to assign incrementing FCST_HR
        const forecastsByStorm: Record<string, any[]> = {};
        for (const f of forecasts) {
          const attrs = f.attributes;
          if (!attrs || attrs.LAT == null || attrs.LON == null) continue;
          const key = attrs.STORMNAME || 'unknown';
          if (!forecastsByStorm[key]) forecastsByStorm[key] = [];
          forecastsByStorm[key].push(attrs);
        }

        // Map forecast positions — FCST_HR incrementing from 12
        for (const [, stormForecasts] of Object.entries(forecastsByStorm)) {
          // Find matching STORMID from observed data
          const observedMatch = observed.find(
            (o) => o.attributes?.STORMNAME === stormForecasts[0]?.STORMNAME
          );
          const stormId = observedMatch?.attributes?.STORMID ||
            `${(stormForecasts[0].BASIN || 'xx').toLowerCase()}${String(stormForecasts[0].STORMNUM || 0).padStart(2, '0')}2026`;

          for (let i = 0; i < stormForecasts.length; i++) {
            const attrs = stormForecasts[i];
            features.push({
              attributes: {
                STORMNAME: attrs.STORMNAME || '',
                STORMID: stormId,
                LAT: attrs.LAT,
                LON: attrs.LON,
                INTENSITY: attrs.MAXWIND || 0,
                MSLP: attrs.MSLP || 0,
                STORMTYPE: attrs.STORMTYPE || attrs.TCDVLP || '',
                BASIN: attrs.BASIN || '',
                DTG: attrs.ADVDATE || 0,
                SS: attrs.SSNUM || 0,
                FCST_HR: (i + 1) * 12, // 12, 24, 36, 48, ...
              },
              geometry: {
                x: attrs.LON,
                y: attrs.LAT,
              },
            });
          }
        }

        return features;
      },
      'fetch hurricane positions',
      []
    );
  }

  /**
   * Fetch hurricane trajectory cones.
   * The primary API doesn't provide cones, so try the fallback (Active_Hurricanes_v1)
   * which has them on layers 0, 3, 4, 5 when available.
   */
  async fetchTrajectories(): Promise<TrajectoryFeature[]> {
    const layersToTry = [0, 3, 4, 5];

    for (const layerNum of layersToTry) {
      try {
        const features = await this.queryEndpoint(this.fallbackServiceUrl, layerNum);

        if (features.length > 0) {
          const mapped = features
            .filter((f: any) => f.geometry?.rings?.length > 0)
            .map((f: any): TrajectoryFeature => ({
              attributes: f.attributes,
              geometry: { rings: f.geometry.rings },
            }));

          if (mapped.length > 0) return mapped;
        }
      } catch {
        continue;
      }
    }

    return [];
  }

  async fetchAllData(): Promise<HurricaneLayerData> {
    return safeAsyncOperation(
      async () => {
        const [positions, trajectories] = await Promise.all([
          this.fetchPositions(),
          this.fetchTrajectories(),
        ]);

        return {
          positions,
          trajectories,
          processedStorms: [],
          lastUpdate: new Date(),
          error: null
        } as HurricaneLayerData;
      },
      'fetch all hurricane data',
      {
        positions: [],
        trajectories: [],
        processedStorms: [],
        lastUpdate: null,
        error: 'Failed to fetch hurricane data'
      }
    );
  }

  /**
   * Fetch forecast positions with SSNUM categories for forecast dot coloring.
   * Queries the Forecast table (table 2) which has SSNUM directly.
   */
  async fetchForecastPositionsWithSSNUM(): Promise<any[]> {
    return safeAsyncOperation(
      async () => {
        const forecasts = await this.queryTable(this.apiTables.forecast);

        return forecasts
          .filter((f: any) => {
            const attrs = f.attributes;
            return attrs &&
              attrs.SSNUM != null &&
              attrs.LAT != null &&
              attrs.LON != null;
          })
          .map((f: any) => ({
            attributes: {
              ...f.attributes,
              TAU: f.attributes.FCSTPRD || 12, // Ensure TAU is set for downstream filtering
            },
          }));
      },
      'fetch forecast positions with SSNUM',
      []
    );
  }
}
