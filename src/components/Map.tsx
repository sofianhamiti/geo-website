import React, { useEffect, useState, useCallback } from 'react';
import { CONFIG } from '../config';
import { useMapStore } from '../store/mapStore';
import { useMapInstance } from '../hooks/useMapInstance';
import { useDataManagers } from '../hooks/useDataManagers';
import { useMapLayers } from '../hooks/useMapLayers';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import { MapControlPanel } from './MapControlPanel';
import ISSVideoOverlay from './ISSVideoOverlay';

const Map: React.FC = () => {
  const [currentZoom, setCurrentZoom] = useState(2);
  const [displayTime, setDisplayTime] = useState(new Date());

  // Get all state and actions from store
  const {
    map,
    isMapLoaded,
    selectedBasemap,
    showArcgisPlaces,
    showTerminator,
    showNight,
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
    nightStyle,
    timezoneLayers,
    isMenuOpen,
    currentTime,
    cities,
    showTrueColorEarth,
    trueColorEarthLayers,
    trueColorEarthManager,
    isTrueColorEarthLoading,
    showRainRadar,
    rainRadarLayers,
    rainRadarManager,
    rainRadarLastUpdate,
    isRainRadarLoading,
    showAurora,
    auroraLayers,
    auroraManager,
    auroraLastUpdate,
    isAuroraLoading,
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
    setNightStyle,
    setTimezoneLayers,
    toggleTrueColorEarth,
    setTrueColorEarthLayers,
    initializeTrueColorEarthManager,
    destroyTrueColorEarthManager,
    toggleRainRadar,
    setRainRadarLayers,
    setRainRadarLastUpdate,
    initializeRainRadarManager,
    destroyRainRadarManager,
    toggleAurora,
    setAuroraLayers,
    setAuroraLastUpdate,
    initializeAuroraManager,
    destroyAuroraManager,
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
      setISSVideoVisible(true);
    }
  }, [setISSVideoVisible]);

  // Initialize map using custom hook
  const mapContainer = useMapInstance(setMap, setMapLoaded);

  // Handle data managers using custom hook
  useDataManagers(
    {
      showISS,
      showHurricanes,
      showEarthquakes,
      showTimezones,
      showTrueColorEarth,
      showRainRadar,
      showAurora,
      issManager,
      hurricaneManager,
      earthquakeManager,
      trueColorEarthManager,
      rainRadarManager,
      auroraManager,
    },
    {
      initializeISSManager,
      destroyISSManager,
      initializeHurricaneManager,
      destroyHurricaneManager,
      initializeEarthquakeManager,
      destroyEarthquakeManager,
      initializeTrueColorEarthManager,
      destroyTrueColorEarthManager,
      initializeRainRadarManager,
      destroyRainRadarManager,
      initializeAuroraManager,
      destroyAuroraManager,
      setISSLayers,
      setHurricaneLayers,
      setEarthquakeLayers,
      setTimezoneLayers,
      setTrueColorEarthLayers,
      setRainRadarLayers,
      setAuroraLayers,
      setHurricaneLastUpdate,
      setEarthquakeLastUpdate,
      setRainRadarLastUpdate,
      setAuroraLastUpdate,
    },
    currentTime,
    currentZoom,
    handleISSClick
  );

  // Generate layers using custom hook
  const layers = useMapLayers(
    {
      showTerminator,
      showNight,
      showCities,
      showMountains,
      showUnesco,
      showTimezones,
      showISS,
      showHurricanes,
      showEarthquakes,
      showTrueColorEarth,
      showRainRadar,
      showAurora,
      nightStyle,
    },
    {
      issLayers,
      hurricaneLayers,
      earthquakeLayers,
      timezoneLayers,
      trueColorEarthLayers,
      rainRadarLayers,
      auroraLayers,
      hurricaneLastUpdate,
      earthquakeLastUpdate,
      rainRadarLastUpdate,
      auroraLastUpdate,
    },
    currentTime,
    currentZoom,
    cities
  );

  // Animation loop for pulsing earthquake markers (runs at 60fps via rAF)
  useAnimationLoop();

  // Load saved cities on mount
  useEffect(() => {
    loadSavedCities();
  }, [loadSavedCities]);

  // Update deck.gl overlay with new layers
  useEffect(() => {
    if (map && (map as any)._deckOverlay) {
      const overlay = (map as any)._deckOverlay;

      // Preserve animation-driven state so React re-renders don't flash stale values
      const hcAngle = (performance.now() * 360 / 10000) % 360;

      // Snapshot current animation state from the overlay (set by animation loop)
      const currentOverlayLayers: any[] = overlay._props?.layers || [];
      const rrOpacityMap: Record<string, number> = {};
      const eqAnimState: Record<string, { radiusScale: number; opacity: number }> = {};
      for (const l of currentOverlayLayers) {
        if (l.id?.startsWith('rain-radar-tiles-')) {
          rrOpacityMap[l.id] = l.props?.opacity ?? 0;
        }
        const eqMatch = l.id?.match(/^earthquake-pulse-ring-(\d)$/);
        if (eqMatch) {
          eqAnimState[l.id] = {
            radiusScale: l.props?.radiusScale ?? 1,
            opacity: l.props?.opacity ?? 0,
          };
        }
      }

      const synced = layers.map((layer: any) => {
        if (layer.id === 'hurricane-positions') {
          return layer.clone({ getAngle: hcAngle });
        }
        // Preserve rain radar frame opacities from animation loop
        if (layer.id?.startsWith('rain-radar-tiles-') && layer.id in rrOpacityMap) {
          return layer.clone({ opacity: rrOpacityMap[layer.id] });
        }
        // Preserve earthquake pulse ring animation state
        if (layer.id in eqAnimState) {
          return layer.clone(eqAnimState[layer.id]);
        }
        return layer;
      });
      overlay.setProps({ layers: synced });
    }
  }, [layers, map]);

  // Time updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateTime();
    }, CONFIG.app.updateFrequency);

    return () => clearInterval(interval);
  }, [updateTime]);

  // Display time updates (1-second precision)
  useEffect(() => {
    const displayInterval = setInterval(() => {
      setDisplayTime(new Date());
    }, 1000);

    return () => clearInterval(displayInterval);
  }, []);

  // Zoom tracking
  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    return () => map.off('zoomend', handleZoomEnd);
  }, [map]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading Screen */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading World Map...</p>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <MapControlPanel
        isMenuOpen={isMenuOpen}
        selectedBasemap={selectedBasemap}
        showArcgisPlaces={showArcgisPlaces}
        showTimezones={showTimezones}
        showMountains={showMountains}
        showUnesco={showUnesco}
        showCities={showCities}
        showTerminator={showTerminator}
        showISS={showISS}
        showEarthquakes={showEarthquakes}
        showHurricanes={showHurricanes}
        isISSLoading={isISSLoading}
        isEarthquakesLoading={isEarthquakesLoading}
        isHurricanesLoading={isHurricanesLoading}
        earthquakeLastUpdate={earthquakeLastUpdate}
        hurricaneLastUpdate={hurricaneLastUpdate}
        hurricaneLayerCount={hurricaneLayers.length}
        showTrueColorEarth={showTrueColorEarth}
        isTrueColorEarthLoading={isTrueColorEarthLoading}
        showRainRadar={showRainRadar}
        isRainRadarLoading={isRainRadarLoading}
        rainRadarLastUpdate={rainRadarLastUpdate}
        showAurora={showAurora}
        isAuroraLoading={isAuroraLoading}
        auroraLastUpdate={auroraLastUpdate}
        currentTime={currentTime}
        onToggleMenu={toggleMenu}
        onSetSelectedBasemap={setSelectedBasemap}
        onToggleArcgisPlaces={toggleArcgisPlaces}
        onToggleTimezones={toggleTimezones}
        onToggleMountains={toggleMountains}
        onToggleUnesco={toggleUnesco}
        onToggleCities={toggleCities}
        onToggleTerminator={toggleTerminator}
        onToggleISS={toggleISS}
        onToggleEarthquakes={toggleEarthquakes}
        onToggleHurricanes={toggleHurricanes}
        onToggleTrueColorEarth={toggleTrueColorEarth}
        onToggleRainRadar={toggleRainRadar}
        onToggleAurora={toggleAurora}
        nightStyle={nightStyle}
        onSetNightStyle={setNightStyle}
      />

      {/* Date/Time Display */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="text-blue-100/60 text-sm font-medium tracking-wide antialiased text-center">
          {displayTime.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div className="text-blue-100 text-3xl font-bold tracking-widest antialiased text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontFeatureSettings: '"tnum"' }}>
          {displayTime.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {/* ISS Video Overlay */}
      <ISSVideoOverlay />
    </div>
  );
};

export default Map;
