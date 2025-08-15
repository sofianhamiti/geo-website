/**
 * Hurricane API Service
 * Clean data fetching service following established project patterns
 * Consolidates all hurricane data fetching logic from HurricaneLayer.tsx
 */

import { CONFIG } from '../config';
import { safeAsyncOperation } from '../utils/errorHandler';
import type {
  HurricaneFeature,
  TrajectoryFeature,
  ForecastTrackFeature,
  HurricaneApiResponse,
  HurricaneLayerData
} from '../types/hurricane';

/**
 * Hurricane API Service Class
 * Provides clean, centralized access to hurricane data from ArcGIS REST services
 */
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

  /**
   * Fetch hurricane forecast track centerlines
   * @returns Promise resolving to array of forecast track features
   */
  async fetchTracks(): Promise<ForecastTrackFeature[]> {
    return safeAsyncOperation(
      async () => {
        const url = `${this.serviceUrl}/${this.apiLayers.tracks}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          // Return empty array instead of throwing for tracks (non-critical)
          return [];
        }

        const data: HurricaneApiResponse = await response.json();
        
        if (data.error || !data.features || data.features.length === 0) {
          return [];
        }

        // Map raw API response to typed forecast track features
        const mappedFeatures = data.features.map((feature: any): ForecastTrackFeature => ({
          attributes: feature.attributes,
          geometry: {
            paths: feature.geometry?.paths || []
          }
        }));
        
        return mappedFeatures;
      },
      'fetch hurricane tracks',
      []
    );
  }

  /**
   * Fetch all hurricane data concurrently
   * Consolidates all three data fetches with Promise.all for optimal performance
   * @returns Promise resolving to complete hurricane layer data
   */
  async fetchAllData(): Promise<HurricaneLayerData> {
    return safeAsyncOperation(
      async () => {
        // Fetch all data types concurrently for better performance
        const [positions, trajectories, tracks] = await Promise.all([
          this.fetchPositions(),
          this.fetchTrajectories(),
          this.fetchTracks()
        ]);

        // Return structured data ready for layer consumption
        return {
          positions,
          trajectories,
          tracks,
          processedStorms: [], // Will be processed by layer logic
          lastUpdate: new Date(),
          error: null
        } as HurricaneLayerData;
      },
      'fetch all hurricane data',
      {
        positions: [],
        trajectories: [],
        tracks: [],
        processedStorms: [],
        lastUpdate: null,
        error: 'Failed to fetch hurricane data'
      }
    );
  }

}