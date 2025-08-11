/**
 * Weather Tile Downloader
 * Downloads precipitation tiles from OpenWeatherMap Weather Maps 1.0 API (Free Tier)
 */

import axios from 'axios';
import fs from 'fs-extra';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { format } from 'date-fns';
import path from 'path';

export interface DownloadConfig {
  apiKey: string;
  zoomLevel: number;
  outputDir: string;
  concurrentDownloads: number;
  retryAttempts: number;
  showProgress: boolean;
}

export interface DownloadResult {
  success: boolean;
  timestamp: string;
  tilesDownloaded: number;
  errors: string[];
  duration: number;
}

export class WeatherTileDownloader {
  private config: DownloadConfig;
  private axios;

  constructor(config: DownloadConfig) {
    this.config = config;
    this.axios = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Download all tiles for the specified zoom level
   */
  async downloadTiles(): Promise<DownloadResult> {
    const startTime = Date.now();
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm');
    const tilesDir = path.join(this.config.outputDir, timestamp);
    const errors: string[] = [];

    console.log(chalk.blue(`🌦️  Starting weather tile download (Level ${this.config.zoomLevel})`));
    
    try {
      // Ensure output directory exists
      await fs.ensureDir(tilesDir);

      // Calculate total tiles for this zoom level (2^zoom)^2
      const tilesPerSide = Math.pow(2, this.config.zoomLevel);
      const totalTiles = tilesPerSide * tilesPerSide;

      console.log(chalk.gray(`📦 Downloading ${totalTiles} tiles (${tilesPerSide}×${tilesPerSide} grid)`));

      // Setup progress bar
      let progressBar: cliProgress.SingleBar | null = null;
      if (this.config.showProgress) {
        progressBar = new cliProgress.SingleBar({
          format: chalk.cyan('Progress') + ' |{bar}| {percentage}% | {value}/{total} tiles | ETA: {eta}s',
          barCompleteChar: '█',
          barIncompleteChar: '░',
        }, cliProgress.Presets.shades_classic);
        progressBar.start(totalTiles, 0);
      }

      // Create download tasks with concurrency control
      const limit = pLimit(this.config.concurrentDownloads);
      let completed = 0;

      const downloadTasks = [];
      for (let x = 0; x < tilesPerSide; x++) {
        for (let y = 0; y < tilesPerSide; y++) {
          downloadTasks.push(
            limit(async () => {
              try {
                await this.downloadSingleTile(x, y, tilesDir);
                completed++;
                if (progressBar) {
                  progressBar.update(completed);
                }
              } catch (error) {
                const errorMsg = `Failed to download tile ${x},${y}`;
                errors.push(errorMsg);
                console.warn(chalk.yellow(`⚠️  ${errorMsg}`));
              }
            })
          );
        }
      }

      // Execute all downloads
      await Promise.allSettled(downloadTasks);

      if (progressBar) {
        progressBar.stop();
      }

      const duration = Date.now() - startTime;
      const tilesDownloaded = completed;

      if (errors.length === 0) {
        console.log(chalk.green(`✅ Successfully downloaded ${tilesDownloaded} tiles in ${Math.round(duration / 1000)}s`));
      } else {
        console.log(chalk.yellow(`⚠️  Downloaded ${tilesDownloaded}/${totalTiles} tiles with ${errors.length} errors`));
      }

      return {
        success: errors.length < totalTiles * 0.1, // Success if <10% failed
        timestamp,
        tilesDownloaded,
        errors,
        duration,
      };

    } catch (error) {
      console.error(chalk.red(`❌ Weather tile download failed`));
      return {
        success: false,
        timestamp,
        tilesDownloaded: 0,
        errors: ['Download initialization failed'],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Download a single tile
   */
  private async downloadSingleTile(x: number, y: number, outputDir: string): Promise<void> {
    // Use free Weather Maps 1.0 API - precipitation_new layer
    const tileUrl = `https://tile.openweathermap.org/map/precipitation_new/${this.config.zoomLevel}/${x}/${y}.png?appid=${this.config.apiKey}`;
    
    // Create directory structure: outputDir/x/y.png
    const xDir = path.join(outputDir, x.toString());
    await fs.ensureDir(xDir);
    
    const tilePath = path.join(xDir, `${y}.png`);

    // Download with retry logic
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.axios.get(tileUrl, {
          responseType: 'arraybuffer',
        });

        // Save tile data
        await fs.writeFile(tilePath, response.data);
        return; // Success!

      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error; // Final attempt failed
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  /**
   * Validate API key by testing a single tile download
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Test with free Weather Maps 1.0 API
      const testUrl = `https://tile.openweathermap.org/map/precipitation_new/0/0/0.png?appid=${this.config.apiKey}`;
      const response = await this.axios.head(testUrl);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
