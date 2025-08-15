/**
 * Hurricane Data Manager
 * 
 * Consolidated data manager using BaseDataManager pattern for hurricane visualization.
 * Coordinates HurricaneAPI and HurricaneProcessor services to provide clean data
 * to hurricane layer components with proper caching and error handling.
 * 
 * Features:
 * - Extends BaseDataManager<HurricaneLayerData> following established patterns
 * - Uses HurricaneAPI service for data fetching  
 * - Uses HurricaneProcessor for data transformation
 * - Handles error states and data cache management
 * - Provides singleton instance for consistent usage across the app
 */

import { BaseDataManager } from '../utils/BaseDataManager';
import { CONFIG } from '../config';
import { HurricaneAPI } from './HurricaneAPI';
import { HurricaneProcessor } from '../utils/HurricaneProcessor';
import type { HurricaneLayerData } from '../types/hurricane';

/**
 * Hurricane data cache - centralized data storage
 */
let hurricaneDataCache: HurricaneLayerData = {
  positions: [],
  trajectories: [],
  tracks: [],
  processedStorms: [],
  lastUpdate: null,
  error: null,
};

/**
 * Hurricane Data Manager Class
 * 
 * Manages hurricane data lifecycle including fetching, processing, caching,
 * and error handling. Uses the established BaseDataManager pattern for
 * consistency with other data managers in the application.
 */
export class HurricaneDataManager extends BaseDataManager<HurricaneLayerData> {
  private readonly hurricaneAPI: HurricaneAPI;
  private readonly hurricaneProcessor: HurricaneProcessor;

  constructor() {
    const updateIntervalMs = CONFIG.weather.hurricanes.refreshIntervalMinutes * 60 * 1000;
    
    super({
      updateFunction: () => this.updateHurricaneData(),
      updateIntervalMs,
      getDataCache: () => hurricaneDataCache,
      onUpdateSuccess: () => {
        // Optional: Add any post-update logic here
        // Hurricane data updated successfully
      }
    });

    this.hurricaneAPI = new HurricaneAPI();
    this.hurricaneProcessor = new HurricaneProcessor();
  }

  /**
   * Update hurricane data from API and process it
   *
   * This is the core update function that:
   * 1. Fetches raw data from HurricaneAPI
   * 2. Processes positions using HurricaneProcessor
   * 3. Updates the cache with processed data
   * 4. Handles errors gracefully
   *
   * @private
   */
  private async updateHurricaneData(): Promise<void> {
    try {
      // Step 1: Fetch raw data from API
      const rawData = await this.hurricaneAPI.fetchAllData();
      
      // DEBUG: Check if we have any forecast positions at all
      const forecastPositions = rawData.positions.filter((p: any) => p.attributes?.FCST_HR > 0);
      console.log('🌀 HurricaneDataManager - Fetched data:', {
        totalPositions: rawData.positions.length,
        forecastPositions: forecastPositions.length,
        tracks: rawData.tracks.length,
        trajectories: rawData.trajectories.length,
        sampleForecastPosition: forecastPositions[0],
        sampleTrack: rawData.tracks[0]
      });
      
      if (forecastPositions.length > 0) {
        console.log('🌀 Forecast position fields:', Object.keys(forecastPositions[0].attributes));
        console.log('🌀 Forecast SS values:', forecastPositions.slice(0, 5).map((p: any) => ({
          FCST_HR: p.attributes.FCST_HR,
          SS: p.attributes.SS,
          INTENSITY: p.attributes.INTENSITY,
          STORMNAME: p.attributes.STORMNAME
        })));
      }
      
      // Step 2: Process positions into storms using HurricaneProcessor
      const processedStorms = this.hurricaneProcessor.processRawData(rawData.positions);
      
      // Step 3: Update cache with processed data
      hurricaneDataCache = {
        positions: rawData.positions,
        trajectories: rawData.trajectories,
        tracks: rawData.tracks,
        processedStorms,
        lastUpdate: new Date(),
        error: null, // Clear any previous errors
      };
    } catch (error) {
      // On error, update cache with error state but preserve existing data
      console.error('Failed to update hurricane data:', error);
      hurricaneDataCache = {
        ...hurricaneDataCache,
        error: 'Failed to update hurricane data',
        lastUpdate: new Date(), // Still update timestamp to prevent excessive retries
      };
    }
  }

  /**
   * Get current hurricane data cache
   * 
   * Provides read-only access to the current hurricane data including
   * positions, trajectories, tracks, processed storms, and error state.
   * 
   * @returns Current hurricane layer data
   */
  public getData(): HurricaneLayerData {
    return hurricaneDataCache;
  }

  /**
   * Get the last successful data update timestamp
   * 
   * @returns Date of last successful update or null if never updated
   */
  public getLastUpdate(): Date | null {
    return hurricaneDataCache.lastUpdate;
  }

  /**
   * Check if there's an active error state
   * 
   * @returns True if there's an error, false otherwise
   */
  public hasError(): boolean {
    return hurricaneDataCache.error !== null;
  }

  /**
   * Get current error message if any
   * 
   * @returns Error message or null if no error
   */
  public getError(): string | null {
    return hurricaneDataCache.error;
  }

  /**
   * Manual data refresh
   *
   * Triggers an immediate data update, useful for user-initiated refreshes
   * or when the application needs fresh data outside the normal update cycle.
   *
   * @returns Promise that resolves when update is complete
   */
  public async refresh(): Promise<void> {
    return this.updateHurricaneData();
  }
}

/**
 * Singleton instance of Hurricane Data Manager
 *
 * Provides a single, consistent instance across the application to ensure
 * data consistency and prevent multiple data fetching operations.
 */
export const hurricaneDataManager = new HurricaneDataManager();
