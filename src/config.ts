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
    eoxSentinel: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    tileSize: 256,
    maxZoom: 8,
    attribution: '© USGS National Map',
    arcgisSatelliteAttribution: '© Esri, Maxar, Earthstar Geographics',
    arcgisAttribution: '© Esri',
    eoxAttribution: 'Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)',
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
      // Clean cartographic mountain styling - Enhanced bright gold theme
      minZoom: 2, // Show mountains at zoom level 2 and above
      symbolColor: [255, 215, 0, 255] as [number, number, number, number], // Bright gold for maximum pop
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
      trajectoryDurationMinutes: 90, // 120 minutes ahead
      trajectoryPointIntervalSeconds: 120, // 2 minutes between trajectory points
      updateIntervalMs: 10000, // 30 seconds between updates

      // Icon Configuration
      icon: {
        svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128"><path fill="#2f7889" d="M51.24 75.33S3.98 57.62 4 57.25L5.12 23.6c.02-.45.47-.75.89-.59l46.35 17.12c.38.14.62.51.61.91l-1.13 33.9c-.01.3-.31.5-.6.39"/><path fill="#37474f" d="m9.29 59.89l41.95 15.44c.28.11.59-.09.6-.4l1.13-33.9l-7.57-2.85z"/><path fill="none" stroke="#9dd4e0" stroke-miterlimit="10" stroke-width="2.042" d="M51.24 75.33L4.55 58.08a.85.85 0 0 1-.55-.82L5.12 23.6c.02-.45.47-.75.89-.59l46.35 17.12c.38.14.62.51.61.91l-1.13 33.9c-.01.3-.31.5-.6.39z"/><path fill="none" stroke="#9dd4e0" stroke-miterlimit="10" stroke-width="1.021" d="M52.41 57.96L4.57 40.27m24.97-7.56l-1.17 34.02M16.94 27.39l-1.06 35.2m26.14-26.64l-1.06 35.44"/><path fill="#bf8904" d="m82.81 38.76l1.46-2.49c.59-1.01 1.82-1.5 2.93-1.13c2.04.68 5.21 2.43 7.46 6.88c2.27 4.49 1.93 8.12 1.37 10.17a2.53 2.53 0 0 1-2.38 1.88l-2.04.04z"/><path fill="#875d00" d="M91.15 40.25c-.63.82.08 4.67-.76 5.61c-.42.46-1.01.9-1.58.65l2.29 7.61l2.57-.04a2.51 2.51 0 0 0 2.38-1.88c.55-2.05.9-5.68-1.37-10.17c-.3-.57-2.06-3.71-3.53-1.78"/><path fill="#ffca28" d="M89.28 41.23L68.9 33.46l-21.19 9.97L53.65 86l22.18-9.48l16.91-13.77z"/><path fill="#e2a610" d="m89.28 41.22l-21.33 9.92l-14.1 35.25l22.18-9.48l16.91-13.77z"/><path fill="#bf8904" d="m67.99 51.25l-20.37-7.77l-16.91 13.76l3.46 21.53l20.37 7.76l16.91-13.76z"/><path fill="#875d00" d="m93.17 63.12l-21.82 9.67l-3.44 2.85c.01-.14.6-6.87-4.9-15.06c-3.95-5.89-12.89-9.2-12.89-9.2l4.45 35.3l22.17-9.48z"/><path fill="#2f7889" d="M122.27 105.01S75.01 87.3 75.03 86.93l1.12-33.66c.02-.45.47-.75.89-.59l46.35 17.12c.38.14.62.51.61.91l-1.13 33.9c-.01.31-.31.51-.6.4"/><path fill="#37474f" d="m80.32 89.57l41.95 15.44c.28.11.59-.09.6-.4L124 69.95l-6.99-2.43z"/><path fill="none" stroke="#9dd4e0" stroke-miterlimit="10" stroke-width="2.042" d="M122.27 105.01L75.58 87.76a.86.86 0 0 1-.55-.83l1.12-33.66c.02-.45.47-.75.89-.59l46.35 17.12c.38.14.62.51.61.91l-1.13 33.9c-.01.31-.31.51-.6.4z"/><path fill="none" stroke="#9dd4e0" stroke-miterlimit="10" stroke-width="1.021" d="M123.44 87.63L75.6 69.95m24.97-7.56L99.4 96.41M87.97 57.06l-1.06 35.2m26.14-26.63l-1.06 35.44"/><path fill="#e2a610" d="M75.03 39.47c0-1.57-2.67-2.85-5.96-2.85s-5.96 1.27-5.96 2.85v2.23c0 1.57 2.67 2.85 5.96 2.85s5.96-1.27 5.96-2.85z"/><ellipse cx="69.07" cy="39.47" fill="#e2a610" rx="5.96" ry="2.85"/><ellipse cx="69.07" cy="39.27" fill="#ffca28" rx="5.01" ry="2.2"/><path fill="#e2a610" d="M70.02 39.3s-.19.4-.94.4s-.94-.4-.94-.4s.27-10.28.35-10.95s1.02-.65 1.05 0c.02.65.48 10.95.48 10.95"/><path fill="#bf8904" d="M75.03 39.47s-.37 1.63-3.68 2.29c-2.43.48-4.17.29-4.59 1.56c-.32.96 1.98 1.75 5.23.87c2.93-.8 3.04-2.26 3.04-2.48z"/><path fill="#9dd4e0" d="M53.94 92.43L36.62 46.49c7.54-2.84 21.56 3.62 26.34 16.3s-1.48 26.8-9.02 29.64"/><path fill="#2f7889" d="m51.7 86.49l2.24 5.94c7.54-2.84 13.81-16.95 9.02-29.64c-.4-1.06-.87-2.08-1.4-3.06c1.9 8.89-1.6 19.92-9.86 26.76"/><ellipse cx="45.23" cy="69.56" fill="#f5f5f5" rx="13.25" ry="23.6" transform="rotate(-20.653 45.232 69.563)"/><path fill="#bdbdbd" d="M37.04 68.06c-3.51-6.56-5.78-16.39-1.43-20.05c4.59-3.86 11.08.68 14.34 3.57c1.81 1.6 2.76 2.85 3.7 4.13c5.36 7.3 9.97 21.66 3.79 26.91c-4.31 3.66-15.15-4.74-20.4-14.56"/><path fill="#6392a5" d="M33.52 73.89c-4.31-11.44-2.57-23.13 3.81-25.53s15.4 5.23 19.71 16.67s2.57 23.13-3.81 25.53s-15.4-5.23-19.71-16.67m-1.34.51c4.78 12.69 14.77 20.67 22.31 17.82c7.54-2.84 9.78-15.43 4.99-28.12S44.71 43.44 37.17 46.28S27.4 61.71 32.18 74.4"/><path fill="none" stroke="#6392a5" stroke-linecap="round" stroke-miterlimit="10" stroke-width="1.5" d="m26.72 76.3l26.06-11.54M26.72 76.3l15.19-17.01M26.72 76.3l23.25 3.54"/><path fill="#6392a5" d="m28.4 74.49l.79 2.08a.85.85 0 0 1-.5 1.1l-4.13 1.56a.85.85 0 0 1-1.1-.5l-.79-2.08a.85.85 0 0 1 .5-1.1L27.3 74a.85.85 0 0 1 1.1.49"/></svg>`,
        width: 512,
        height: 512,
        anchorX: 128,
        anchorY: 128,
      },

      // Visual styling
      iconSize: 56, // Space station icon size
      iconColor: [255, 245, 140, 255] as [number, number, number, number], // Yellow color scheme to match icon

      // Trajectory styling
      trajectoryColor: [157, 212, 224, 200] as [number, number, number, number], // Light blue to match ISS icon color (#9dd4e0)
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
    planes: {
      // API Configuration
      apiBaseUrl: 'https://opensky-network.org/api',
      endpoint: '/states/all',
      updateIntervalMs: 10 * 60 * 1000, // 10 minutes - optimized for API limits (144 calls/day)

      // OAuth2 Configuration
      oauth2: {
        tokenEndpoint: 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
        tokenCacheExpirationMs: 25 * 60 * 1000, // 25 minutes (refresh before 30min expiry)
        grantType: 'client_credentials',
      },

      // API Credit Management - Based on geographic area, not just API calls
      apiLimits: {
        creditsPerDay: 4000,        // 4000 credits/day with OAuth2 (8000 if contributing data)
        creditsPerCall: 4,          // 4 credits for global bounds (>400 sq deg area)
        maxCallsPerDay: 1000,       // 1000 calls max at 4 credits each
        actualUsage: 144,           // 144 calls/day at 10min intervals  
        dailyCreditsUsed: 576,      // 144 calls × 4 credits = 576 credits (14.4% of limit)
        recommendedInterval: 10,    // 10 minutes = 144 calls/day = 576 credits
        conservativeInterval: 15,   // 15 minutes = 96 calls/day = 384 credits  
      },

      // Icon Configuration
      icon: {
        svgData: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><path fill="#FFD700" d="M14 8.947L22 14v2l-8-2.526v5.36l3 1.666V22l-4.5-1L8 22v-1.5l3-1.667v-5.36L3 16v-2l8-5.053V3.5a1.5 1.5 0 0 1 3 0z"/></svg>`,
        width: 96,
        height: 96,
        anchorX: 48,
        anchorY: 48,
      },

      // Visual styling
      iconSize: 16, // Base aircraft icon size
      iconSizeMultiplier: 1.2, // Size scaling factor



      // Geographic bounds optimization
      boundsPadding: 2, // Degrees to extend bounds for API calls

      // Error display styling
      errorTextSize: 16,
      errorTextColor: [100, 149, 237, 255] as [number, number, number, number], // Light blue
      errorBackgroundColor: [15, 23, 42, 204] as [number, number, number, number],
      errorBackgroundPadding: [8, 4, 8, 4] as [number, number, number, number],

      // Tooltip styling
      tooltipSize: 12,
      tooltipColor: [255, 255, 255, 255] as [number, number, number, number],
      tooltipBackgroundColor: [15, 23, 42, 220] as [number, number, number, number],
      tooltipBorderColor: [100, 149, 237, 80] as [number, number, number, number],
    },
    timezones: {
      // Local data configuration (primary)
      dataPath: '/geo-website/data/world-timezones.geojson',

      // API Configuration (fallback)
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

      // API Layer Configuration
      apiLayers: {
        positions: 1,      // Hurricane position data (current, historical, forecast)
        tracks: 2,         // Forecast track centerlines
        trajectories: [0, 3, 4, 5], // Trajectory uncertainty cones (try multiple layers)
      },

      // Zoom.Earth Style Color Palette - professional subtle visualization matching their ACTUAL fucking implementation
      zoomEarthColors: {
        uncertaintyCone: [255, 255, 255, 20] as [number, number, number, number],       // VERY subtle white - almost invisible like zoom.earth
      },

      // Visual Parameters - refined to match zoom.earth's clean professional style
      visualParams: {
        // Track line widths - thinner and more refined
        historicalTrackWidth: 2.5,         // Clean, professional width
        forecastTrackWidth: 3,              // Slightly thicker for emphasis
        coneStrokeWidth: 1,                 // Barely visible stroke

        // Icon sizing parameters - cleaner, more professional
        baseIconSize: 20,                   // Smaller base size
        currentPositionMultiplier: 1.8,     // Less dramatic scaling
        historicalDotRadius: 8,             // Larger for easier hover targeting
        forecastDotRadius: 7,               // Larger for easier hover targeting

        // Professional subtle stroke colors matching Zoom.Earth's actual implementation
        coneStrokeColor: [255, 255, 255, 25] as [number, number, number, number],  // Nearly invisible stroke
        historicalDotStroke: [255, 255, 255, 150] as [number, number, number, number],
        forecastDotStroke: [255, 255, 255, 80] as [number, number, number, number],
      },

      // Hurricane SVG Icon Template - optimized for ocean visibility
      iconTemplate: {
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <!-- Center circle -->
    <circle cx="64" cy="64" r="22" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    
    <!-- Upper sweep line -->
    <path d="M50 29.2l-1 1.9A67.4 67.4 0 0 0 42.2 66.8" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    
    <!-- Lower sweep line -->
    <path d="M78 98.8l1-1.9A67.4 67.4 0 0 0 85.8 61.2" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
</svg>` as const,
        width: 128,
        height: 128,
        anchorX: 64,
        anchorY: 64,
      },

      // Saffir-Simpson category colors - matched to Zoom.Earth's exact color scheme
      categoryColors: {
        5: [139, 0, 139, 255] as [number, number, number, number], // Purple - Cat 5 (157+ mph)
        4: [139, 0, 0, 255] as [number, number, number, number],   // Dark Red - Cat 4 (130-156 mph)
        3: [255, 0, 0, 255] as [number, number, number, number],   // Pure Red - Cat 3 (111-129 mph)
        2: [255, 165, 0, 255] as [number, number, number, number], // Orange - Cat 2 (96-110 mph)
        1: [255, 255, 0, 255] as [number, number, number, number], // Bright Yellow - Cat 1 (74-95 mph)
        0: [0, 255, 0, 255] as [number, number, number, number]    // Green - Tropical Storm (39-73 mph) - matches Zoom.Earth
      }
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
    eoxSentinel: 'eox-sentinel-layer',
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
    planes: 'deck-gl-planes',
    planePositions: 'plane-positions',
  },

  sourceIds: {
    satellite: 'satellite',
    arcgisSatellite: 'arcgis-satellite',
    eoxSentinel: 'eox-sentinel',
    arcgisPlaces: 'arcgis-places',
  },
} as const;

export type Config = typeof CONFIG;
