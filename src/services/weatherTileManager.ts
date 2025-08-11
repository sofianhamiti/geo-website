/**
 * Weather Tile Manager
 * Handles local weather tile storage, metadata, and cleanup
 */

import fs from 'fs-extra';
import { isAfter, subHours, parseISO } from 'date-fns';
import path from 'path';
import chalk from 'chalk';

export interface TileMetadata {
  currentTileset?: string;
  lastUpdate?: string;
  tilesets: {
    [timestamp: string]: {
      created: string;
      tilesCount: number;
      success: boolean;
    }
  }
}

export interface TilesetInfo {
  timestamp: string;
  path: string;
  age: number;
  tilesCount: number;
}

export class WeatherTileManager {
  private basePath: string;
  private metadataPath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.metadataPath = path.join(basePath, 'metadata.json');
  }

  /**
   * Get current metadata
   */
  async getMetadata(): Promise<TileMetadata> {
    try {
      if (await fs.pathExists(this.metadataPath)) {
        return await fs.readJson(this.metadataPath);
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to read metadata: ${error}`));
    }

    // Return default metadata
    return {
      tilesets: {}
    };
  }

  /**
   * Update metadata after successful download
   */
  async updateMetadata(timestamp: string, tilesCount: number, success: boolean): Promise<void> {
    const metadata = await this.getMetadata();
    
    metadata.tilesets[timestamp] = {
      created: new Date().toISOString(),
      tilesCount,
      success
    };

    if (success) {
      metadata.currentTileset = timestamp;
      metadata.lastUpdate = new Date().toISOString();
    }

    await fs.ensureDir(this.basePath);
    await fs.writeJson(this.metadataPath, metadata, { spaces: 2 });
  }

  /**
   * Get the current (most recent successful) tileset
   */
  async getCurrentTileset(): Promise<string | null> {
    const metadata = await this.getMetadata();
    return metadata.currentTileset || null;
  }

  /**
   * Check if current tileset is fresh (within maxAge hours)
   */
  async isTilesetFresh(maxAge: number): Promise<boolean> {
    const metadata = await this.getMetadata();
    
    if (!metadata.currentTileset || !metadata.lastUpdate) {
      return false;
    }

    const lastUpdate = parseISO(metadata.lastUpdate);
    const cutoff = subHours(new Date(), maxAge);
    
    return isAfter(lastUpdate, cutoff);
  }

  /**
   * Get information about all tilesets
   */
  async getAllTilesets(): Promise<TilesetInfo[]> {
    const metadata = await this.getMetadata();
    const tilesets: TilesetInfo[] = [];

    for (const [timestamp, info] of Object.entries(metadata.tilesets)) {
      const tilesetPath = path.join(this.basePath, timestamp);
      
      // Check if tileset directory still exists
      if (await fs.pathExists(tilesetPath)) {
        const created = parseISO(info.created);
        const age = (Date.now() - created.getTime()) / (1000 * 60 * 60); // hours
        
        tilesets.push({
          timestamp,
          path: tilesetPath,
          age,
          tilesCount: info.tilesCount
        });
      }
    }

    // Sort by age (newest first)
    return tilesets.sort((a, b) => a.age - b.age);
  }

  /**
   * Clean up old tilesets
   */
  async cleanupOldTilesets(maxAge: number, keepMinimum: number = 1): Promise<void> {
    console.log(chalk.blue('🧹 Cleaning up old weather tilesets...'));
    
    const tilesets = await this.getAllTilesets();
    const cutoff = new Date(Date.now() - (maxAge * 60 * 60 * 1000));
    
    let removed = 0;
    let totalSize = 0;

    for (const tileset of tilesets) {
      // Keep minimum number of tilesets
      if (tilesets.length - removed <= keepMinimum) {
        break;
      }

      const created = new Date(Date.now() - (tileset.age * 60 * 60 * 1000));
      
      if (created < cutoff) {
        try {
          // Calculate size before removal
          const stats = await this.getTilesetSize(tileset.path);
          totalSize += stats;

          await fs.remove(tileset.path);
          removed++;

          console.log(chalk.gray(`🗑️  Removed tileset: ${tileset.timestamp} (${this.formatSize(stats)})`));

          // Remove from metadata
          const metadata = await this.getMetadata();
          delete metadata.tilesets[tileset.timestamp];
          await fs.writeJson(this.metadataPath, metadata, { spaces: 2 });

        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Failed to remove tileset ${tileset.timestamp}: ${error}`));
        }
      }
    }

    if (removed > 0) {
      console.log(chalk.green(`✅ Cleaned up ${removed} old tilesets (freed ${this.formatSize(totalSize)})`));
    } else {
      console.log(chalk.gray('ℹ️  No old tilesets to clean up'));
    }
  }

  /**
   * Get tileset directory size
   */
  private async getTilesetSize(tilesetPath: string): Promise<number> {
    try {
      let totalSize = 0;
      
      const items = await fs.readdir(tilesetPath);
      for (const item of items) {
        const itemPath = path.join(tilesetPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subItems = await fs.readdir(itemPath);
          for (const subItem of subItems) {
            const subItemPath = path.join(itemPath, subItem);
            const subStat = await fs.stat(subItemPath);
            totalSize += subStat.size;
          }
        } else {
          totalSize += stat.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Get weather tiles base URL for the frontend
   */
  getTilesUrl(timestamp?: string): string {
    const tileset = timestamp || 'current';
    return `/weather-tiles/${tileset}`;
  }

  /**
   * Ensure weather tiles directory exists
   */
  async ensureBaseDirectory(): Promise<void> {
    await fs.ensureDir(this.basePath);
  }

  /**
   * Check if any tilesets exist
   */
  async hasTilesets(): Promise<boolean> {
    const metadata = await this.getMetadata();
    return Object.keys(metadata.tilesets).length > 0;
  }
}
