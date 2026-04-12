import { useEffect, useRef } from 'react';
import { createISSLayers } from '../layers/ISSLayer';
import { createHurricaneLayers } from '../layers/HurricaneLayer';
import { createEarthquakeLayers } from '../layers/EarthquakeLayer';
import { createTimeZonesLayers } from '../layers/TimeZonesLayer';
import { createTrueColorEarthLayers } from '../layers/TrueColorEarthLayer';
import { createRainRadarLayers, getRainRadarRevision } from '../layers/RainRadarLayer';
import { createAuroraLayers, getAuroraRevision } from '../layers/AuroraLayer';

interface ManagerState {
  showISS: boolean;
  showHurricanes: boolean;
  showEarthquakes: boolean;
  showTimezones: boolean;
  showTrueColorEarth: boolean;
  showRainRadar: boolean;
  showAurora: boolean;
  issManager: any;
  hurricaneManager: any;
  earthquakeManager: any;
  trueColorEarthManager: any;
  rainRadarManager: any;
  auroraManager: any;
}

interface ManagerActions {
  initializeISSManager: () => Promise<void>;
  destroyISSManager: () => void;
  initializeHurricaneManager: () => Promise<void>;
  destroyHurricaneManager: () => void;
  initializeEarthquakeManager: () => Promise<void>;
  destroyEarthquakeManager: () => void;
  initializeTrueColorEarthManager: () => Promise<void>;
  destroyTrueColorEarthManager: () => void;
  initializeRainRadarManager: () => Promise<void>;
  destroyRainRadarManager: () => void;
  initializeAuroraManager: () => Promise<void>;
  destroyAuroraManager: () => void;
  setISSLayers: (layers: any[]) => void;
  setHurricaneLayers: (layers: any[]) => void;
  setEarthquakeLayers: (layers: any[]) => void;
  setTimezoneLayers: (layers: any[]) => void;
  setTrueColorEarthLayers: (layers: any[]) => void;
  setRainRadarLayers: (layers: any[]) => void;
  setAuroraLayers: (layers: any[]) => void;
  setHurricaneLastUpdate: (date: Date) => void;
  setEarthquakeLastUpdate: (date: Date) => void;
  setRainRadarLastUpdate: (date: Date) => void;
  setAuroraLastUpdate: (date: Date) => void;
}

export const useDataManagers = (
  state: ManagerState,
  actions: ManagerActions,
  currentTime: Date,
  currentZoom: number,
  handleISSClick?: (info: any) => void
) => {
  // Track data revisions to avoid unnecessary layer recreation
  const lastRainRadarRevRef = useRef(-1);
  const lastAuroraRevRef = useRef(-1);

  // ISS Manager Effects
  useEffect(() => {
    if (state.showISS && !state.issManager) {
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
    if (state.showHurricanes && !state.hurricaneManager) {
      actions.initializeHurricaneManager();
    } else if (!state.showHurricanes && state.hurricaneManager) {
      actions.destroyHurricaneManager();
    }
  }, [state.showHurricanes, state.hurricaneManager, actions.initializeHurricaneManager, actions.destroyHurricaneManager]);

  useEffect(() => {
    if (state.showHurricanes && state.hurricaneManager) {
      try {
        const layers = createHurricaneLayers(0);
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
    if (state.showEarthquakes && !state.earthquakeManager) {
      actions.initializeEarthquakeManager();
    } else if (!state.showEarthquakes && state.earthquakeManager) {
      actions.destroyEarthquakeManager();
    }
  }, [state.showEarthquakes, state.earthquakeManager, actions.initializeEarthquakeManager, actions.destroyEarthquakeManager]);

  useEffect(() => {
    if (state.showEarthquakes && state.earthquakeManager) {
      try {
        const layers = createEarthquakeLayers(currentTime, currentZoom, 0);
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
    if (state.showTimezones) {
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

  // True-Color Earth Manager Effects
  useEffect(() => {
    if (state.showTrueColorEarth && !state.trueColorEarthManager) {
      actions.initializeTrueColorEarthManager();
    } else if (!state.showTrueColorEarth && state.trueColorEarthManager) {
      actions.destroyTrueColorEarthManager();
    }
  }, [state.showTrueColorEarth, state.trueColorEarthManager, actions.initializeTrueColorEarthManager, actions.destroyTrueColorEarthManager]);

  useEffect(() => {
    if (state.showTrueColorEarth && state.trueColorEarthManager) {
      try {
        const layers = createTrueColorEarthLayers();
        actions.setTrueColorEarthLayers(layers);
      } catch {
        actions.setTrueColorEarthLayers([]);
      }
    } else {
      actions.setTrueColorEarthLayers([]);
    }
  }, [state.showTrueColorEarth, state.trueColorEarthManager, currentTime, actions.setTrueColorEarthLayers]);

  // Rain Radar Manager Effects
  useEffect(() => {
    if (state.showRainRadar && !state.rainRadarManager) {
      actions.initializeRainRadarManager();
    } else if (!state.showRainRadar && state.rainRadarManager) {
      actions.destroyRainRadarManager();
    }
  }, [state.showRainRadar, state.rainRadarManager, actions.initializeRainRadarManager, actions.destroyRainRadarManager]);

  // Rain radar: recreate layers only when manifest data changes (revision-based)
  useEffect(() => {
    if (state.showRainRadar && state.rainRadarManager) {
      const rev = getRainRadarRevision();
      if (rev !== lastRainRadarRevRef.current) {
        lastRainRadarRevRef.current = rev;
        try {
          const layers = createRainRadarLayers();
          actions.setRainRadarLayers(layers);
          actions.setRainRadarLastUpdate(new Date());
        } catch {
          actions.setRainRadarLayers([]);
        }
      }
    } else {
      actions.setRainRadarLayers([]);
      lastRainRadarRevRef.current = -1;
    }
  }, [state.showRainRadar, state.rainRadarManager, currentTime, actions.setRainRadarLayers, actions.setRainRadarLastUpdate]);

  // Aurora Manager Effects
  useEffect(() => {
    if (state.showAurora && !state.auroraManager) {
      actions.initializeAuroraManager();
    } else if (!state.showAurora && state.auroraManager) {
      actions.destroyAuroraManager();
    }
  }, [state.showAurora, state.auroraManager, actions.initializeAuroraManager, actions.destroyAuroraManager]);

  // Aurora: recreate layers only when forecast data changes (revision-based)
  useEffect(() => {
    if (state.showAurora && state.auroraManager) {
      const rev = getAuroraRevision();
      if (rev !== lastAuroraRevRef.current) {
        lastAuroraRevRef.current = rev;
        try {
          const layers = createAuroraLayers();
          actions.setAuroraLayers(layers);
          actions.setAuroraLastUpdate(new Date());
        } catch {
          actions.setAuroraLayers([]);
        }
      }
    } else {
      actions.setAuroraLayers([]);
      lastAuroraRevRef.current = -1;
    }
  }, [state.showAurora, state.auroraManager, currentTime, actions.setAuroraLayers, actions.setAuroraLastUpdate]);
};
