/**
 * Consolidated World Map Component
 * Single source of truth for all map functionality
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { createTerminatorLayer } from '../layers/TerminatorLayer';
import { createMountainsLayers } from '../layers/MountainsLayer';
import { createUnescoLayers } from '../layers/UnescoLayer';
import { createCityTimesLayers } from '../layers/CityTimesLayer';
import { createWeatherPrecipitationLayer, isPrecipitationLayerConfigured } from '../layers/WeatherPrecipitationLayer';
import { useMapStore } from '../store/mapStore';
import { CONFIG } from '../config';
import { CityManager } from './CityManager';

const Map = () => {
  const mapContainer = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  
  // Use map store for state management
  const {
    map,
    isMapLoaded,
    showArcgisPlaces,
    showTerminator,
    showCities,
    showMountains,
    showUnesco,
    showPrecipitation,
    weatherDataTimestamp,
    isMenuOpen,
    currentTime,
    cities,
    setMap,
    setMapLoaded,
    toggleArcgisPlaces,
    toggleTerminator,
    toggleCities,
    toggleMountains,
    toggleUnesco,
    togglePrecipitation,
    toggleMenu,
    updateTime,
    setWeatherDataTimestamp,
    loadSavedCities,
  } = useMapStore();

  // Load saved cities and weather timestamp on mount
  useEffect(() => {
    loadSavedCities();
    
    // Load the real weather timestamp immediately from metadata
    const metadataUrl = './weather-tiles/metadata.json';
    console.log('🌦️ Loading weather timestamp on mount from:', metadataUrl);
    fetch(metadataUrl)
      .then(response => {
        console.log('🌦️ Mount metadata response:', response.status, response.url);
        return response.json();
      })
      .then(metadata => {
        if (metadata.lastUpdate) {
          const realTimestamp = new Date(metadata.lastUpdate);
          setWeatherDataTimestamp(realTimestamp);
          console.log('✅ Weather timestamp loaded on mount:', realTimestamp.toISOString());
        }
      })
      .catch(error => {
        console.warn('⚠️  Could not load weather timestamp on mount:', error);
      });
  }, [loadSavedCities, setWeatherDataTimestamp]);

  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('Creating consolidated world map...');

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
    });

    // Set memory limits to reduce RAM usage
    try {
      // Set memory optimizations
      (map as any)._maxTileCacheSize = 50;
      (map as any)._collectResourceTiming = false;
      
      // Reduce texture cache size
      if ((map as any)._painter) {
        (map as any)._painter.context.gl.texParameteri((map as any)._painter.context.gl.TEXTURE_2D, (map as any)._painter.context.gl.TEXTURE_MAG_FILTER, (map as any)._painter.context.gl.LINEAR);
      }
      
      console.log('✅ Memory optimizations applied');
    } catch (error) {
      console.warn('Could not apply all memory optimizations:', error);
    }

    map.on('load', () => {
      console.log('Map loaded successfully!');
      setMapLoaded(true);
      setMap(map);

      try {
        // Initialize deck.gl overlay with hover tooltips for mountains and UNESCO sites
        const deckOverlay = new MapboxOverlay({
          interleaved: false,
          getTooltip: ({object, layer}) => {
            if (!object || !layer?.id) {
              return null;
            }

            // Handle mountain peaks tooltips
            if (layer.id === 'mountain-peaks') {
              const mountain = object;
              const elevation = mountain.elevation.toLocaleString() + 'm';
              
              return {
                html: `
                  <div style="
                    background: rgba(15, 23, 42, 0.95);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 13px;
                    line-height: 1.4;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    max-width: 200px;
                  ">
                    <div style="font-weight: 600; color: #e6b800; margin-bottom: 4px;">
                      ${mountain.name}
                    </div>
                    <div style="color: #cbd5e1; font-size: 12px;">
                      ${elevation} elevation
                    </div>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">
                      ${mountain.range} • ${mountain.country}
                    </div>
                  </div>
                `,
                style: {
                  backgroundColor: 'transparent',
                  color: 'white'
                }
              };
            }

            // Handle UNESCO sites tooltips
            if (layer.id === 'unesco-sites') {
              const site = object;
              
              // Danger status indicator
              const dangerStatus = site.danger === 1 ? '⚠️ Site in Danger' : '✅ Protected';
              const dangerColor = site.danger === 1 ? '#ef4444' : '#22c55e';
              
              return {
                html: `
                  <div style="
                    background: rgba(15, 23, 42, 0.95);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 13px;
                    line-height: 1.4;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    max-width: 280px;
                  ">
                    <div style="font-weight: 600; color: #f59e0b; margin-bottom: 6px;">
                      ${site.name_en}
                    </div>
                    <div style="margin-bottom: 4px;">
                      <span style="background: ${dangerColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">
                        ${dangerStatus}
                      </span>
                    </div>
                    <div style="color: #cbd5e1; font-size: 12px;">
                      ${site.category} • Inscribed ${site.date_inscribed}
                    </div>
                  </div>
                `,
                style: {
                  backgroundColor: 'transparent',
                  color: 'white'
                }
              };
            }

            return null;
          },
        });
        
        // Add deck.gl overlay to map
        map.addControl(deckOverlay);
        
        // Store deckOverlay reference for layer updates
        (map as any)._deckOverlay = deckOverlay;

      } catch (error) {
        console.error('Error adding layers:', error);
      }
    });

    map.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      map.remove();
    };
  }, []);

  // UNESCO layers loaded separately due to async nature
  const unescoLayersRef = useRef<any[]>([]);
  
  // Weather precipitation layers loaded separately due to async nature
  const [precipitationLayers, setPrecipitationLayers] = useState<any[]>([]);

  // Refactored layer management using native deck.gl patterns with useMemo
  const layers = useMemo(() => {
    const allLayers: any[] = [];
    
    // 1. Terminator layer with native visibility and updateTriggers - direct function call
    const terminatorLayer = createTerminatorLayer(currentTime);
    if (terminatorLayer) {
      allLayers.push(terminatorLayer.clone({
        visible: showTerminator,
        updateTriggers: {
          getPath: currentTime.getTime()
        }
      }));
    }

    // 2. Mountains layers with native visibility
    const mountainsLayers = createMountainsLayers(currentZoom);
    mountainsLayers.forEach(layer => {
      allLayers.push(layer.clone({
        visible: showMountains
      }));
    });

    // 3. UNESCO layers with native visibility (async-safe)
    if (unescoLayersRef.current) {
      unescoLayersRef.current.forEach(layer => {
        allLayers.push(layer.clone({
          visible: showUnesco
        }));
      });
    }

    // 4. City times layers with native visibility - moved AFTER UNESCO to render on top
    const cityTimesLayers = createCityTimesLayers(cities, currentTime);
    cityTimesLayers.forEach(layer => {
      allLayers.push(layer.clone({
        visible: showCities,
        updateTriggers: {
          getText: currentTime.getMinutes(),
          getPosition: cities.map(c => c.id).join(',')
        }
      }));
    });

    // 5. Weather precipitation layers with native visibility (async-safe)
    if (showPrecipitation && precipitationLayers.length > 0) {
      precipitationLayers.forEach(layer => {
        allLayers.push(layer.clone({
          visible: showPrecipitation,
        }));
      });
    }

    console.log('🔄 Native layer management updated:', {
      terminator: showTerminator,
      cities: showCities,
      mountains: showMountains,
      unesco: showUnesco,
      precipitation: showPrecipitation,
      layerCount: allLayers.length
    });

    return allLayers;
  }, [showTerminator, showCities, showMountains, showUnesco, showPrecipitation, currentTime, cities, currentZoom, weatherDataTimestamp, precipitationLayers]);
  
  // Load UNESCO layers once
  useEffect(() => {
    createUnescoLayers().then(layers => {
      unescoLayersRef.current = layers;
    });
  }, []);

  // Load weather precipitation layers - Using REAL timestamps from metadata
  useEffect(() => {
    if (showPrecipitation && isPrecipitationLayerConfigured()) {
      console.log('🌦️ Loading weather precipitation layers...');
      createWeatherPrecipitationLayer().then(result => {
        if (result && result.layers && result.layers.length > 0) {
          console.log(`✅ Weather precipitation layers loaded successfully (${result.layers.length} tiles)`);
          console.log(`✅ Using REAL timestamp: ${result.timestamp.toISOString()}`);
          
          // Update the store with the REAL download timestamp
          setWeatherDataTimestamp(result.timestamp);
          setPrecipitationLayers(result.layers);
        } else {
          console.error('❌ Failed to create weather precipitation layers');
          setPrecipitationLayers([]);
        }
      }).catch(error => {
        console.error('❌ Error loading weather precipitation layers:', error);
        setPrecipitationLayers([]);
      });
    } else {
      if (!showPrecipitation) {
        console.log('🌦️ Weather precipitation layers disabled by user');
      }
      setPrecipitationLayers([]);
    }
  }, [showPrecipitation, setWeatherDataTimestamp]);

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

            </div>
          </div>

          {/* Weather Section */}
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Weather</h3>
            <div className="space-y-3">

              {/* Precipitation Radar */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                      <path d="M12 3l-1.5 4.5h-3L6 9l1.5 1.5H11l1-3 1 3h3.5L18 9l-1.5-1.5h-3L12 3zm0 8.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-blue-100 font-medium">Precipitation Radar</div>
                    <div className="text-blue-300 text-xs">
                      {weatherDataTimestamp && `Updated ${weatherDataTimestamp.toLocaleTimeString()}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={togglePrecipitation}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    showPrecipitation ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    showPrecipitation ? 'translate-x-6' : 'translate-x-1'
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

      {/* Overlay for closing panel when clicking outside */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/10 z-10"
          onClick={toggleMenu}
        />
      )}

    </div>
  );
};

export default Map;
