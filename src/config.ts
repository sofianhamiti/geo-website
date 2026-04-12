/**
 * Application Configuration - Simplified and centralized
 */

export const CONFIG = {
  // Map settings
  map: {
    center: [0, 20] as [number, number],
    zoom: {
      default: 1.5,
      min: 1,
      max: 7,
    },
  },

  // Data sources - raster tile services only for optimal performance
  sources: {
    satelliteTiles: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    arcgisSatellite: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    arcgisPlaces: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    eoxSentinel: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    tileSize: 256,
    maxZoom: 7,
    attribution: '© USGS National Map',
    arcgisSatelliteAttribution: '© Esri, Maxar, Earthstar Geographics',
    arcgisAttribution: '© Esri',
    eoxAttribution: 'Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)',
  },

  // Styling
  styles: {
    night: {
      // Tile source — NASA GIBS VIIRS Black Marble (free, no API key)
      tileUrl:
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',
      maxZoom: 8,

      // Shadow overlay color (dark blue-black)
      shadowColor: [5, 5, 25, 255] as [number, number, number, number],

      // Terminator line
      terminatorColor: [180, 200, 255, 180] as [number, number, number, number],
      terminatorWidth: 1,
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
      minZoom: 2, // Show mountains at zoom level 2 and above
    },
    iss: {
      // Livestream Configuration
      streams: [
        { id: 'zPH5KtjJFaQ', label: 'HD Views' },
        { id: 'sWasdbDVNvc', label: 'Live Video' },
      ],

      // API Configuration
      satelliteId: 25544, // ISS NORAD ID
      apiBaseUrl: 'https://api.wheretheiss.at/v1/satellites/',
      trajectoryDurationMinutes: 90, // 90 minutes ahead
      trajectoryPointIntervalSeconds: 120, // 2 minutes between trajectory points
      updateIntervalMs: 10000, // 10 seconds between updates

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

      // Trajectory styling
      trajectoryColor: [157, 212, 224, 200] as [number, number, number, number], // Light blue to match ISS icon color (#9dd4e0)
      trajectoryWidth: 1,
      trajectoryOpacity: 0.2,

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

      // Error display styling
      errorTextSize: 16,
      errorTextColor: [255, 140, 0, 255] as [number, number, number, number],
      errorBackgroundColor: [15, 23, 42, 204] as [number, number, number, number],
      errorBackgroundPadding: [8, 4, 8, 4] as [number, number, number, number],

      // Filtering options
      minMagnitudeDisplay: 4.5, // Show M4.5+ earthquakes

      // Performance settings
      maxEarthquakes: 1000, // Limit for performance
      significantThreshold: 4.5, // M4.5+ considered significant
    },
    timezones: {
      // Local data configuration (primary)
      dataPath: '/geo-website/data/world-timezones.geojson',

      // API Configuration (fallback)
      serviceUrl: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Time_Zones/FeatureServer',

      // Visual styling
      strokeWidth: 1,
    },
  },

  // True-color daily Earth (NASA GIBS VIIRS)
  trueColorEarth: {
    tileUrlTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    tileSize: 256,
    opacity: 0.85,
    updateIntervalMs: 3600000, // re-check date availability hourly
  },

  // Rain radar (RainViewer)
  rainRadar: {
    manifestUrl: 'https://api.rainviewer.com/public/weather-maps.json',
    tileSize: 256,
    opacity: 0.6,
    maxZoom: 7,
    updateIntervalMs: 600000, // re-fetch manifest every 10 min
    animationIntervalMs: 500, // advance frame every 500ms
  },

  // Aurora forecast (NOAA SWPC OVATION)
  aurora: {
    apiUrl: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
    updateIntervalMs: 1800000, // every 30 min
    opacity: 0.7,
    // Color gradient: probability mapped to green aurora glow
    colors: {
      low: [0, 255, 100, 60] as [number, number, number, number],      // faint green glow
      mid: [0, 255, 100, 160] as [number, number, number, number],     // green glow
      high: [100, 255, 180, 220] as [number, number, number, number],  // bright green
      peak: [200, 255, 230, 250] as [number, number, number, number],  // green-white
    },
    minProbability: 3, // show even faint aurora
  },

  // Weather settings
  weather: {
    hurricanes: {
      // API Configuration — hurricane_aware_aggregated_data (global: NHC + JTWC)
      serviceUrl: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/hurricane_aware_aggregated_data/FeatureServer',
      refreshIntervalMinutes: 60, // 1 hour

      // Fallback API — Active_Hurricanes_v1 (has full historical track when available)
      fallbackServiceUrl: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer',
      fallbackPositionsLayer: 1,

      // API Table Configuration (tables, not spatial layers — geometry constructed client-side from LAT/LON)
      apiTables: {
        observedPositions: 1,  // Current observed position per storm
        forecast: 2,           // Forecast positions with SSNUM categories
        storms: 3,             // Active storm list
      },

      // Zoom.Earth Style Color Palette - professional subtle visualization matching their ACTUAL fucking implementation
      zoomEarthColors: {
        uncertaintyCone: [255, 255, 255, 20] as [number, number, number, number],       // VERY subtle white - almost invisible like zoom.earth
      },

      // Visual Parameters - refined to match zoom.earth's clean professional style
      visualParams: {
        coneStrokeWidth: 1,
        forecastDotRadius: 7,
        coneStrokeColor: [255, 255, 255, 25] as [number, number, number, number],
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
  },

  // Layer and source IDs
  layerIds: {
    satellite: 'satellite-layer',
    arcgisSatellite: 'arcgis-satellite-layer',
    eoxSentinel: 'eox-sentinel-layer',
    arcgisPlaces: 'arcgis-places-layer',
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
    trueColorEarth: 'true-color-earth-tiles',
    rainRadar: 'rain-radar-tiles',
    aurora: 'aurora-forecast',
  },

  sourceIds: {
    satellite: 'satellite',
    arcgisSatellite: 'arcgis-satellite',
    eoxSentinel: 'eox-sentinel',
    arcgisPlaces: 'arcgis-places',
  },
} as const;
