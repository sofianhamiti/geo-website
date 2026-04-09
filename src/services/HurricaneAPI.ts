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
  private readonly apiLayers: typeof CONFIG.weather.hurricanes.apiLayers;

  constructor() {
    this.serviceUrl = CONFIG.weather.hurricanes.serviceUrl;
    this.apiLayers = CONFIG.weather.hurricanes.apiLayers;
  }

  /**
   * Fetch hurricane position data (current, historical, and forecast positions)
   * @returns Promise resolving to array of hurricane position features
   */
  async fetchPositions(): Promise<HurricaneFeature[]> {
    return safeAsyncOperation(
      async () => {
        const url = `${this.serviceUrl}/${this.apiLayers.positions}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Hurricane positions API error: ${response.status} ${response.statusText}`);
        }

        const data: HurricaneApiResponse = await response.json();
        
        if (data.error) {
          throw new Error(`API Error: ${data.error.message}`);
        }
        
        if (!data.features || data.features.length === 0) {
          return [];
        }

        // Map raw API response to typed hurricane features
        const mappedFeatures = data.features.map((feature: any): HurricaneFeature => ({
          attributes: feature.attributes,
          geometry: {
            x: feature.geometry?.x || feature.geometry?.longitude || 0,
            y: feature.geometry?.y || feature.geometry?.latitude || 0
          }
        }));
        
        return mappedFeatures;
      },
      'fetch hurricane positions',
      []
    );
  }

  /**
   * Fetch hurricane trajectory cone data (uncertainty cones)
   * Tries multiple layers as different services put cones in different layer numbers
   * @returns Promise resolving to array of trajectory cone features
   */
  async fetchTrajectories(): Promise<TrajectoryFeature[]> {
    return safeAsyncOperation(
      async () => {
        const layersToTry = this.apiLayers.trajectories;
        
        for (const layerNum of layersToTry) {
          try {
            const url = `${this.serviceUrl}/${layerNum}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json`;
            const response = await fetch(url);
            
            if (!response.ok) {
              continue; // Try next layer
            }

            const data: HurricaneApiResponse = await response.json();
            
            if (data.error) {
              continue; // Try next layer
            }
            
            if (data.features && data.features.length > 0) {
              const mappedFeatures = data.features
                .map((feature: any): TrajectoryFeature | null => {
                  if (!feature.geometry || !feature.geometry.rings || feature.geometry.rings.length === 0) {
                    return null;
                  }
                  
                  return {
                    attributes: feature.attributes,
                    geometry: {
                      rings: feature.geometry.rings
                    }
                  };
                })
                .filter((feature): feature is TrajectoryFeature => feature !== null);
                
              if (mappedFeatures.length > 0) {
                return mappedFeatures;
              }
            }
          } catch (error) {
            // Continue to next layer on error
            continue;
          }
        }
        
        // No trajectory cones found in any layer
        return [];
      },
      'fetch hurricane trajectories',
      []
    );
  }

  async fetchAllData(): Promise<HurricaneLayerData> {
    return safeAsyncOperation(
      async () => {
        const [positions, trajectories] = await Promise.all([
          this.fetchPositions(),
          this.fetchTrajectories()
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
   * Fetch Layer 0 data for SSNUM-based trajectory coloring including current positions
   * Layer 0 contains current and forecast positions with SSNUM categories
   * @returns Promise resolving to array of Layer 0 features with SSNUM data
   */
  async fetchForecastPositionsWithSSNUM(): Promise<any[]> {
    return safeAsyncOperation(
      async () => {
        const url = `${this.serviceUrl}/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          return []; // Return empty array on error, don't break existing functionality
        }

        const data: HurricaneApiResponse = await response.json();
        
        if (data.error || !data.features) {
          return [];
        }

        // Include current (TAU=0) AND forecast (TAU>0) positions to eliminate gaps
        return data.features.filter((feature: any) => {
          const attrs = feature.attributes;
          return attrs.TAU !== null && attrs.TAU !== undefined &&
                 attrs.SSNUM !== null && attrs.SSNUM !== undefined &&
                 attrs.LAT && attrs.LON;
        });
      },
      'fetch current and forecast positions with SSNUM',
      []
    );
  }

}
