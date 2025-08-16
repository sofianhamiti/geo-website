/**
 * Custom hook for managing all map layers with optimized memoization
 * Extracts layer creation and management logic from Map component
 */

import { useMemo, useState, useEffect } from 'react';
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
  // Static layers (visibility-dependent only)
  const staticLayers = useMemo(() => {
    const layers: any[] = [];
    
    // Timezone layers
    if (layerData.timezoneLayers.length > 0) {
      layerData.timezoneLayers.forEach(layer => {
        layers.push(layer.clone({ visible: visibility.showTimezones }));
      });
    }
    
    return layers;
  }, [visibility.showTimezones, layerData.timezoneLayers]);

  // Zoom-dependent layers
  const zoomDependentLayers = useMemo(() => {
    const layers: any[] = [];
    
    const mountainsLayers = createMountainsLayers(currentZoom);
    mountainsLayers.forEach(layer => {
      layers.push(layer.clone({ visible: visibility.showMountains }));
    });
    
    return layers;
  }, [currentZoom, visibility.showMountains]);

  // UNESCO layers state (zoom-dependent for icon switching)
  const [unescoLayersState, setUnescoLayersState] = useState<any[]>([]);

  // Load/update UNESCO layers when zoom changes
  useEffect(() => {
    let mounted = true;
    
    createUnescoLayers(currentZoom).then(layers => {
      if (mounted) {
        setUnescoLayersState(layers);
      }
    });
    
    return () => {
      mounted = false;
      // Clear previous layers to prevent memory leaks
      setUnescoLayersState([]);
    };
  }, [currentZoom]);

  // UNESCO layers with visibility
  const unescoLayers = useMemo(() => {
    return unescoLayersState.map(layer => 
      layer.clone({ visible: visibility.showUnesco })
    );
  }, [unescoLayersState, visibility.showUnesco]);

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

  // Earthquake layers (bottom-most data layer)
  const earthquakeLayers = useMemo(() => {
    const layers: any[] = [];
    
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
    
    return layers;
  }, [visibility.showEarthquakes, layerData.earthquakeLayers, layerData.earthquakeLastUpdate, currentTime]);

  // Middle data layers (hurricanes and planes)
  const middleDataLayers = useMemo(() => {
    const layers: any[] = [];

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
    visibility.showHurricanes, layerData.hurricaneLayers, layerData.hurricaneLastUpdate,
    visibility.showPlanes, layerData.planeLayers, layerData.planeLastUpdate,
    currentTime
  ]);

  // ISS layers (top-most data layer)
  const issLayers = useMemo(() => {
    const layers: any[] = [];
    
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
    
    return layers;
  }, [visibility.showISS, layerData.issLayers, currentTime]);

  // Combine all layers (order matters - first layers render at bottom)
  const allLayers = useMemo(() => {
    return [
      ...earthquakeLayers,      // Bottom-most data layer
      ...staticLayers,
      ...unescoLayers,          // UNESCO layers (zoom-dependent)
      ...zoomDependentLayers,
      ...timeDependentLayers,
      ...middleDataLayers,      // Middle data layers (hurricanes, planes)
      ...issLayers              // Top-most data layer
    ];
  }, [earthquakeLayers, staticLayers, unescoLayers, zoomDependentLayers, timeDependentLayers, middleDataLayers, issLayers]);

  return allLayers;
};
