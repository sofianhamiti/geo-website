/**
 * Unified Map Store - Replaces scattered global state
 * Uses Zustand for simple, reactive state management
 * Includes centralized time management for synchronized component updates
 */

import { create } from 'zustand';
import { City, DEFAULT_CITIES, loadUserCities, saveUserCities } from '../services/simpleCityService';
import { ISSManager } from '../layers/ISSLayer';
import { EarthquakeManager } from '../layers/EarthquakeLayer';
import { HurricaneManager } from '../layers/HurricaneLayer';
import { PlaneManager } from '../layers/PlanesLayer';

export interface MapState {
  // Map instance and status
  map: any | null;
  isMapLoaded: boolean;
  
  // Basemap selection
  selectedBasemap: 'usgs' | 'arcgis' | 'eox';
  
  // Layer visibility
  showArcgisPlaces: boolean;
  showTerminator: boolean;
  showCities: boolean;
  showMountains: boolean;
  showUnesco: boolean;
  showTimezones: boolean;
  
  
  // ISS tracking
  showISS: boolean;
  issLayers: any[];
  issManager: ISSManager | null;
  isISSLoading: boolean;
  
  // ISS video overlay
  issVideoVisible: boolean;
  issVideoPosition: [number, number] | null;
  
  // Hurricane tracking
  showHurricanes: boolean;
  hurricaneLayers: any[];
  hurricaneManager: HurricaneManager | null;
  hurricaneLastUpdate: Date | null;
  isHurricanesLoading: boolean;
  
  // Earthquake tracking
  showEarthquakes: boolean;
  earthquakeLayers: any[];
  earthquakeManager: EarthquakeManager | null;
  earthquakeLastUpdate: Date | null;
  isEarthquakesLoading: boolean;
  
  // Planes tracking
  showPlanes: boolean;
  planeLayers: any[];
  planeManager: PlaneManager | null;
  planeLastUpdate: Date | null;
  isPlanesLoading: boolean;
  
  // Timezone layers
  timezoneLayers: any[];
  
  // Menu state
  isMenuOpen: boolean;
  
  // Centralized time management
  currentTime: Date;
  lastUpdate: Date | null;
  
  // City management
  cities: City[];
  isAddingCity: boolean;
  
  // Actions
  setMap: (map: any | null) => void;
  setMapLoaded: (loaded: boolean) => void;
  setSelectedBasemap: (basemap: 'usgs' | 'arcgis' | 'eox') => void;
  toggleArcgisPlaces: () => void;
  toggleTerminator: () => void;
  toggleCities: () => void;
  toggleMountains: () => void;
  toggleUnesco: () => void;
  toggleTimezones: () => void;
  toggleMenu: () => void;
  setLastUpdate: (date: Date) => void;
  updateTime: () => void;
  
  
  // ISS actions
  toggleISS: () => void;
  setISSLayers: (layers: any[]) => void;
  initializeISSManager: () => Promise<void>;
  destroyISSManager: () => void;
  setISSLoading: (loading: boolean) => void;
  
  // ISS video actions
  setISSVideoVisible: (visible: boolean, position?: [number, number] | null) => void;
  hideISSVideo: () => void;
  
  // Hurricane actions
  toggleHurricanes: () => void;
  setHurricaneLayers: (layers: any[]) => void;
  initializeHurricaneManager: () => Promise<void>;
  destroyHurricaneManager: () => void;
  setHurricaneLastUpdate: (timestamp: Date | null) => void;
  setHurricanesLoading: (loading: boolean) => void;
  
  // Earthquake actions
  toggleEarthquakes: () => void;
  setEarthquakeLayers: (layers: any[]) => void;
  initializeEarthquakeManager: () => Promise<void>;
  destroyEarthquakeManager: () => void;
  setEarthquakeLastUpdate: (timestamp: Date | null) => void;
  setEarthquakesLoading: (loading: boolean) => void;
  
  // Planes actions
  togglePlanes: () => void;
  setPlaneLayers: (layers: any[]) => void;
  initializePlaneManager: () => Promise<void>;
  destroyPlaneManager: () => void;
  setPlaneLastUpdate: (timestamp: Date | null) => void;
  setPlanesLoading: (loading: boolean) => void;
  
  // Timezone actions
  setTimezoneLayers: (layers: any[]) => void;
  
  // City actions
  addCity: (city: City) => void;
  removeCity: (cityId: string) => void;
  resetToDefaults: () => void;
  setIsAddingCity: (adding: boolean) => void;
  loadSavedCities: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  map: null,
  isMapLoaded: false,
  selectedBasemap: 'eox', // Default to EOX Sentinel-2 Cloudless
  showArcgisPlaces: false,
  showTerminator: true,
  showCities: true,
  showMountains: false,
  showUnesco: false,
  showTimezones: false,
  showISS: false,
  issLayers: [],
  issManager: null,
  isISSLoading: false,
  issVideoVisible: false,
  issVideoPosition: null,
  showHurricanes: false,
  hurricaneLayers: [],
  hurricaneManager: null,
  hurricaneLastUpdate: null,
  isHurricanesLoading: false,
  showEarthquakes: false,
  earthquakeLayers: [],
  earthquakeManager: null,
  earthquakeLastUpdate: null,
  isEarthquakesLoading: false,
  showPlanes: false,
  planeLayers: [],
  planeManager: null,
  planeLastUpdate: null,
  isPlanesLoading: false,
  timezoneLayers: [],
  isMenuOpen: false,
  currentTime: new Date(),
  lastUpdate: null,
  cities: [...DEFAULT_CITIES], // Start with defaults
  isAddingCity: false,

  // Actions
  setMap: (map) => set({ map }),
  
  setMapLoaded: (loaded) => set({ isMapLoaded: loaded }),
  
  setSelectedBasemap: (basemap) => {
    const { map } = get();
    if (map && map.getLayer) {
      try {
        // Hide all basemap layers first
        if (map.getLayer('satellite-layer')) {
          map.setLayoutProperty('satellite-layer', 'visibility', 'none');
        }
        if (map.getLayer('arcgis-satellite-layer')) {
          map.setLayoutProperty('arcgis-satellite-layer', 'visibility', 'none');
        }
        if (map.getLayer('eox-sentinel-layer')) {
          map.setLayoutProperty('eox-sentinel-layer', 'visibility', 'none');
        }
        
        // Show the selected basemap
        let layerId: string;
        switch (basemap) {
          case 'usgs':
            layerId = 'satellite-layer';
            break;
          case 'arcgis':
            layerId = 'arcgis-satellite-layer';
            break;
          case 'eox':
            layerId = 'eox-sentinel-layer';
            break;
          default:
            layerId = 'satellite-layer';
        }
        
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
        
        // Basemap switched successfully
      } catch (error) {
        // Error switching basemap - continue silently
      }
    }
    set({ selectedBasemap: basemap });
  },
  
  toggleArcgisPlaces: () => {
    const { map, showArcgisPlaces } = get();
    const newShowArcgisPlaces = !showArcgisPlaces;
    
    if (map) {
      map.setLayoutProperty(
        'arcgis-places-layer', // Keep hardcoded since CONFIG import would create circular dependency
        'visibility',
        newShowArcgisPlaces ? 'visible' : 'none'
      );
    }
    
    set({ showArcgisPlaces: newShowArcgisPlaces });
  },
  
  toggleTerminator: () => {
    const currentState = get().showTerminator;
    const newState = !currentState;
    set({ showTerminator: newState });
  },
  
  toggleCities: () => {
    const currentState = get().showCities;
    const newState = !currentState;
    set({ showCities: newState });
  },
  
  toggleMountains: () => {
    const currentState = get().showMountains;
    const newState = !currentState;
    set({ showMountains: newState });
  },
  
  toggleUnesco: () => {
    const currentState = get().showUnesco;
    const newState = !currentState;
    set({ showUnesco: newState });
  },
  
  toggleTimezones: () => {
    const currentState = get().showTimezones;
    const newState = !currentState;
    set({ showTimezones: newState });
  },
  
  toggleMenu: () => {
    set({ isMenuOpen: !get().isMenuOpen });
  },
  
  setLastUpdate: (date) => set({ lastUpdate: date }),
  
  // Centralized time management
  updateTime: () => {
    const now = new Date();
    set({
      currentTime: now,
      lastUpdate: now
    });
  },


  // ISS actions
  toggleISS: () => {
    const currentState = get().showISS;
    const newState = !currentState;
    
    if (!newState) {
      // If disabling ISS, cleanup manager
      const { issManager } = get();
      if (issManager) {
        issManager.destroy();
        set({ issManager: null, issLayers: [] });
      }
    }
    
    set({ showISS: newState });
  },

  setISSLayers: (layers) => {
    set({ issLayers: layers });
  },

  initializeISSManager: async () => {
    const { issManager } = get();
    if (issManager) return; // Already initialized

    try {
      set({ isISSLoading: true });
      const manager = new ISSManager();
      await manager.initialize();
      set({ issManager: manager, isISSLoading: false });
    } catch (error) {
      set({ isISSLoading: false });
    }
  },

  destroyISSManager: () => {
    const { issManager } = get();
    if (issManager) {
      issManager.destroy();
      set({ issManager: null, issLayers: [], showISS: false });
    }
  },

  setISSLoading: (loading) => {
    set({ isISSLoading: loading });
  },

  // ISS video actions
  setISSVideoVisible: (visible, position = null) => {
    set({ 
      issVideoVisible: visible, 
      issVideoPosition: position 
    });
  },

  hideISSVideo: () => {
    set({
      issVideoVisible: false,
      issVideoPosition: null
    });
  },

  // Hurricane actions
  toggleHurricanes: () => {
    const currentState = get().showHurricanes;
    const newState = !currentState;
    
    if (!newState) {
      // If disabling hurricanes, cleanup manager
      const { hurricaneManager } = get();
      if (hurricaneManager) {
        hurricaneManager.stop();
        set({ hurricaneManager: null, hurricaneLayers: [] });
      }
    }
    
    set({ showHurricanes: newState });
  },

  setHurricaneLayers: (layers) => {
    set({ hurricaneLayers: layers });
  },

  initializeHurricaneManager: async () => {
    const { hurricaneManager } = get();
    if (hurricaneManager) {
      return; // Already initialized
    }

    try {
      set({ isHurricanesLoading: true });
      const manager = new HurricaneManager();
      await manager.start();
      set({ hurricaneManager: manager, isHurricanesLoading: false });
    } catch (error) {
      set({ isHurricanesLoading: false });
      console.error('❌ Failed to initialize Hurricane Manager:', error);
      throw error;
    }
  },

  destroyHurricaneManager: () => {
    const { hurricaneManager } = get();
    if (hurricaneManager) {
      hurricaneManager.stop();
      set({ hurricaneManager: null, hurricaneLayers: [], showHurricanes: false });
    }
  },

  setHurricaneLastUpdate: (timestamp) => {
    set({ hurricaneLastUpdate: timestamp });
  },

  setHurricanesLoading: (loading) => {
    set({ isHurricanesLoading: loading });
  },

  // Earthquake actions
  toggleEarthquakes: () => {
    const currentState = get().showEarthquakes;
    const newState = !currentState;
    
    if (!newState) {
      // If disabling earthquakes, cleanup manager
      const { earthquakeManager } = get();
      if (earthquakeManager) {
        earthquakeManager.destroy();
        set({ earthquakeManager: null, earthquakeLayers: [] });
      }
    }
    
    set({ showEarthquakes: newState });
  },

  setEarthquakeLayers: (layers) => {
    set({ earthquakeLayers: layers });
  },

  initializeEarthquakeManager: async () => {
    const { earthquakeManager } = get();
    if (earthquakeManager) return; // Already initialized

    try {
      set({ isEarthquakesLoading: true });
      const manager = new EarthquakeManager();
      await manager.initialize();
      set({ earthquakeManager: manager, isEarthquakesLoading: false });
    } catch (error) {
      set({ isEarthquakesLoading: false });
    }
  },

  destroyEarthquakeManager: () => {
    const { earthquakeManager } = get();
    if (earthquakeManager) {
      earthquakeManager.destroy();
      set({ earthquakeManager: null, earthquakeLayers: [], showEarthquakes: false });
    }
  },

  setEarthquakeLastUpdate: (timestamp) => {
    set({ earthquakeLastUpdate: timestamp });
  },

  setEarthquakesLoading: (loading) => {
    set({ isEarthquakesLoading: loading });
  },

  // Planes actions
  togglePlanes: () => {
    const currentState = get().showPlanes;
    const newState = !currentState;
    
    if (!newState) {
      // If disabling planes, cleanup manager
      const { planeManager } = get();
      if (planeManager) {
        planeManager.destroy();
        set({ planeManager: null, planeLayers: [] });
      }
    }
    
    set({ showPlanes: newState });
  },

  setPlaneLayers: (layers) => {
    set({ planeLayers: layers });
  },

  initializePlaneManager: async () => {
    const { planeManager } = get();
    if (planeManager) return; // Already initialized

    try {
      set({ isPlanesLoading: true });
      const manager = new PlaneManager();
      await manager.initialize();
      set({ planeManager: manager, isPlanesLoading: false });
    } catch (error) {
      set({ isPlanesLoading: false });
    }
  },

  destroyPlaneManager: () => {
    const { planeManager } = get();
    if (planeManager) {
      planeManager.destroy();
      set({ planeManager: null, planeLayers: [], showPlanes: false });
    }
  },

  setPlaneLastUpdate: (timestamp) => {
    set({ planeLastUpdate: timestamp });
  },

  setPlanesLoading: (loading) => {
    set({ isPlanesLoading: loading });
  },

  // Timezone actions
  setTimezoneLayers: (layers) => {
    set({ timezoneLayers: layers });
  },

  // City management
  addCity: (city) => {
    const currentCities = get().cities;
    // Limit to 10 cities max
    if (currentCities.length >= 10) {
      console.warn('Maximum 10 cities allowed');
      return;
    }
    
    const newCities = [...currentCities, city];
    set({ cities: newCities });
    saveUserCities(newCities);
  },

  removeCity: (cityId) => {
    const newCities = get().cities.filter(city => city.id !== cityId);
    set({ cities: newCities });
    saveUserCities(newCities);
  },

  resetToDefaults: () => {
    const defaultCities = [...DEFAULT_CITIES];
    set({ cities: defaultCities });
    saveUserCities(defaultCities);
  },

  setIsAddingCity: (adding) => {
    set({ isAddingCity: adding });
  },

  loadSavedCities: () => {
    const savedCities = loadUserCities();
    set({ cities: savedCities });
  },
}));
