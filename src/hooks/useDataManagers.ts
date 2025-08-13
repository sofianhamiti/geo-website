/**
 * Custom hook for managing data managers (ISS, Hurricane, Earthquake)
 * Consolidates all manager initialization and cleanup logic
 */

import { useEffect } from 'react';
import { 
  createISSLayers, 
  isISSTrackingConfigured 
} from '../layers/ISSLayer';
import { 
  createHurricaneLayers, 
  isHurricaneLayerConfigured 
} from '../layers/HurricaneLayer';
import { 
  createEarthquakeLayers, 
  isEarthquakeLayerConfigured 
} from '../layers/EarthquakeLayer';
import { 
  createTimeZonesLayers, 
  isTimeZonesLayerConfigured 
} from '../layers/TimeZonesLayer';

interface ManagerState {
  showISS: boolean;
  showHurricanes: boolean;
  showEarthquakes: boolean;
  showTimezones: boolean;
  issManager: any;
  hurricaneManager: any;
  earthquakeManager: any;
}

interface ManagerActions {
  initializeISSManager: () => Promise<void>;
  destroyISSManager: () => void;
  initializeHurricaneManager: () => Promise<void>;
  destroyHurricaneManager: () => void;
  initializeEarthquakeManager: () => Promise<void>;
  destroyEarthquakeManager: () => void;
  setISSLayers: (layers: any[]) => void;
  setHurricaneLayers: (layers: any[]) => void;
  setEarthquakeLayers: (layers: any[]) => void;
  setTimezoneLayers: (layers: any[]) => void;
  setHurricaneLastUpdate: (date: Date) => void;
  setEarthquakeLastUpdate: (date: Date) => void;
}

export const useDataManagers = (
  state: ManagerState,
  actions: ManagerActions,
  currentTime: Date,
  currentZoom: number,
  handleISSClick?: (info: any) => void
) => {
  
  // ISS Manager Effects
  useEffect(() => {
    if (state.showISS && isISSTrackingConfigured() && !state.issManager) {
      actions.initializeISSManager();
    } else if (!state.showISS && state.issManager) {
      actions.destroyISSManager();
    }
  }, [state.showISS, state.issManager, actions.initializeISSManager, actions.destroyISSManager]);

  useEffect(() => {
    if (state.showISS && state.issManager) {
      try {
        const layers = createISSLayers(currentTime, handleISSClick);
        actions.setISSLayers(layers);
      } catch (error) {
        actions.setISSLayers([]);
      }
    } else {
      actions.setISSLayers([]);
    }
  }, [state.showISS, state.issManager, currentTime, actions.setISSLayers, handleISSClick]);

  // Hurricane Manager Effects
  useEffect(() => {
    if (state.showHurricanes && isHurricaneLayerConfigured() && !state.hurricaneManager) {
      actions.initializeHurricaneManager();
    } else if (!state.showHurricanes && state.hurricaneManager) {
      actions.destroyHurricaneManager();
    }
  }, [state.showHurricanes, state.hurricaneManager, actions.initializeHurricaneManager, actions.destroyHurricaneManager]);

  useEffect(() => {
    if (state.showHurricanes && state.hurricaneManager) {
      try {
        const layers = createHurricaneLayers(currentTime);
        actions.setHurricaneLayers(layers);
        actions.setHurricaneLastUpdate(new Date());
      } catch (error) {
        actions.setHurricaneLayers([]);
      }
    } else {
      actions.setHurricaneLayers([]);
    }
  }, [state.showHurricanes, state.hurricaneManager, currentTime, actions.setHurricaneLayers, actions.setHurricaneLastUpdate]);

  // Earthquake Manager Effects
  useEffect(() => {
    if (state.showEarthquakes && isEarthquakeLayerConfigured() && !state.earthquakeManager) {
      actions.initializeEarthquakeManager();
    } else if (!state.showEarthquakes && state.earthquakeManager) {
      actions.destroyEarthquakeManager();
    }
  }, [state.showEarthquakes, state.earthquakeManager, actions.initializeEarthquakeManager, actions.destroyEarthquakeManager]);

  useEffect(() => {
    if (state.showEarthquakes && state.earthquakeManager) {
      try {
        const layers = createEarthquakeLayers(currentTime, currentZoom);
        actions.setEarthquakeLayers(layers);
        actions.setEarthquakeLastUpdate(new Date());
      } catch (error) {
        actions.setEarthquakeLayers([]);
      }
    } else {
      actions.setEarthquakeLayers([]);
    }
  }, [state.showEarthquakes, state.earthquakeManager, currentTime, currentZoom, actions.setEarthquakeLayers, actions.setEarthquakeLastUpdate]);

  // Timezone Manager Effects
  useEffect(() => {
    if (state.showTimezones && isTimeZonesLayerConfigured()) {
      createTimeZonesLayers().then(layers => {
        if (layers && layers.length > 0) {
          actions.setTimezoneLayers(layers);
        } else {
          actions.setTimezoneLayers([]);
        }
      }).catch(() => {
        actions.setTimezoneLayers([]);
      });
    } else {
      actions.setTimezoneLayers([]);
    }
  }, [state.showTimezones, actions.setTimezoneLayers]);
};
