/**
 * Base Data Manager - Consolidated pattern for ISS, Hurricane, and Earthquake managers
 * Reduces code duplication by abstracting common manager functionality
 */

export interface DataManagerConfig<T> {
  updateFunction: () => Promise<void>;
  updateIntervalMs: number;
  getDataCache: () => T;
  initializeFunction?: () => void | Promise<void>;
  onUpdateSuccess?: () => void;
}

export class BaseDataManager<T> {
  private updateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private config: DataManagerConfig<T>;
  private lastFetchTime: Date | null = null;

  constructor(config: DataManagerConfig<T>) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Run optional initialization function first
      if (this.config.initializeFunction) {
        await this.config.initializeFunction();
      }
      
      // Initial data fetch
      await this.config.updateFunction();
      this.lastFetchTime = new Date();
      
      // Set up automatic updates
      this.updateInterval = setInterval(async () => {
        try {
          await this.config.updateFunction();
          this.lastFetchTime = new Date();
          this.config.onUpdateSuccess?.();
        } catch (error) {
          // Silent error handling - errors are stored in cache
        }
      }, this.config.updateIntervalMs);
      
      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
    this.lastFetchTime = null;
  }

  getData(): T {
    return this.config.getDataCache();
  }

  getNextUpdateTime(): Date | null {
    if (!this.lastFetchTime) return null;
    return new Date(this.lastFetchTime.getTime() + this.config.updateIntervalMs);
  }

  getLastFetchTime(): Date | null {
    return this.lastFetchTime;
  }

  isManagerInitialized(): boolean {
    return this.isInitialized;
  }
}