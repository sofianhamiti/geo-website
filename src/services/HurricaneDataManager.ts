import { BaseDataManager } from '../utils/BaseDataManager';
import { CONFIG } from '../config';
import { HurricaneAPI } from './HurricaneAPI';
import { HurricaneProcessor } from '../utils/HurricaneProcessor';
import type { HurricaneLayerData } from '../types/hurricane';

let hurricaneDataCache: HurricaneLayerData & { ssnumForecastPositions?: any[] } = {
  positions: [],
  trajectories: [],
  processedStorms: [],
  ssnumForecastPositions: [],
  lastUpdate: null,
  error: null,
};

class HurricaneDataManager extends BaseDataManager<HurricaneLayerData> {
  private readonly hurricaneAPI: HurricaneAPI;
  private readonly hurricaneProcessor: HurricaneProcessor;

  constructor() {
    const updateIntervalMs = CONFIG.weather.hurricanes.refreshIntervalMinutes * 60 * 1000;
    
    super({
      updateFunction: () => this.updateHurricaneData(),
      updateIntervalMs,
      getDataCache: () => hurricaneDataCache,
    });

    this.hurricaneAPI = new HurricaneAPI();
    this.hurricaneProcessor = new HurricaneProcessor();
  }

  private async updateHurricaneData(): Promise<void> {
    try {
      const [rawData, ssnumData] = await Promise.all([
        this.hurricaneAPI.fetchAllData(),
        this.hurricaneAPI.fetchForecastPositionsWithSSNUM()
      ]);

      const processedStorms = this.hurricaneProcessor.processRawData(rawData.positions);

      hurricaneDataCache = {
        positions: rawData.positions,
        trajectories: rawData.trajectories,
        processedStorms,
        ssnumForecastPositions: ssnumData,
        lastUpdate: new Date(),
        error: null,
      };
    } catch (error) {
      hurricaneDataCache = {
        ...hurricaneDataCache,
        error: 'Failed to update hurricane data',
        lastUpdate: new Date(),
      };
    }
  }

  public getData(): HurricaneLayerData {
    return hurricaneDataCache;
  }

  public async refresh(): Promise<void> {
    return this.updateHurricaneData();
  }
}

export const hurricaneDataManager = new HurricaneDataManager();
