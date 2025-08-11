/**
 * Weather Tile Service
 * Main service for coordinating weather tile downloads and serving
 */

import { WeatherTileDownloader, DownloadConfig } from './weatherTileDownloader';
import { WeatherTileManager } from './weatherTileManager';
import chalk from 'chalk';

export interface WeatherTileConfig {
  apiKey: string;
  zoomLevel: number;
  downloadInterval: number; // hours
  maxAge: number; // hours
  concurrentDownloads?: number;
  retryAttempts?: number;
  showProgress?: boolean;
  basePath?: string;
  outputDir?: string; // Alternative to basePath for compatibility
}

interface InternalWeatherTileConfig extends WeatherTileConfig {
  basePath: string; // Required internally
  concurrentDownloads: number;
  retryAttempts: number;
  showProgress: boolean;
}

export interface ServiceStatus {
  hasApiKey: boolean;
  hasTiles: boolean;
  currentTileset?: string;
  lastUpdate?: string;
  nextUpdate?: string;
  isDownloading: boolean;
}

export class WeatherTileService {
  private config: InternalWeatherTileConfig;
  private downloader: WeatherTileDownloader;
  private manager: WeatherTileManager;
  private downloadTimer?: NodeJS.Timeout;
  private isDownloading = false;

  constructor(config: WeatherTileConfig) {
    // Set defaults for optional properties
    const basePath = config.outputDir || config.basePath || './public/weather-tiles';
    this.config = {
      ...config,
      basePath,
      concurrentDownloads: config.concurrentDownloads ?? 5,
      retryAttempts: config.retryAttempts ?? 3,
      showProgress: config.showProgress ?? true,
    };
    
    // Initialize components
    const downloadConfig: DownloadConfig = {
      apiKey: this.config.apiKey,
      zoomLevel: this.config.zoomLevel,
      outputDir: this.config.basePath,
      concurrentDownloads: this.config.concurrentDownloads,
      retryAttempts: this.config.retryAttempts,
      showProgress: this.config.showProgress,
    };

    this.downloader = new WeatherTileDownloader(downloadConfig);
    this.manager = new WeatherTileManager(this.config.basePath);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log(chalk.blue('🌦️  Initializing Weather Tile Service...'));

    // Ensure base directory exists
    await this.manager.ensureBaseDirectory();

    // Check API key (non-blocking)
    if (!this.config.apiKey || this.config.apiKey === 'YOUR_API_KEY_HERE') {
      console.warn(chalk.yellow('⚠️  No OpenWeatherMap API key configured - tiles will not be downloaded'));
      return;
    }

    console.log(chalk.green('✅ API key OK'));

    // Check if we need to download tiles
    const needsDownload = await this.shouldDownloadTiles();
    
    if (needsDownload) {
      console.log(chalk.yellow('⏳ Starting initial weather tile download...'));
      await this.downloadTiles();
    } else {
      const current = await this.manager.getCurrentTileset();
      console.log(chalk.green(`✅ Using existing weather tiles: ${current}`));
    }

    // Setup periodic downloads
    this.startPeriodicDownloads();
  }

  /**
   * Start periodic tile downloads
   */
  private startPeriodicDownloads(): void {
    const intervalMs = this.config.downloadInterval * 60 * 60 * 1000; // hours to milliseconds

    this.downloadTimer = setInterval(async () => {
      console.log(chalk.blue('⏰ Scheduled weather tile update...'));
      await this.downloadTiles();
    }, intervalMs);

    const nextUpdate = new Date(Date.now() + intervalMs);
    console.log(chalk.gray(`⏰ Next weather update: ${nextUpdate.toLocaleString()}`));
  }

  /**
   * Download tiles and update metadata
   */
  async downloadTiles(): Promise<boolean> {
    if (this.isDownloading) {
      console.log(chalk.yellow('⏳ Download already in progress...'));
      return false;
    }

    this.isDownloading = true;

    try {
      const result = await this.downloader.downloadTiles();
      
      // Update metadata
      await this.manager.updateMetadata(
        result.timestamp, 
        result.tilesDownloaded, 
        result.success
      );

      // Cleanup old tilesets
      await this.manager.cleanupOldTilesets(this.config.maxAge, 2);

      return result.success;

    } catch (error) {
      console.error(chalk.red(`❌ Download failed: ${error}`));
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Check if we should download new tiles
   */
  private async shouldDownloadTiles(): Promise<boolean> {
    // No tiles exist
    if (!await this.manager.hasTilesets()) {
      return true;
    }

    // Tiles are stale
    if (!await this.manager.isTilesetFresh(this.config.downloadInterval)) {
      return true;
    }

    return false;
  }

  /**
   * Download current tiles (for CI/build scripts)
   * Simpler version that just downloads without periodic setup
   */
  async downloadCurrentTiles(): Promise<boolean> {
    if (this.isDownloading) {
      console.log(chalk.yellow('⏳ Download already in progress...'));
      return false;
    }

    this.isDownloading = true;

    try {
      console.log(chalk.blue('📡 Downloading current weather tiles...'));
      const result = await this.downloader.downloadTiles();
      
      if (result.success) {
        console.log(chalk.green(`✅ Downloaded ${result.tilesDownloaded} weather tiles`));
        
        // Update metadata
        await this.manager.updateMetadata(
          result.timestamp,
          result.tilesDownloaded,
          result.success
        );
      } else {
        console.log(chalk.yellow('⚠️ Weather tile download completed with warnings'));
      }

      return result.success;

    } catch (error) {
      console.error(chalk.red(`❌ Download failed: ${error}`));
      return false;
    } finally {
      this.isDownloading = false;
    }
  }


  /**
   * Get current tile URL for the frontend
   */
  async getTileUrl(): Promise<string | null> {
    const currentTileset = await this.manager.getCurrentTileset();
    
    if (!currentTileset) {
      return null;
    }

    return `/weather-tiles/${currentTileset}/{x}/{y}.png`;
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<ServiceStatus> {
    const metadata = await this.manager.getMetadata();
    
    let nextUpdate: string | undefined;
    if (this.downloadTimer) {
      const intervalMs = this.config.downloadInterval * 60 * 60 * 1000;
      nextUpdate = new Date(Date.now() + intervalMs).toISOString();
    }

    return {
      hasApiKey: this.config.apiKey !== 'YOUR_API_KEY_HERE',
      hasTiles: await this.manager.hasTilesets(),
      currentTileset: metadata.currentTileset,
      lastUpdate: metadata.lastUpdate,
      nextUpdate,
      isDownloading: this.isDownloading,
    };
  }

  /**
   * Force download new tiles
   */
  async forceDownload(): Promise<boolean> {
    console.log(chalk.blue('🔄 Forcing weather tile download...'));
    return await this.downloadTiles();
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.downloadTimer) {
      clearInterval(this.downloadTimer);
      this.downloadTimer = undefined;
      console.log(chalk.gray('⏹️  Weather tile service stopped'));
    }
  }

  /**
   * Get tile statistics
   */
  async getTileStats(): Promise<any> {
    const tilesets = await this.manager.getAllTilesets();
    const totalTiles = tilesets.reduce((sum, tileset) => sum + tileset.tilesCount, 0);
    
    return {
      totalTilesets: tilesets.length,
      totalTiles,
      currentTileset: await this.manager.getCurrentTileset(),
      oldestTileset: tilesets[tilesets.length - 1]?.timestamp,
      newestTileset: tilesets[0]?.timestamp,
    };
  }
}
