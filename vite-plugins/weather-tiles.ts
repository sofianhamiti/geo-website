/**
 * Vite Weather Tiles Plugin
 * Integrates weather tile downloading into Vite dev server
 */

import { Plugin, loadEnv } from 'vite';
import { WeatherTileService, WeatherTileConfig } from '../src/services/weatherTileService';
import path from 'path';
import chalk from 'chalk';

export interface WeatherTilesPluginOptions {
  apiKey?: string;
  zoomLevel?: number;
  downloadInterval?: number; // hours
  maxAge?: number; // hours
  concurrentDownloads?: number;
  retryAttempts?: number;
  showProgress?: boolean;
  basePath?: string;
  enabled?: boolean;
}

export function weatherTilesPlugin(options: WeatherTilesPluginOptions = {}): Plugin {
  let weatherService: WeatherTileService | null = null;
  let config: WeatherTileConfig;

  const enabled = options.enabled ?? true;

  return {
    name: 'weather-tiles',
    
    configResolved(resolvedConfig) {
      // Load environment variables using Vite's loadEnv
      const env = loadEnv(resolvedConfig.mode, process.cwd(), '');
      const apiKey = options.apiKey || env.VITE_OPENWEATHER_API_KEY || resolvedConfig.env.VITE_OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE';
      
      config = {
        ...options,
        apiKey,
        zoomLevel: options.zoomLevel || 4,
        downloadInterval: options.downloadInterval || 12, // 12 hours
        maxAge: options.maxAge || 24, // 24 hours
        concurrentDownloads: options.concurrentDownloads || 5,
        retryAttempts: options.retryAttempts || 3,
        showProgress: options.showProgress ?? true,
        basePath: options.basePath || path.join(process.cwd(), 'public', 'weather-tiles'),
      };
    },
    
    async buildStart() {
      if (!enabled) {
        console.log(chalk.gray('⚠️  Weather tiles plugin disabled'));
        return;
      }

      // Use the config that was already properly set in configResolved()
      // Don't try to re-read environment variables here - Vite doesn't expose VITE_ vars to process.env
      
      console.log(chalk.blue('🌦️  Weather Tiles Plugin initialized'));
      
      // Safe API key display with null check
      const apiKeyDisplay = config?.apiKey && config.apiKey !== 'YOUR_API_KEY_HERE' 
        ? `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}`
        : 'Not configured';
        
      console.log(chalk.gray(`   API Key: ${apiKeyDisplay}`));
      console.log(chalk.gray(`   Zoom Level: ${config.zoomLevel} (${Math.pow(2, config.zoomLevel)}×${Math.pow(2, config.zoomLevel)} = ${Math.pow(4, config.zoomLevel)} tiles)`));
      console.log(chalk.gray(`   Update Interval: ${config.downloadInterval} hours`));
      console.log(chalk.gray(`   Base Path: ${config.basePath}`));

      // Initialize weather service
      weatherService = new WeatherTileService(config);
      
      try {
        await weatherService.initialize();
      } catch (error) {
        console.error(chalk.red(`❌ Failed to initialize weather tiles: ${error}`));
      }
    },

    configureServer(server) {
      if (!enabled || !weatherService) return;

      // Add middleware for weather tile status endpoint
      server.middlewares.use('/api/weather-tiles/status', async (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const status = await weatherService!.getStatus();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(status, null, 2));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(error) }));
          }
        } else {
          next();
        }
      });

      // Add middleware for forcing tile download
      server.middlewares.use('/api/weather-tiles/download', async (req, res, next) => {
        if (req.method === 'POST') {
          try {
            const success = await weatherService!.forceDownload();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success }));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(error) }));
          }
        } else {
          next();
        }
      });

      // Add middleware for tile statistics
      server.middlewares.use('/api/weather-tiles/stats', async (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const stats = await weatherService!.getTileStats();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(stats, null, 2));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(error) }));
          }
        } else {
          next();
        }
      });

      // Log available endpoints
      console.log(chalk.gray('🔗 Weather Tiles API endpoints:'));
      console.log(chalk.gray('   GET  /api/weather-tiles/status'));
      console.log(chalk.gray('   POST /api/weather-tiles/download'));
      console.log(chalk.gray('   GET  /api/weather-tiles/stats'));
    },

    async closeBundle() {
      if (weatherService) {
        weatherService.stop();
        weatherService = null;
      }
    },

    // Handle hot module replacement cleanup
    buildEnd() {
      if (weatherService) {
        weatherService.stop();
        weatherService = null;
      }
    }
  };
}

// Export default plugin with common configuration
export default function createWeatherTilesPlugin(apiKey?: string) {
  return weatherTilesPlugin({
    apiKey,
    enabled: process.env.NODE_ENV === 'development', // Only in development
  });
}
