/**
 * Custom hook for map initialization and configuration
 * Extracts map creation logic from the main Map component
 */

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { createLayerTooltip } from '../utils/tooltipFactory';
import { CONFIG } from '../config';

export const useMapInstance = (
  onMapLoaded: (map: maplibregl.Map) => void,
  onMapLoad: (loaded: boolean) => void
) => {
  const mapContainer = useRef<HTMLDivElement>(null);

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
            tileSize: 256,
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
            layout: { 'visibility': 'visible' },
          },
          {
            id: CONFIG.layerIds.arcgisSatellite,
            type: 'raster',
            source: CONFIG.sourceIds.arcgisSatellite,
            layout: { 'visibility': 'none' },
          },
          {
            id: CONFIG.layerIds.arcgisPlaces,
            type: 'raster',
            source: CONFIG.sourceIds.arcgisPlaces,
            paint: { 'raster-opacity': CONFIG.styles.arcgisPlaces.opacity },
            layout: { 'visibility': 'none' },
          },
        ],
      },
      center: CONFIG.map.center,
      zoom: CONFIG.map.zoom.default,
      minZoom: CONFIG.map.zoom.min,
      maxZoom: CONFIG.map.zoom.max,
      dragRotate: false,
      touchZoomRotate: false,
      pitchWithRotate: false,
      keyboard: false,
      attributionControl: false,
    });

    // Memory optimizations
    try {
      const mapWithPrivateProps = map as any;
      if ('_maxTileCacheSize' in mapWithPrivateProps) {
        mapWithPrivateProps._maxTileCacheSize = 50;
      }
      if ('_collectResourceTiming' in mapWithPrivateProps) {
        mapWithPrivateProps._collectResourceTiming = false;
      }
    } catch (error) {
      // Silent fallback
    }

    map.on('load', () => {
      onMapLoad(true);
      onMapLoaded(map);

      try {
        // Add attribution control
        const attribution = new maplibregl.AttributionControl({
          compact: true,
          customAttribution: []
        });
        map.addControl(attribution, 'bottom-right');

        // Initialize deck.gl overlay
        const deckOverlay = new MapboxOverlay({
          interleaved: false,
          getTooltip: ({object, layer}) => createLayerTooltip(object, layer),
        });
        
        map.addControl(deckOverlay);
        (map as any)._deckOverlay = deckOverlay;
      } catch (error) {
        // Silent fallback
      }
    });

    map.on('error', () => {
      // Silent error handling
    });

    return () => {
      map.remove();
    };
  }, [onMapLoaded, onMapLoad]);

  return mapContainer;
};