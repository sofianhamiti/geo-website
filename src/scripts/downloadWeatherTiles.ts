#!/usr/bin/env tsx

/**
 * Weather Tiles Download Script
 * Downloads fresh weather tiles for static hosting
 * Used by GitHub Actions to pre-download tiles every 12 hours
 */

import { WeatherTileService } from '../services/weatherTileService';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

async function downloadWeatherTiles() {
  console.log(chalk.blue('🌦️  Weather Tiles Download Script'));
  console.log(chalk.gray('================================'));

  // Check for API key
  const apiKey = process.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error(chalk.red('❌ OpenWeather API key not found!'));
    console.error(chalk.yellow('   Set VITE_OPENWEATHER_API_KEY environment variable'));
    process.exit(1);
  }

  try {
    // Initialize weather tile service
    const weatherService = new WeatherTileService({
      apiKey,
      zoomLevel: 2, // Lower zoom for faster downloads
      downloadInterval: 12, // 12 hours
      maxAge: 24, // 24 hours max age
      outputDir: path.join(projectRoot, 'public/weather-tiles')
    });

    console.log(chalk.blue('📡 Starting weather tile download...'));
    console.log(chalk.gray(`   API Key: ${apiKey.substring(0, 8)}...`));
    console.log(chalk.gray(`   Output: public/weather-tiles/`));
    console.log(chalk.gray(`   Zoom Level: 2 (for faster CI builds)`));

    // Start the download process
    const success = await weatherService.downloadCurrentTiles();
    
    if (success) {
      console.log(chalk.green('✅ Weather tiles downloaded successfully!'));
      
      // Get tile info
      const tileUrl = await weatherService.getTileUrl();
      if (tileUrl) {
        console.log(chalk.blue(`📍 Current tileset: ${tileUrl}`));
      }
      
      process.exit(0);
    } else {
      console.log(chalk.yellow('⚠️  Weather tile download completed with warnings'));
      process.exit(0); // Don't fail the build for weather tiles
    }

  } catch (error) {
    console.error(chalk.red('❌ Error downloading weather tiles:'));
    console.error(chalk.red(`   ${error}`));
    console.log(chalk.yellow('⚠️  Continuing without pre-downloaded tiles (app will download at runtime)'));
    process.exit(0); // Don't fail the build
  }
}

// Self-executing async function
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadWeatherTiles().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { downloadWeatherTiles };