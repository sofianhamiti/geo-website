import { create } from 'zustand';
import { City, DEFAULT_CITIES, loadUserCities, saveUserCities } from '../services/simpleCityService';
import { ISSManager } from '../layers/ISSLayer';
import { EarthquakeManager } from '../layers/EarthquakeLayer';
import { HurricaneManager } from '../layers/HurricaneLayer';


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

  // Projection
  projection: 'mercator' | 'globe';

  // Night visualization
  showNight: boolean;
  nightStyle: 'off' | 'shadow' | 'masked';

  // Timezone layers
  timezoneLayers: any[];
  
  // Menu state
  isMenuOpen: boolean;
  
  // Centralized time management
  currentTime: Date;
  
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
  updateTime: () => void;
  
  
  // ISS actions
  toggleISS: () => void;
  setISSLayers: (layers: any[]) => void;
  initializeISSManager: () => Promise<void>;
  destroyISSManager: () => void;
  setISSLoading: (loading: boolean) => void;
  
  // ISS video actions
  setISSVideoVisible: (visible: boolean) => void;
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

  setProjection: (projection: 'mercator' | 'globe') => void;
  toggleNight: () => void;
  setNightStyle: (style: 'off' | 'shadow' | 'masked') => void;

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
  showTerminator: false,
  showCities: true,
  showMountains: false,
  showUnesco: false,
  showTimezones: false,
  showISS: false,
  issLayers: [],
  issManager: null,
  isISSLoading: false,
  issVideoVisible: false,
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
  earthquakeStyle: 'current' as 'current' | 'A' | 'B' | 'C',
  projection: 'mercator' as 'mercator' | 'globe',
  showNight: true,
  nightStyle: 'shadow' as 'off' | 'shadow' | 'masked',
  timezoneLayers: [],
  isMenuOpen: false,
  currentTime: new Date(),
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
        
      } catch (error) {
        // Continue silently on error
      }
    }
    set({ selectedBasemap: basemap });
  },
  
  toggleArcgisPlaces: () => {
    const { map, showArcgisPlaces } = get();
    const newShowArcgisPlaces = !showArcgisPlaces;
    
    if (map) {
      map.setLayoutProperty(
        'arcgis-places-layer',
        'visibility',
        newShowArcgisPlaces ? 'visible' : 'none'
      );
    }
    
    set({ showArcgisPlaces: newShowArcgisPlaces });
  },
  
  toggleTerminator: () => set({ showTerminator: !get().showTerminator }),
  toggleCities: () => set({ showCities: !get().showCities }),
  toggleMountains: () => set({ showMountains: !get().showMountains }),
  toggleUnesco: () => set({ showUnesco: !get().showUnesco }),
  toggleTimezones: () => set({ showTimezones: !get().showTimezones }),
  
  toggleMenu: () => {
    set({ isMenuOpen: !get().isMenuOpen });
  },
  
  updateTime: () => {
    set({ currentTime: new Date() });
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

  setISSVideoVisible: (visible) => {
    set({ issVideoVisible: visible });
  },

  hideISSVideo: () => {
    set({ issVideoVisible: false });
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

  setProjection: (projection) => set({ projection }),

  toggleNight: () => set({ showNight: !get().showNight }),

  setNightStyle: (style) => {
    set({
      nightStyle: style,
      showNight: style !== 'off',
    });
  },

  // Timezone actions
  setTimezoneLayers: (layers) => {
    set({ timezoneLayers: layers });
  },

  // City management
  addCity: (city) => {
    const currentCities = get().cities;
    // Limit to 10 cities max
    if (currentCities.length >= 10) return;
    
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
