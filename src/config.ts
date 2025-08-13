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
    arcgisSatellite: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    arcgisPlaces: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    tileSize: 256,
    maxZoom: 8,
    attribution: '© USGS National Map',
    arcgisSatelliteAttribution: '© Esri, Maxar, Earthstar Geographics',
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
    iss: {
      // API Configuration
      satelliteId: 25544, // ISS NORAD ID
      apiBaseUrl: 'https://api.wheretheiss.at/v1/satellites/',
      trajectoryDurationMinutes: 60, // 60 minutes ahead
      trajectoryPointIntervalSeconds: 120, // 2 minutes between trajectory points
      updateIntervalMs: 10000, // 30 seconds between updates

      // Icon Configuration
      icon: {
        svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24">
              <path fill="#fff58cff" d="M15.5 19v2h-1.77c-.34.6-.99 1-1.73 1s-1.39-.4-1.73-1H8.5v-2h1.77c.17-.3.43-.56.73-.73V17h-1c-.55 0-1-.45-1-1v-3H6v4c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v3h3V8c0-.55.45-1 1-1h1V6h-1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1h-1v1h1c.55 0 1 .45 1 1v3h3V8c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-4h-3v3c0 .55-.45 1-1 1h-1v1.27c.3.17.56.43.73.73zM3 16v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2V8zm16 8v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2V8z"/>
          </svg>`,
        width: 128,
        height: 128,
        anchorX: 64,
        anchorY: 64,
      },

      // Visual styling
      iconSize: 32, // Space station icon size
      iconColor: [255, 245, 140, 255] as [number, number, number, number], // Yellow color scheme to match icon

      // Trajectory styling
      trajectoryColor: [255, 245, 140, 200] as [number, number, number, number], // Yellow to match ISS icon color
      trajectoryWidth: 1,
      trajectoryOpacity: 0.2,

      // Information label styling
      labelSize: 12,
      labelColor: [255, 255, 255, 255] as [number, number, number, number], // White text
      backgroundColor: [15, 23, 42, 220] as [number, number, number, number], // Dark background
      borderColor: [255, 245, 140, 80] as [number, number, number, number], // Yellow border to match theme

      // Error display styling
      errorTextSize: 16,
      errorTextColor: [255, 245, 140, 255] as [number, number, number, number], // Yellow text for errors to match theme
      errorBackgroundColor: [15, 23, 42, 204] as [number, number, number, number], // Dark background for errors
      errorBackgroundPadding: [8, 4, 8, 4] as [number, number, number, number], // Padding for error background

      // Trajectory width limits
      trajectoryWidthMin: 2,
      trajectoryWidthMax: 4,
    },
    earthquakes: {
      // API Configuration
      apiBaseUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/',
      endpoint: 'all_day.geojson', // Past 24 hours, all magnitudes
      updateIntervalMs: 3600000, // 1 hour (60 * 60 * 1000)

      // Icon Configuration
      icon: {
        svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
              <!-- Center epicenter dot (solid red) -->
              <circle cx="64" cy="64" r="6" fill="#ff0000"/>
              
              <!-- Inner ring (full opacity) -->
              <circle cx="64" cy="64" r="16" fill="none" stroke="#ff0000" stroke-width="3"/>
              
              <!-- Middle ring (medium opacity) -->
              <circle cx="64" cy="64" r="28" fill="none" stroke="#ff0000" stroke-width="2" opacity="0.8"/>
              
              <!-- Outer ring (reduced opacity) -->
              <circle cx="64" cy="64" r="42" fill="none" stroke="#ff0000" stroke-width="2" opacity="0.55"/>
              
              <!-- Outermost ring (lowest opacity) -->
              <circle cx="64" cy="64" r="58" fill="none" stroke="#ff0000" stroke-width="1.5" opacity="0.36"/>
          </svg>`,
        width: 128,
        height: 128,
        anchorX: 64,
        anchorY: 64,
      },

      // Size calculation parameters
      sizeMultiplier: 0.5, // Main scaling factor (reduced from 0.8)
      magnitudeScaling: {
        baseMultiplier: 1,    // Base multiplier (the "1" in "1 + magnitude")  
        magnitudeWeight: 2,   // How much magnitude affects size (the magnitude part)
      },

      // Icon display parameters
      iconDisplay: {
        sizeScale: 1,
        alphaCutoff: -1, // Include all pixels for picking
      },

      // Level-of-detail filtering
      lodFiltering: {
        enabled: true,
        zoomBreakpoints: {
          2: 4.5,  // At zoom 2, show only M4.5+ (significantThreshold)
          4: 2.0,  // At zoom 4, show M2.0+  
          6: 1.0,  // At zoom 6, show M1.0+
          // Above zoom 6: show all earthquakes
        }
      },

      // Magnitude-based styling system
      magnitudeColors: {
        9: [139, 0, 0, 255] as [number, number, number, number],     // Dark red - Extreme (9.0+)
        8: [255, 0, 0, 255] as [number, number, number, number],     // Red - Great (8.0-8.9)
        7: [255, 69, 0, 255] as [number, number, number, number],    // Orange-red - Major (7.0-7.9)
        6: [255, 140, 0, 255] as [number, number, number, number],   // Orange - Strong (6.0-6.9)
        5: [255, 215, 0, 255] as [number, number, number, number],   // Gold - Moderate (5.0-5.9)
        4: [255, 255, 0, 255] as [number, number, number, number],   // Yellow - Light (4.0-4.9)
        3: [173, 255, 47, 255] as [number, number, number, number],  // Green-yellow - Minor (3.0-3.9)
        2: [0, 255, 127, 255] as [number, number, number, number],   // Spring green - Very minor (2.0-2.9)
        1: [135, 206, 235, 255] as [number, number, number, number], // Sky blue - Micro (1.0-1.9)
        0: [176, 196, 222, 255] as [number, number, number, number]  // Light steel blue - Very micro (<1.0)
      },

      // Size scaling based on magnitude
      magnitudeSizes: {
        9: 20, // Extreme events
        8: 18, // Great earthquakes
        7: 16, // Major earthquakes
        6: 14, // Strong earthquakes
        5: 12, // Moderate earthquakes
        4: 10, // Light earthquakes
        3: 8,  // Minor earthquakes
        2: 6,  // Very minor
        1: 5,  // Micro
        0: 4   // Very micro
      },

      // Depth-based opacity (shallow = more visible)
      depthOpacity: {
        shallow: 255,    // 0-70km depth
        intermediate: 200, // 70-300km depth
        deep: 150        // 300km+ depth
      },

      // Visual styling
      strokeColor: [255, 255, 255, 200] as [number, number, number, number],
      strokeWidth: 1,
      radiusMinPixels: 4,
      radiusMaxPixels: 30,

      // Label styling (for significant earthquakes M4.5+)
      labelMinMagnitude: 4.5,
      labelSize: 11,
      labelColor: [255, 255, 255, 255] as [number, number, number, number],
      labelBackgroundColor: [15, 23, 42, 220] as [number, number, number, number],
      labelBorderColor: [255, 140, 0, 80] as [number, number, number, number],

      // Error display styling
      errorTextSize: 16,
      errorTextColor: [255, 140, 0, 255] as [number, number, number, number],
      errorBackgroundColor: [15, 23, 42, 204] as [number, number, number, number],
      errorBackgroundPadding: [8, 4, 8, 4] as [number, number, number, number],

      // Filtering options
      minMagnitudeDisplay: 0.0, // Show all earthquakes by default
      maxAge: 24, // Hours - matches API endpoint

      // Performance settings
      maxEarthquakes: 1000, // Limit for performance
      significantThreshold: 4.5, // M4.5+ considered significant
    },
    timezones: {
      // API Configuration
      serviceUrl: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Time_Zones/FeatureServer',

      // Visual styling
      strokeColor: [255, 255, 255, 100] as [number, number, number, number], // White borders with low opacity
      strokeWidth: 1,
      fillOpacity: 0.3, // Semi-transparent fills so you can see basemap underneath

      // UTC offset-based color mapping
      offsetColors: {
        // Western hemisphere - blue spectrum
        [-12]: [30, 60, 150, 76] as [number, number, number, number],   // Deep blue UTC-12
        [-11]: [40, 80, 170, 76] as [number, number, number, number],   // UTC-11
        [-10]: [50, 100, 190, 76] as [number, number, number, number],  // UTC-10
        [-9]: [60, 120, 210, 76] as [number, number, number, number],   // UTC-9
        [-8]: [70, 140, 230, 76] as [number, number, number, number],   // UTC-8 Pacific
        [-7]: [80, 160, 250, 76] as [number, number, number, number],   // UTC-7 Mountain
        [-6]: [90, 180, 255, 76] as [number, number, number, number],   // UTC-6 Central
        [-5]: [100, 200, 255, 76] as [number, number, number, number],  // UTC-5 Eastern
        [-4]: [120, 210, 255, 76] as [number, number, number, number],  // UTC-4 Atlantic
        [-3]: [140, 220, 255, 76] as [number, number, number, number],  // UTC-3
        [-2]: [160, 230, 255, 76] as [number, number, number, number],  // UTC-2
        [-1]: [180, 240, 255, 76] as [number, number, number, number],  // UTC-1

        // UTC/GMT - neutral green
        [0]: [100, 200, 100, 76] as [number, number, number, number],   // UTC Greenwich

        // Eastern hemisphere - red/orange spectrum
        [1]: [255, 240, 180, 76] as [number, number, number, number],   // UTC+1 Central Europe
        [2]: [255, 230, 160, 76] as [number, number, number, number],   // UTC+2 Eastern Europe
        [3]: [255, 220, 140, 76] as [number, number, number, number],   // UTC+3 Moscow
        [4]: [255, 210, 120, 76] as [number, number, number, number],   // UTC+4
        [5]: [255, 200, 100, 76] as [number, number, number, number],   // UTC+5
        [6]: [255, 190, 80, 76] as [number, number, number, number],    // UTC+6
        [7]: [255, 180, 60, 76] as [number, number, number, number],    // UTC+7
        [8]: [255, 170, 50, 76] as [number, number, number, number],    // UTC+8 China/Australia
        [9]: [255, 160, 40, 76] as [number, number, number, number],    // UTC+9 Japan
        [10]: [255, 150, 30, 76] as [number, number, number, number],   // UTC+10 Australia East
        [11]: [255, 140, 20, 76] as [number, number, number, number],   // UTC+11
        [12]: [255, 130, 10, 76] as [number, number, number, number],   // UTC+12 New Zealand
        [13]: [250, 120, 0, 76] as [number, number, number, number],    // UTC+13
        [14]: [240, 110, 0, 76] as [number, number, number, number],    // UTC+14
      },

      // Hover/selection effects
      highlightColor: [255, 255, 0, 150] as [number, number, number, number], // Yellow highlight
      highlightStrokeWidth: 3,
    },
  },

  // Weather settings
  weather: {
    hurricanes: {
      // API Configuration
      serviceUrl: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer',
      refreshIntervalMinutes: 60, // 1 hour

      // Icon Configuration
      icon: {
        width: 128,
        height: 128,
        anchorX: 64,
        anchorY: 64,
      },

      // Saffir-Simpson category colors
      categoryColors: {
        5: [139, 0, 139, 255] as [number, number, number, number], // Purple - Cat 5 (157+ mph)
        4: [255, 0, 0, 255] as [number, number, number, number],   // Red - Cat 4 (130-156 mph)
        3: [255, 69, 0, 255] as [number, number, number, number],  // Orange-Red - Cat 3 (111-129 mph)
        2: [255, 140, 0, 255] as [number, number, number, number], // Orange - Cat 2 (96-110 mph)
        1: [255, 215, 0, 255] as [number, number, number, number], // Gold - Cat 1 (74-95 mph)
        0: [65, 105, 225, 255] as [number, number, number, number] // Blue - Tropical Storm (39-73 mph)
      },

      // Balanced exponential category-based sizing
      categorySizes: {
        5: 30, // Cat 5 - balanced base size for reasonable final size (~180-200px)
        4: 26, // Cat 4 - major hurricane (~130-150px)
        3: 23, // Cat 3 - major hurricane (~90-105px)
        2: 21, // Cat 2 - hurricane (~60-75px)
        1: 19, // Cat 1 - hurricane (~40-50px)
        0: 20  // Tropical Storm - increased to ensure ~25-30px final size
      },

      // Rebalanced exponential scaling parameters
      categoryScaling: {
        baseMultiplier: 2,    // Base multiplier (the "1" in "1 + category")
        categoryWeight: 1.5, // Fine-tuned to 1.35 for optimal exponential growth
      },

      // Size calculation parameters
      sizeMultiplier: 0.85, // Fine-tuned to 0.85 for balanced overall scaling
    },
  },

  // Application behavior
  app: {
    updateFrequency: 10000, // 10 seconds
    loadingTransitionDelay: 0,
  },

  // Layer and source IDs
  layerIds: {
    satellite: 'satellite-layer',
    arcgisSatellite: 'arcgis-satellite-layer',
    arcgisPlaces: 'arcgis-places-layer',
    terminator: 'deck-gl-terminator',
    cities: 'deck-gl-cities',
    mountains: 'deck-gl-mountains',
    iss: 'deck-gl-iss',
    issPosition: 'iss-position',
    issTrajectory: 'iss-trajectory',
    issInfo: 'iss-info',
    earthquakes: 'deck-gl-earthquakes',
    earthquakePositions: 'earthquake-positions',
    earthquakeLabels: 'earthquake-labels',
    timezones: 'deck-gl-timezones',
  },

  sourceIds: {
    satellite: 'satellite',
    arcgisSatellite: 'arcgis-satellite',
    arcgisPlaces: 'arcgis-places',
  },
} as const;

export type Config = typeof CONFIG;
