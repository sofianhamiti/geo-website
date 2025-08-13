/**
 * Consolidated World Map Component
 * Single source of truth for all map functionality
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { createLayerTooltip } from '../utils/tooltipFactory';
import { createTerminatorLayer } from '../layers/TerminatorLayer';
import { createMountainsLayers } from '../layers/MountainsLayer';
import { createUnescoLayers } from '../layers/UnescoLayer';
import { createTimeZonesLayers, isTimeZonesLayerConfigured } from '../layers/TimeZonesLayer';
import { createCityTimesLayers } from '../layers/CityTimesLayer';
import { createISSLayers, isISSTrackingConfigured } from '../layers/ISSLayer';
import { createHurricaneLayers, isHurricaneLayerConfigured } from '../layers/HurricaneLayer';
import { createEarthquakeLayers, isEarthquakeLayerConfigured } from '../layers/EarthquakeLayer';
import { useMapStore } from '../store/mapStore';
import { CONFIG } from '../config';
import { CityManager } from './CityManager';
import ISSVideoOverlay from './ISSVideoOverlay';

const Map = () => {
  const mapContainer = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  
  // Separate state for precise time display (1-second updates)
  const [displayTime, setDisplayTime] = useState(new Date());
  
  
  // Use map store for state management
  const {
    map,
    isMapLoaded,
    selectedBasemap,
    showArcgisPlaces,
    showTerminator,
    showCities,
    showMountains,
    showUnesco,
    showTimezones,
    showISS,
    showHurricanes,
    showEarthquakes,
    issLayers,
    issManager,
    isISSLoading,
    hurricaneLayers,
    hurricaneManager,
    hurricaneLastUpdate,
    isHurricanesLoading,
    earthquakeLayers,
    earthquakeManager,
    earthquakeLastUpdate,
    isEarthquakesLoading,
    timezoneLayers,
    isMenuOpen,
    currentTime,
    cities,
    setMap,
    setMapLoaded,
    setSelectedBasemap,
    toggleArcgisPlaces,
    toggleTerminator,
    toggleCities,
    toggleMountains,
    toggleUnesco,
    toggleTimezones,
    toggleISS,
    toggleHurricanes,
    toggleEarthquakes,
    toggleMenu,
    updateTime,
    setISSLayers,
    setHurricaneLayers,
    setHurricaneLastUpdate,
    setEarthquakeLayers,
    setEarthquakeLastUpdate,
    setTimezoneLayers,
    initializeISSManager,
    destroyISSManager,
    initializeHurricaneManager,
    destroyHurricaneManager,
    initializeEarthquakeManager,
    destroyEarthquakeManager,
    loadSavedCities,
    setISSVideoVisible,
  } = useMapStore();

  // ISS click handler for video overlay
  const handleISSClick = useCallback((info: any) => {
    if (info.object) {
      console.log('🛰️ ISS clicked at screen coordinates:', info.x, info.y);
      setISSVideoVisible(true, [info.x, info.y]);
    }
  }, [setISSVideoVisible]);

  // Load saved cities on mount
  useEffect(() => {
    loadSavedCities();
  }, [loadSavedCities]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          [CONFIG.sourceIds.satellite]: {
            type: 'raster',
            tiles: [CONFIG.sources.satelliteTiles],
            tileSize: 256, // Keep working value instead of config's 1024
            maxzoom: CONFIG.sources.maxZoom,
            attribution: CONFIG.sources.attribution,
          },
          [CONFIG.sourceIds.arcgisSatellite]: {
            type: 'raster',
            tiles: [CONFIG.sources.arcgisSatellite],
            tileSize: CONFIG.sources.tileSize,
            maxzoom: CONFIG.sources.maxZoom,
            attribution: CONFIG.sources.arcgisSatelliteAttribution,
          },
          [CONFIG.sourceIds.arcgisPlaces]: {
            type: 'raster',
            tiles: [CONFIG.sources.arcgisPlaces],
            tileSize: CONFIG.sources.tileSize,
            maxzoom: CONFIG.sources.maxZoom,
            attribution: CONFIG.sources.arcgisAttribution,
          },
        },
        layers: [
          {
            id: CONFIG.layerIds.satellite,
            type: 'raster',
            source: CONFIG.sourceIds.satellite,
            layout: {
              'visibility': 'visible', // USGS starts visible (default basemap)
            },
          },
          {
            id: CONFIG.layerIds.arcgisSatellite,
            type: 'raster',
            source: CONFIG.sourceIds.arcgisSatellite,
            layout: {
              'visibility': 'none', // ArcGIS satellite starts hidden
            },
          },
          {
            id: CONFIG.layerIds.arcgisPlaces,
            type: 'raster',
            source: CONFIG.sourceIds.arcgisPlaces,
            paint: {
              'raster-opacity': CONFIG.styles.arcgisPlaces.opacity,
            },
            layout: {
              'visibility': 'none', // Start hidden by default
            },
          },
        ],
      },
      center: CONFIG.map.center,
      zoom: CONFIG.map.zoom.default,
      minZoom: CONFIG.map.zoom.min,
      maxZoom: CONFIG.map.zoom.max,
      // Disable all rotation interactions
      dragRotate: false,           // Disables rotation via mouse drag
      touchZoomRotate: false,      // Disables rotation via touch gestures  
      pitchWithRotate: false,      // Prevents pitch changes during rotation
      keyboard: false,             // Disables keyboard shortcuts (including rotation)
      attributionControl: false,   // Disable default attribution control - we add custom one
    });

    // Set memory limits to reduce RAM usage
    try {
      // Set memory optimizations with proper type checking
      const mapWithPrivateProps = map as maplibregl.Map & {
        _maxTileCacheSize?: number;
        _collectResourceTiming?: boolean;
        _painter?: {
          context?: {
            gl?: WebGLRenderingContext;
          };
        };
      };
      
      if ('_maxTileCacheSize' in mapWithPrivateProps) {
        mapWithPrivateProps._maxTileCacheSize = 50;
      }
      
      if ('_collectResourceTiming' in mapWithPrivateProps) {
        mapWithPrivateProps._collectResourceTiming = false;
      }
      
      // Reduce texture cache size with type checking
      if (mapWithPrivateProps._painter?.context?.gl) {
        const gl = mapWithPrivateProps._painter.context.gl;
        if (gl.TEXTURE_2D && gl.TEXTURE_MAG_FILTER && gl.LINEAR) {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
      }
      
      // Memory optimizations applied
    } catch (error) {
      // Could not apply all memory optimizations - continue silently
    }

    map.on('load', () => {
      setMapLoaded(true);
      setMap(map);

      try {
        // Add collapsed attribution control for legal compliance
        const attribution = new maplibregl.AttributionControl({
          compact: true, // Shows only "i" button by default
          customAttribution: []
        });
        map.addControl(attribution, 'bottom-right');

        // Initialize deck.gl overlay with hover tooltips using centralized tooltip factory
        const deckOverlay = new MapboxOverlay({
          interleaved: false,
          getTooltip: ({object, layer}) => createLayerTooltip(object, layer),
        });
        
        // Add deck.gl overlay to map
        map.addControl(deckOverlay);
        
        // Store deckOverlay reference for layer updates
        (map as any)._deckOverlay = deckOverlay;

      } catch (error) {
        // Error adding layers - continue silently
      }
    });

    map.on('error', () => {
      // Map error - continue silently
    });

    return () => {
      map.remove();
    };
  }, []);

  // UNESCO layers loaded separately due to async nature
  const unescoLayersRef = useRef<any[]>([]);
  

  // Split large useMemo into focused hooks for better performance

  // 1. Static layers that only depend on visibility states
  const staticLayers = useMemo(() => {
    const layers: any[] = [];
    
    // UNESCO layers (async-safe)
    if (unescoLayersRef.current) {
      unescoLayersRef.current.forEach(layer => {
        layers.push(layer.clone({
          visible: showUnesco
        }));
      });
    }
    
    // Timezone layers (async-safe)
    if (timezoneLayers.length > 0) {
      timezoneLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: showTimezones
        }));
      });
    }
    
    return layers;
  }, [showUnesco, showTimezones, timezoneLayers]);

  // 2. Zoom-dependent layers
  const zoomDependentLayers = useMemo(() => {
    const layers: any[] = [];
    
    // Mountains layers change with zoom
    const mountainsLayers = createMountainsLayers(currentZoom);
    mountainsLayers.forEach(layer => {
      layers.push(layer.clone({
        visible: showMountains
      }));
    });
    
    return layers;
  }, [currentZoom, showMountains]);

  // 3. Time-dependent layers (frequent updates)
  const timeDependentLayers = useMemo(() => {
    const layers: any[] = [];
    
    // Terminator layer updates with current time
    const terminatorLayer = createTerminatorLayer(currentTime);
    if (terminatorLayer) {
      layers.push(terminatorLayer.clone({
        visible: showTerminator,
        updateTriggers: {
          getPath: currentTime.getTime()
        }
      }));
    }

    // City times layers update every minute
    const cityTimesLayers = createCityTimesLayers(cities, currentTime);
    cityTimesLayers.forEach(layer => {
      layers.push(layer.clone({
        visible: showCities,
        updateTriggers: {
          getText: currentTime.getMinutes(),
          getPosition: cities.map(c => c.id).join(',')
        }
      }));
    });
    
    return layers;
  }, [currentTime, showTerminator, showCities, cities]);


  // 4. Data-dependent layers (external API data)
  const dataDependentLayers = useMemo(() => {
    const layers: any[] = [];


    // ISS tracking layers
    if (showISS && issLayers.length > 0) {
      issLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: showISS,
          updateTriggers: {
            getPosition: currentTime.getTime(),
            getText: currentTime.getTime(),
            getPath: currentTime.getTime(),
          }
        }));
      });
    }

    // Hurricane tracking layers
    if (showHurricanes && hurricaneLayers.length > 0) {
      hurricaneLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: showHurricanes,
          updateTriggers: {
            getPosition: hurricaneLastUpdate?.getTime() || currentTime.getTime(),
            getText: hurricaneLastUpdate?.getTime() || currentTime.getTime(),
            getAngle: Math.floor(Date.now() / 100), // Update rotation trigger every 100ms for smooth animation
          }
        }));
      });
    }

    // Earthquake tracking layers
    if (showEarthquakes && earthquakeLayers.length > 0) {
      earthquakeLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: showEarthquakes,
          updateTriggers: {
            getPosition: earthquakeLastUpdate?.getTime() || currentTime.getTime(),
            getFillColor: earthquakeLastUpdate?.getTime() || currentTime.getTime(),
            getRadius: earthquakeLastUpdate?.getTime() || currentTime.getTime(),
            getText: earthquakeLastUpdate?.getTime() || currentTime.getTime(),
          }
        }));
      });
    }
    
    return layers;
  }, [
    showISS, issLayers, currentTime,
    showHurricanes, hurricaneLayers, hurricaneLastUpdate,
    showEarthquakes, earthquakeLayers, earthquakeLastUpdate
  ]);

  // 5. Combine all layers efficiently
  const layers = useMemo(() => {
    return [
      ...staticLayers,
      ...zoomDependentLayers,
      ...timeDependentLayers,
      ...dataDependentLayers
    ];
  }, [staticLayers, zoomDependentLayers, timeDependentLayers, dataDependentLayers]);
  
  // Load UNESCO layers once
  useEffect(() => {
    createUnescoLayers().then(layers => {
      unescoLayersRef.current = layers;
    });
  }, []);

  // Load timezone layers when timezone layer is enabled
  useEffect(() => {
    if (showTimezones && isTimeZonesLayerConfigured()) {
      createTimeZonesLayers().then(layers => {
        if (layers && layers.length > 0) {
          setTimezoneLayers(layers);
        } else {
          setTimezoneLayers([]);
        }
      }).catch(error => {
        console.error('Error loading timezone layers:', error);
        setTimezoneLayers([]);
      });
    } else {
      setTimezoneLayers([]);
    }
  }, [showTimezones, setTimezoneLayers]);


  // Initialize ISS Manager when ISS tracking is enabled
  useEffect(() => {
    if (showISS && isISSTrackingConfigured() && !issManager) {
      initializeISSManager();
    } else if (!showISS && issManager) {
      destroyISSManager();
    }
  }, [showISS, issManager, initializeISSManager, destroyISSManager]);

  // Update ISS layers when ISS manager is available
  useEffect(() => {
    if (showISS && issManager) {
      try {
        const layers = createISSLayers(currentTime, handleISSClick);
        setISSLayers(layers);
      } catch (error) {
        setISSLayers([]);
      }
    } else {
      setISSLayers([]);
    }
  }, [showISS, issManager, currentTime, setISSLayers, handleISSClick]);

  // Initialize Earthquake Manager when earthquake tracking is enabled
  useEffect(() => {
    if (showEarthquakes && isEarthquakeLayerConfigured() && !earthquakeManager) {
      initializeEarthquakeManager();
    } else if (!showEarthquakes && earthquakeManager) {
      destroyEarthquakeManager();
    }
  }, [showEarthquakes, earthquakeManager, initializeEarthquakeManager, destroyEarthquakeManager]);

  // Update earthquake layers when earthquake manager is available
  useEffect(() => {
    if (showEarthquakes && earthquakeManager) {
      try {
        const layers = createEarthquakeLayers(currentTime, currentZoom);
        setEarthquakeLayers(layers);
        setEarthquakeLastUpdate(new Date());
      } catch (error) {
        setEarthquakeLayers([]);
      }
    } else {
      setEarthquakeLayers([]);
    }
  }, [showEarthquakes, earthquakeManager, currentTime, currentZoom, setEarthquakeLayers, setEarthquakeLastUpdate]);

  // Initialize Hurricane Manager when hurricane tracking is enabled
  useEffect(() => {
    if (showHurricanes && isHurricaneLayerConfigured() && !hurricaneManager) {
      console.log('🌀 [DEBUG] Initializing Hurricane Manager from Map component...');
      initializeHurricaneManager();
    } else if (!showHurricanes && hurricaneManager) {
      console.log('🌀 [DEBUG] Destroying Hurricane Manager from Map component...');
      destroyHurricaneManager();
    }
  }, [showHurricanes, hurricaneManager, initializeHurricaneManager, destroyHurricaneManager]);

  // Update hurricane layers when hurricane manager is available
  useEffect(() => {
    if (showHurricanes && hurricaneManager) {
      console.log('🌀 [DEBUG] Creating hurricane layers with manager...');
      try {
        const layers = createHurricaneLayers(currentTime);
        setHurricaneLayers(layers);
        setHurricaneLastUpdate(new Date());
      } catch (error) {
        console.error('❌ [ERROR] Failed to create hurricane layers:', error);
        setHurricaneLayers([]);
      }
    } else {
      setHurricaneLayers([]);
    }
  }, [showHurricanes, hurricaneManager, currentTime, setHurricaneLayers, setHurricaneLastUpdate]);

  // Update deck.gl overlay with new layers
  useEffect(() => {
    if (map && (map as any)._deckOverlay) {
      (map as any)._deckOverlay.setProps({ layers });
    }
  }, [layers, map]);

  // Time updates using React pattern instead of intervals
  useEffect(() => {
    const interval = setInterval(() => {
      updateTime();
    }, CONFIG.app.updateFrequency); // 10 seconds for smooth updates

    return () => clearInterval(interval);
  }, [updateTime]);

  // Separate 1-second interval for precise date/time display
  useEffect(() => {
    const displayInterval = setInterval(() => {
      setDisplayTime(new Date());
    }, 1000); // Update every second for precise display

    return () => clearInterval(displayInterval);
  }, []);

  // Weather timestamp is now managed by actual tile loading - no more fake timers!
  // The real timestamp comes from metadata.json when tiles are loaded

  // Zoom tracking - update current zoom state
  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
    };

    map.on('zoomend', handleZoomEnd);
    return () => map.off('zoomend', handleZoomEnd);
  }, [map]);

  // Handle ArcGIS Places visibility (MapLibre layer, not deck.gl)
  useEffect(() => {
    if (map && map.getLayer && map.getLayer(CONFIG.layerIds.arcgisPlaces)) {
      map.setLayoutProperty(
        CONFIG.layerIds.arcgisPlaces,
        'visibility',
        showArcgisPlaces ? 'visible' : 'none'
      );
    }
  }, [showArcgisPlaces, map]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* City times are now handled by Deck.gl TextLayer - no HTML overlay needed */}
      
      {/* Inline Loading Screen */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading World Map...</p>
          </div>
        </div>
      )}

      {/* Menu Toggle Button */}
      <div className="absolute top-3 right-3 z-50">
        <button
          onClick={toggleMenu}
          className="p-2 bg-slate-800/90 backdrop-blur-sm border border-blue-200/20 rounded-lg text-blue-100 hover:bg-slate-700/90 hover:text-white transition-all duration-200 shadow-lg"
          title="Toggle Controls Panel"
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="transition-transform duration-200"
          >
            {isMenuOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            )}
          </svg>
        </button>
      </div>

      {/* No timezone time display - borders only */}


      {/* Right Slide Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-lg border-l border-blue-200/20 shadow-2xl z-40 transform transition-transform duration-200 ease-out flex flex-col ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Panel Header */}
        <div className="p-6 border-b border-blue-200/10 flex-shrink-0">
          <h2 className="text-lg font-semibold text-blue-100">Map Controls</h2>
        </div>

        {/* Panel Content - Fixed scrolling with proper height */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          
          {/* Basemap Section */}
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Basemap</h3>
            <div className="space-y-3">
              
              {/* USGS Blue Marble */}
              <div 
                onClick={() => setSelectedBasemap('usgs')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedBasemap === 'usgs' 
                    ? 'bg-blue-600/30 border border-blue-400/50' 
                    : 'bg-slate-800/50 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Blue Marble</div>
                    <div className="text-blue-300 text-xs">USGS Natural Earth</div>
                  </div>
                </div>
                {selectedBasemap === 'usgs' && (
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* ArcGIS Satellite */}
              <div 
                onClick={() => setSelectedBasemap('arcgis')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedBasemap === 'arcgis' 
                    ? 'bg-blue-600/30 border border-blue-400/50' 
                    : 'bg-slate-800/50 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Satellite Imagery</div>
                    <div className="text-blue-300 text-xs">ArcGIS World Imagery</div>
                  </div>
                </div>
                {selectedBasemap === 'arcgis' && (
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Static Layers Section */}
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Static Layers</h3>
            <div className="space-y-3">
              
              {/* ArcGIS Places */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Places & Boundaries</div>
                    <div className="text-blue-300 text-xs">Administrative labels</div>
                  </div>
                </div>
                <button
                  onClick={toggleArcgisPlaces}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showArcgisPlaces ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showArcgisPlaces ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Time Zones */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,15.4L16.2,16.2Z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Time Zones</div>
                    <div className="text-blue-300 text-xs">World timezone boundaries</div>
                  </div>
                </div>
                <button
                  onClick={toggleTimezones}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showTimezones ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showTimezones ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Mountain Peaks */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 15 15" fill="currentColor" className="text-yellow-500">
                      <path d="M7.5 1c-.3 0-.4.2-.6.4l-5.8 9.5c-.1.1-.1.3-.1.4c0 .5.4.7.7.7h11.6c.4 0 .7-.2.7-.7c0-.2 0-.2-.1-.4L8.2 1.4C8 1.2 7.8 1 7.5 1m0 1.5L10.8 8H10L8.5 6.5L7.5 8l-1-1.5L5 8h-.9z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Mountain Peaks</div>
                    <div className="text-blue-300 text-xs">Elevation markers</div>
                  </div>
                </div>
                <button
                  onClick={toggleMountains}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showMountains ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showMountains ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* UNESCO Sites */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                      <path d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">UNESCO Sites</div>
                    <div className="text-blue-300 text-xs">World Heritage sites</div>
                  </div>
                </div>
                <button
                  onClick={toggleUnesco}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showUnesco ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showUnesco ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

            </div>
          </div>

          {/* Dynamic Layers Section */}
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Dynamic Layers</h3>
            <div className="space-y-3">

              {/* City Times */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                      <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">City Times</div>
                    <div className="text-blue-300 text-xs">Major city time zones</div>
                  </div>
                </div>
                <button
                  onClick={toggleCities}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showCities ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showCities ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Day/Night Terminator */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Day/Night Terminator</div>
                    <div className="text-blue-300 text-xs">Real-time shadow line</div>
                  </div>
                </div>
                <button
                  onClick={toggleTerminator}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showTerminator ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showTerminator ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* ISS Tracking */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                      <path d="M15.5 19v2h-1.77c-.34.6-.99 1-1.73 1s-1.39-.4-1.73-1H8.5v-2h1.77c.17-.3.43-.56.73-.73V17h-1c-.55 0-1-.45-1-1v-3H6v4c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v3h3V8c0-.55.45-1 1-1h1V6h-1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1h-1v1h1c.55 0 1 .45 1 1v3h3V8c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-4h-3v3c0 .55-.45 1-1 1h-1v1.27c.3.17.56.43.73.73zM3 16v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2V8zm16 8v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2V8z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">ISS Tracking</div>
                    <div className="text-blue-300 text-xs">
                      {isISSLoading ? 'Loading...' : 'Real-time position & orbit'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleISS}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showISS ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  disabled={isISSLoading}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showISS ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Earthquake Tracking */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-500">
                      {/* Center epicenter dot */}
                      <circle cx="8" cy="8" r="1" fill="currentColor"/>
                      {/* Inner ring */}
                      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="0.8"/>
                      {/* Outer ring */}
                      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Earthquakes</div>
                    <div className="text-blue-300 text-xs">
                      {isEarthquakesLoading ? 'Loading...' : earthquakeLastUpdate ? `Updated ${earthquakeLastUpdate.toLocaleTimeString()}` : 'Real-time seismic data'}
                    </div>
                  </div>
                </div>
                
                {/* Loading spinner */}
                {isEarthquakesLoading && (
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                
                <button
                  onClick={toggleEarthquakes}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showEarthquakes ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  disabled={isEarthquakesLoading}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showEarthquakes ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Hurricane Tracking */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-orange-400">
                      {/* Center eye */}
                      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1"/>
                      {/* Upper sweep line */}
                      <path d="M6 3.5l-0.1 0.2A8 8 0 0 0 5.2 8.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                      {/* Lower sweep line */}
                      <path d="M10 12.5l0.1-0.2A8 8 0 0 0 10.8 7.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Hurricane Tracking</div>
                    <div className="text-blue-300 text-xs">
                      {isHurricanesLoading ? 'Loading...' : hurricaneLastUpdate ? `Updated ${hurricaneLastUpdate.toLocaleTimeString()}` : 'Live storm tracking'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleHurricanes}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showHurricanes ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  disabled={isHurricanesLoading}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showHurricanes ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

            </div>
          </div>


          {/* City Manager */}
          <CityManager />

          {/* Current Time Display */}
          <div className="border-t border-blue-200/10 pt-6">
            <h3 className="text-sm font-medium text-blue-200 mb-3 uppercase tracking-wide">System Time</h3>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-blue-100 font-mono text-sm">
                {currentTime.toLocaleString()}
              </div>
              <div className="text-blue-300 text-xs mt-1">
                Updates every 10 seconds
              </div>
            </div>
          </div>

          </div>
        </div>
      </div>

      {/* Date/Time Display - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 p-4">
        <div className="text-blue-100 text-xl font-bold tracking-wide antialiased text-center">
          {displayTime.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div className="text-blue-100 font-sans text-2xl font-bold tracking-wider antialiased text-center">
          {displayTime.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {/* Overlay for closing panel when clicking outside */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/10 z-10"
          onClick={toggleMenu}
        />
      )}

      {/* ISS Video Overlay */}
      <ISSVideoOverlay />

    </div>
  );
};

export default Map;
