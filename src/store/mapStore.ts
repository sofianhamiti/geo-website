/**
 * Unified Map Store - Replaces scattered global state
 * Uses Zustand for simple, reactive state management
 * Includes centralized time management for synchronized component updates
 */

import { create } from 'zustand';
import { City, DEFAULT_CITIES, loadUserCities, saveUserCities } from '../services/simpleCityService';

export interface MapState {
  // Map instance and status
  map: any | null;
  isMapLoaded: boolean;
  
  // Layer visibility
  showArcgisPlaces: boolean;
  showTerminator: boolean;
  showCities: boolean;
  showMountains: boolean;
  showUnesco: boolean;
  
  // Weather layers
  showPrecipitation: boolean;
  weatherDataTimestamp: Date | null;
  isWeatherLoading: boolean;
  
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
  toggleArcgisPlaces: () => void;
  toggleTerminator: () => void;
  toggleCities: () => void;
  toggleMountains: () => void;
  toggleUnesco: () => void;
  toggleMenu: () => void;
  setLastUpdate: (date: Date) => void;
  updateTime: () => void;
  
  // Weather actions
  togglePrecipitation: () => void;
  setWeatherDataTimestamp: (timestamp: Date | null) => void;
  setWeatherLoading: (loading: boolean) => void;
  
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
  showArcgisPlaces: false,
  showTerminator: true,
  showCities: true,
  showMountains: false,
  showUnesco: false,
  showPrecipitation: false,
  weatherDataTimestamp: null,
  isWeatherLoading: false,
  isMenuOpen: false,
  currentTime: new Date(),
  lastUpdate: null,
  cities: [...DEFAULT_CITIES], // Start with defaults
  isAddingCity: false,

  // Actions
  setMap: (map) => set({ map }),
  
  setMapLoaded: (loaded) => set({ isMapLoaded: loaded }),
  
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
    console.log('✅ ArcGIS Places toggled:', newShowArcgisPlaces, '- Menu stays open');
  },
  
  toggleTerminator: () => {
    const currentState = get().showTerminator;
    const newState = !currentState;
    console.log('✅ Terminator toggled:', { currentState, newState }, '- Menu stays open');
    set({ showTerminator: newState });
  },
  
  toggleCities: () => {
    const currentState = get().showCities;
    const newState = !currentState;
    console.log('✅ Cities toggled:', { currentState, newState }, '- Menu stays open');
    set({ showCities: newState });
  },
  
  toggleMountains: () => {
    const currentState = get().showMountains;
    const newState = !currentState;
    console.log('✅ Mountains toggled:', { currentState, newState }, '- Menu stays open');
    set({ showMountains: newState });
  },
  
  toggleUnesco: () => {
    const currentState = get().showUnesco;
    const newState = !currentState;
    console.log('✅ UNESCO sites toggled:', { currentState, newState }, '- Menu stays open');
    set({ showUnesco: newState });
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
    console.log('Centralized time updated:', now.toISOString());
  },

  // Weather actions
  togglePrecipitation: () => {
    const currentState = get().showPrecipitation;
    const newState = !currentState;
    console.log('✅ Precipitation toggled:', { currentState, newState }, '- Menu stays open');
    set({ showPrecipitation: newState });
  },

  setWeatherDataTimestamp: (timestamp) => {
    set({ weatherDataTimestamp: timestamp });
    console.log('✅ Weather data timestamp updated:', timestamp?.toISOString());
  },

  setWeatherLoading: (loading) => {
    set({ isWeatherLoading: loading });
    console.log('✅ Weather loading state:', loading);
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
    console.log('✅ City added:', city.name);
  },

  removeCity: (cityId) => {
    const newCities = get().cities.filter(city => city.id !== cityId);
    set({ cities: newCities });
    saveUserCities(newCities);
    console.log('✅ City removed:', cityId);
  },

  resetToDefaults: () => {
    const defaultCities = [...DEFAULT_CITIES];
    set({ cities: defaultCities });
    saveUserCities(defaultCities);
    console.log('✅ Cities reset to defaults');
  },

  setIsAddingCity: (adding) => {
    set({ isAddingCity: adding });
  },

  loadSavedCities: () => {
    const savedCities = loadUserCities();
    set({ cities: savedCities });
    console.log('✅ Loaded saved cities:', savedCities.length);
  },
}));
