/**
 * Custom hook for managing all map layers with optimized memoization
 * Extracts layer creation and management logic from Map component
 */

import { useMemo, useRef, useEffect } from 'react';
import { createTerminatorLayer } from '../layers/TerminatorLayer';
import { createMountainsLayers } from '../layers/MountainsLayer';
import { createUnescoLayers } from '../layers/UnescoLayer';
import { createCityTimesLayers } from '../layers/CityTimesLayer';
import type { City } from '../services/simpleCityService';

interface LayerVisibility {
  showTerminator: boolean;
  showCities: boolean;
  showMountains: boolean;
  showUnesco: boolean;
  showTimezones: boolean;
  showISS: boolean;
  showHurricanes: boolean;
  showEarthquakes: boolean;
  showPlanes: boolean;
}

interface LayerData {
  issLayers: any[];
  hurricaneLayers: any[];
  earthquakeLayers: any[];
  planeLayers: any[];
  timezoneLayers: any[];
  hurricaneLastUpdate: Date | null;
  earthquakeLastUpdate: Date | null;
  planeLastUpdate: Date | null;
}

export const useMapLayers = (
  visibility: LayerVisibility,
  layerData: LayerData,
  currentTime: Date,
  currentZoom: number,
  cities: City[],
) => {
  const unescoLayersRef = useRef<any[]>([]);

  // Load UNESCO layers once
  useEffect(() => {
    createUnescoLayers().then(layers => {
      unescoLayersRef.current = layers;
    });
  }, []);

  // Static layers (visibility-dependent only)
  const staticLayers = useMemo(() => {
    const layers: any[] = [];
    
    // UNESCO layers
    if (unescoLayersRef.current) {
      unescoLayersRef.current.forEach(layer => {
        layers.push(layer.clone({ visible: visibility.showUnesco }));
      });
    }
    
    // Timezone layers
    if (layerData.timezoneLayers.length > 0) {
      layerData.timezoneLayers.forEach(layer => {
        layers.push(layer.clone({ visible: visibility.showTimezones }));
      });
    }
    
    return layers;
  }, [visibility.showUnesco, visibility.showTimezones, layerData.timezoneLayers]);

  // Zoom-dependent layers
  const zoomDependentLayers = useMemo(() => {
    const layers: any[] = [];
    
    const mountainsLayers = createMountainsLayers(currentZoom);
    mountainsLayers.forEach(layer => {
      layers.push(layer.clone({ visible: visibility.showMountains }));
    });
    
    return layers;
  }, [currentZoom, visibility.showMountains]);

  // Time-dependent layers
  const timeDependentLayers = useMemo(() => {
    const layers: any[] = [];
    
    // Terminator layer
    const terminatorLayer = createTerminatorLayer(currentTime);
    if (terminatorLayer) {
      layers.push(terminatorLayer.clone({
        visible: visibility.showTerminator,
        updateTriggers: { getPath: currentTime.getTime() }
      }));
    }

    // City times layers
    const cityTimesLayers = createCityTimesLayers(cities, currentTime);
    cityTimesLayers.forEach(layer => {
      layers.push(layer.clone({
        visible: visibility.showCities,
        updateTriggers: {
          getText: currentTime.getMinutes(),
          getPosition: cities.map(c => c.id).join(',')
        }
      }));
    });
    
    return layers;
  }, [currentTime, visibility.showTerminator, visibility.showCities, cities]);

  // Data-dependent layers
  const dataDependentLayers = useMemo(() => {
    const layers: any[] = [];

    // ISS tracking layers
    if (visibility.showISS && layerData.issLayers.length > 0) {
      layerData.issLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: visibility.showISS,
          updateTriggers: {
            getPosition: currentTime.getTime(),
            getText: currentTime.getTime(),
            getPath: currentTime.getTime(),
          }
        }));
      });
    }

    // Hurricane tracking layers
    if (visibility.showHurricanes && layerData.hurricaneLayers.length > 0) {
      layerData.hurricaneLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: visibility.showHurricanes,
          updateTriggers: {
            getPosition: layerData.hurricaneLastUpdate?.getTime() || currentTime.getTime(),
            getText: layerData.hurricaneLastUpdate?.getTime() || currentTime.getTime(),
            getAngle: Math.floor(Date.now() / 100),
          }
        }));
      });
    }

    // Earthquake tracking layers
    if (visibility.showEarthquakes && layerData.earthquakeLayers.length > 0) {
      layerData.earthquakeLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: visibility.showEarthquakes,
          updateTriggers: {
            getPosition: layerData.earthquakeLastUpdate?.getTime() || currentTime.getTime(),
            getFillColor: layerData.earthquakeLastUpdate?.getTime() || currentTime.getTime(),
            getRadius: layerData.earthquakeLastUpdate?.getTime() || currentTime.getTime(),
            getText: layerData.earthquakeLastUpdate?.getTime() || currentTime.getTime(),
          }
        }));
      });
    }

    // Planes tracking layers
    if (visibility.showPlanes && layerData.planeLayers.length > 0) {
      layerData.planeLayers.forEach(layer => {
        layers.push(layer.clone({
          visible: visibility.showPlanes,
          updateTriggers: {
            getPosition: layerData.planeLastUpdate?.getTime() || currentTime.getTime(),
            getSize: layerData.planeLastUpdate?.getTime() || currentTime.getTime(),
            getColor: layerData.planeLastUpdate?.getTime() || currentTime.getTime(),
            getAngle: layerData.planeLastUpdate?.getTime() || currentTime.getTime(),
          }
        }));
      });
    }
    
    return layers;
  }, [
    visibility.showISS, layerData.issLayers, currentTime,
    visibility.showHurricanes, layerData.hurricaneLayers, layerData.hurricaneLastUpdate,
    visibility.showEarthquakes, layerData.earthquakeLayers, layerData.earthquakeLastUpdate,
    visibility.showPlanes, layerData.planeLayers, layerData.planeLastUpdate
  ]);

  // Combine all layers
  const allLayers = useMemo(() => {
    return [
      ...staticLayers,
      ...zoomDependentLayers,
      ...timeDependentLayers,
      ...dataDependentLayers
    ];
  }, [staticLayers, zoomDependentLayers, timeDependentLayers, dataDependentLayers]);

  return allLayers;
};