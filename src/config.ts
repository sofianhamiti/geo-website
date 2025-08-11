/**
 * Application Configuration - Simplified and centralized
 */

export const CONFIG = {
  // Map settings
  map: {
    center: [0, 20] as [number, number],
    zoom: {
      default: 2,
      min: 2,
      max: 8,
    },
    projection: 'mercator' as const,
  },

  // Data sources - raster tile services only for optimal performance
  sources: {
    satelliteTiles: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    arcgisPlaces: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    tileSize: 256,
    maxZoom: 8,
    attribution: '© USGS National Map',
    arcgisAttribution: '© Esri',
  },

  // Styling
  styles: {
    terminator: {
      color: '#FF6B35', // Sunset orange - warmer and more sophisticated
      width: 2,
      opacity: 0.9,
      resolution: 360, // High resolution for smooth line
    },
    arcgisPlaces: {
      opacity: 1,
    },
    cities: {
      // Visual styling
      dotRadius: 3,
      lineColor: [255, 255, 255, 150] as [number, number, number, number],
      dotColor: [255, 255, 255, 255] as [number, number, number, number],
      textColor: [255, 255, 255, 255] as [number, number, number, number],
      backgroundColor: [15, 23, 42, 204] as [number, number, number, number],
      borderColor: [255, 255, 255, 25] as [number, number, number, number],
      
      // Typography
      fontSize: 14,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      fontWeight: 'bold' as const,
      lineHeight: 1.2,
      borderRadius: 6,
      padding: [12, 6, 12, 6] as [number, number, number, number],
      minZoom: 2,
      
      // Collision detection parameters
      collision: {
        // Character dimensions for radius calculation
        charWidth: 8, // pixels per character
        lineHeight: 16, // pixels per line
        pixelsToDegrees: 1 / 4000, // conversion factor
        minRadius: 3.5, // minimum collision radius in degrees
        
        // D3-force simulation parameters
        collisionStrength: 0.5, // how strongly labels avoid each other (0-1)
        springStrength: 0.1, // how strongly labels return to original position (0-1)  
        maxIterations: 100, // maximum simulation steps
        convergenceThreshold: 0.001, // alpha threshold to stop simulation
        offsetThreshold: 0.05, // minimum offset to draw leader lines
      },
    },
    mountains: {
      // Clean cartographic mountain styling - Aurora Geographical theme
      minZoom: 2, // Show mountains at zoom level 2 and above
      symbolColor: [230, 184, 0, 255] as [number, number, number, number], // Golden amber - elegant and visible
      labelColor: [255, 140, 66, 255] as [number, number, number, number], // Warm orange for labels
      symbolSize: 6, // Increased base symbol size for better visibility
      labelSize: 12, // Slightly larger text size for better readability
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontWeight: 'bold' as const,
      outlineColor: [25, 35, 50, 180] as [number, number, number, number], // Dark outline for better contrast
      outlineWidth: 2,
      spacingOffset: 0.2, // Vertical spacing between symbol and label
    },
  },

  // Weather settings
  weather: {
    localTiles: {
      // Local weather tile configuration
      enabled: true,
      zoomLevel: 4, // Level 4 = 16×16 = 256 tiles
      downloadInterval: 12, // hours
      maxAge: 24, // hours
      concurrentDownloads: 5,
      retryAttempts: 3,
      showProgress: true,
      basePath: '/weather-tiles',
      
      // API configuration
      apiKey: {
        envVariable: 'VITE_OPENWEATHER_API_KEY',
        fallback: 'YOUR_API_KEY_HERE',
        warningMessage: 'OpenWeatherMap API key not configured. Weather tiles will not be downloaded.',
      },
      
      // Layer configuration
      opacity: 1.0,
      tileSize: 256,
      minZoom: 2,
      maxZoom: 8,
      pickable: false,
      
      // Weather radar-style color enhancement for maximum visibility
      colorEnhancement: {
        // Radar color palette - very bright, high contrast
        tintColor: [0, 255, 255] as [number, number, number], // Bright cyan - classic radar
        alternativeTints: {
          brightGreen: [50, 255, 50] as [number, number, number], // Bright green
          neonBlue: [0, 200, 255] as [number, number, number], // Electric blue
          radioactiveYellow: [255, 255, 0] as [number, number, number], // Bright yellow
        },
        saturationBoost: 1.0, // Maximum saturation
        contrastMultiplier: 2.0, // Double contrast for radar-style visibility
        brightnessBoost: 0.5, // Significant brightness increase
        glowEffect: true, // Enable additive blending for glow
      },
      
      // Rendering parameters
      parameters: {
        depthTest: false,
      },
      
      // Loading strategy
      refinementStrategy: 'best-available' as const,
    },
  },

  // Application behavior
  app: {
    updateFrequency: 10000, // 10 seconds
    weatherUpdateFrequency: 10800000, // 3 hours for weather data
    loadingTransitionDelay: 0,
  },

  // Layer and source IDs
  layerIds: {
    satellite: 'satellite-layer',
    arcgisPlaces: 'arcgis-places-layer',
    terminator: 'deck-gl-terminator',
    cities: 'deck-gl-cities',
    mountains: 'deck-gl-mountains',
    precipitation: 'deck-gl-precipitation',
  },

  sourceIds: {
    satellite: 'satellite',
    arcgisPlaces: 'arcgis-places',
  },
} as const;

export type Config = typeof CONFIG;
