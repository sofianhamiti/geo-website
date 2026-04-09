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

      this.updateInterval = setInterval(async () => {
        try {
          await this.config.updateFunction();
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
  }

  getData(): T {
    return this.config.getDataCache();
  }
}