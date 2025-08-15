/**
 * IconFactory - Unified Hurricane Icon Management
 * Consolidates all hurricane icon generation and caching following established patterns
 */

import { CONFIG } from '../config';
import { safeSyncOperation } from './errorHandler';

/**
 * Icon types supported by the factory
 */
export type IconType = 'current' | 'historical' | 'forecast';

/**
 * Icon configuration interface
 */
interface IconConfig {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

/**
 * Cache entry interface for type safety
 */
interface CacheEntry {
  url: string;
  timestamp: Date;
}

/**
 * IconFactory class for unified hurricane icon management
 * Consolidates multiple icon caches and creation functions into a single, efficient factory
 */
export class IconFactory {
  private static instance: IconFactory | null = null;
  private readonly iconCache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 100; // Prevent memory bloat
  private readonly cacheExpiryMs = 1800000; // 30 minutes

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of IconFactory
   */
  public static getInstance(): IconFactory {
    if (!IconFactory.instance) {
      IconFactory.instance = new IconFactory();
    }
    return IconFactory.instance;
  }

  /**
   * Generate composite cache key for icon identification
   * @param type - Icon type (current, historical, forecast)
   * @param category - Hurricane category (0-5)
   * @returns Composite cache key
   */
  private getCacheKey(type: IconType, category: number): string {
    return `${type}-${Math.max(0, Math.min(5, Math.floor(category)))}`;
  }

  /**
   * Get category color from centralized CONFIG
   * @param category - Hurricane category (0-5)
   * @returns RGBA color array
   */
  private getCategoryColor(category: number): [number, number, number, number] {
    const normalizedCategory = Math.max(0, Math.min(5, Math.floor(category)));
    return CONFIG.weather.hurricanes.categoryColors[normalizedCategory as keyof typeof CONFIG.weather.hurricanes.categoryColors] || 
           CONFIG.weather.hurricanes.categoryColors[0];
  }

  /**
   * Convert RGBA array to hex color string
   * @param color - RGBA color array
   * @returns Hex color string
   */
  private rgbaToHex(color: [number, number, number, number]): string {
    const [r, g, b] = color;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Convert RGBA array to RGB string
   * @param color - RGBA color array
   * @returns RGB string for CSS
   */
  private rgbaToRgbString(color: [number, number, number, number]): string {
    const [r, g, b] = color;
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Create SVG icon using template with color substitution (internal)
   * @param category - Hurricane category
   * @param customTemplate - Optional custom SVG template
   * @returns Base64 encoded SVG data URL
   */
  private createSVGIconInternal(category: number, customTemplate?: string): string {
    return safeSyncOperation(
      () => {
        const color = this.getCategoryColor(category);
        const hexColor = this.rgbaToHex(color);
        
        // Use custom template or default from CONFIG
        const template = customTemplate || CONFIG.weather.hurricanes.iconTemplate.svgContent;
        
        // Replace the default white color (#ffffff) with the category color
        const coloredSvgContent = template.replace(/#ffffff/g, hexColor);
        
        return `data:image/svg+xml;base64,${btoa(coloredSvgContent)}`;
      },
      `create SVG icon for category ${category}`,
      `data:image/svg+xml;base64,${btoa(CONFIG.weather.hurricanes.iconTemplate.svgContent)}` // Fallback to default template
    );
  }

  /**
   * Create enhanced current position icon with white outer ring for maximum contrast
   * @param category - Hurricane category (0-5)
   * @returns Base64 encoded SVG data URL
   */
  private createCurrentPositionIcon(category: number): string {
    return safeSyncOperation(
      () => {
        const color = this.getCategoryColor(category);
        const rgbColor = this.rgbaToRgbString(color);
        
        const svg = `
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <!-- White outer circle for maximum contrast -->
            <circle cx="20" cy="20" r="18" fill="white" stroke="none"/>
            <!-- Colored inner circle with white stroke -->
            <circle cx="20" cy="20" r="14" fill="${rgbColor}" stroke="white" stroke-width="2"/>
          </svg>
        `;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
      },
      `create current position icon for category ${category}`,
      this.createSVGIconInternal(category) // Fallback to standard hurricane icon
    );
  }

  /**
   * Create standard hurricane icon for historical positions
   * @param category - Hurricane category (0-5)
   * @returns Base64 encoded SVG data URL
   */
  private createHistoricalIcon(category: number): string {
    return this.createSVGIconInternal(category);
  }

  /**
   * Create simple dot icon for forecast positions
   * @param category - Hurricane category (0-5)
   * @returns Base64 encoded SVG data URL
   */
  private createForecastIcon(category: number): string {
    return safeSyncOperation(
      () => {
        const color = this.getCategoryColor(category);
        const hexColor = this.rgbaToHex(color);
        
        const dotSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="32" fill="${hexColor}" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
        </svg>`;
        
        return `data:image/svg+xml;base64,${btoa(dotSvgContent)}`;
      },
      `create forecast dot icon for category ${category}`,
      this.createSVGIconInternal(category) // Fallback to standard hurricane icon
    );
  }

  /**
   * Check if cache entry is still valid
   * @param entry - Cache entry to validate
   * @returns True if entry is valid
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    const now = new Date();
    return (now.getTime() - entry.timestamp.getTime()) < this.cacheExpiryMs;
  }

  /**
   * Manage cache size to prevent memory bloat
   */
  private manageCacheSize(): void {
    if (this.iconCache.size <= this.maxCacheSize) return;

    // Remove oldest entries first
    const entries = Array.from(this.iconCache.entries());
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize);
    entriesToRemove.forEach(([key]) => {
      this.iconCache.delete(key);
    });
  }

  /**
   * Get or create cached icon
   * @param type - Icon type
   * @param category - Hurricane category
   * @param createFn - Function to create icon if not cached
   * @returns Base64 encoded SVG data URL
   */
  private getCachedIcon(type: IconType, category: number, createFn: () => string): string {
    const cacheKey = this.getCacheKey(type, category);
    const cached = this.iconCache.get(cacheKey);

    // Return cached version if valid
    if (cached && this.isCacheEntryValid(cached)) {
      return cached.url;
    }

    // Create new icon
    const iconUrl = createFn();
    
    // Cache the new icon
    this.iconCache.set(cacheKey, {
      url: iconUrl,
      timestamp: new Date()
    });

    // Manage cache size
    this.manageCacheSize();

    return iconUrl;
  }

  /**
   * Get enhanced current position icon with white outer ring for maximum contrast
   * @param category - Hurricane category (0-5)
   * @returns Base64 encoded SVG data URL
   */
  public getCurrentPositionIcon(category: number): string {
    return this.getCachedIcon('current', category, () => this.createCurrentPositionIcon(category));
  }

  /**
   * Get standard hurricane icon for historical positions
   * @param category - Hurricane category (0-5)
   * @returns Base64 encoded SVG data URL
   */
  public getHistoricalIcon(category: number): string {
    return this.getCachedIcon('historical', category, () => this.createHistoricalIcon(category));
  }

  /**
   * Get simple dot icon for forecast positions
   * @param category - Hurricane category (0-5)
   * @returns Base64 encoded SVG data URL
   */
  public getForecastIcon(category: number): string {
    return this.getCachedIcon('forecast', category, () => this.createForecastIcon(category));
  }

  /**
   * Get icon configuration for deck.gl IconLayer
   * @param type - Icon type
   * @param category - Hurricane category
   * @returns Icon configuration object
   */
  public getIconConfig(type: IconType, category: number): IconConfig & { url: string } {
    let url: string;
    let size: number;

    switch (type) {
      case 'current':
        url = this.getCurrentPositionIcon(category);
        size = 48; // Enhanced size for current position
        break;
      case 'historical':
        url = this.getHistoricalIcon(category);
        size = CONFIG.weather.hurricanes.iconTemplate.width;
        break;
      case 'forecast':
        url = this.getForecastIcon(category);
        size = CONFIG.weather.hurricanes.iconTemplate.width;
        break;
    }

    return {
      url,
      width: size,
      height: size,
      anchorX: size / 2,
      anchorY: size / 2
    };
  }
}

/**
 * Convenience function to get the singleton IconFactory instance
 * @returns IconFactory singleton instance
 */
export function getIconFactory(): IconFactory {
  return IconFactory.getInstance();
}

/**
 * Helper function to get category color (for backward compatibility)
 * @param category - Hurricane category (0-5)
 * @returns RGBA color array
 */
export function getCategoryColor(category: number): [number, number, number, number] {
  const normalizedCategory = Math.max(0, Math.min(5, Math.floor(category)));
  return CONFIG.weather.hurricanes.categoryColors[normalizedCategory as keyof typeof CONFIG.weather.hurricanes.categoryColors] || 
         CONFIG.weather.hurricanes.categoryColors[0];
}

/**
 * Helper function to get storm size (for backward compatibility)
 * @param category - Hurricane category (0-5)
 * @param isCurrentPosition - Whether this is for a current position icon
 * @returns Size in pixels
 */
export function getStormSize(category: number, isCurrentPosition: boolean = false): number {
  const categoryMultiplier = 1 + (category * 0.2); // More subtle scaling
  const currentBoost = isCurrentPosition ? CONFIG.weather.hurricanes.visualParams.currentPositionMultiplier : 1;
  
  return CONFIG.weather.hurricanes.visualParams.baseIconSize * categoryMultiplier * currentBoost;
}