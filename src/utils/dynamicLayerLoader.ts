/**
 * Dynamic Layer Loader - Implements code splitting for layer components
 * Reduces initial bundle size by loading layers only when needed
 */

// Cache for dynamically imported layer functions
const layerCache = new Map<string, any>();

// Dynamic import with caching
async function importWithCache<T>(importPromise: () => Promise<T>, cacheKey: string): Promise<T> {
  if (layerCache.has(cacheKey)) {
    return layerCache.get(cacheKey);
  }
  
  const module = await importPromise();
  layerCache.set(cacheKey, module);
  return module;
}

// Dynamic layer imports
export const loadTerminatorLayer = async () => {
  const module = await importWithCache(
    () => import('../layers/TerminatorLayer'),
    'terminator'
  );
  return module.createTerminatorLayer;
};

export const loadMountainsLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/MountainsLayer'),
    'mountains'
  );
  return module.createMountainsLayers;
};

export const loadUnescoLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/UnescoLayer'),
    'unesco'
  );
  return module.createUnescoLayers;
};

export const loadTimeZonesLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/TimeZonesLayer'),
    'timezones'
  );
  return {
    createTimeZonesLayers: module.createTimeZonesLayers,
    isTimeZonesLayerConfigured: module.isTimeZonesLayerConfigured
  };
};

export const loadCityTimesLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/CityTimesLayer'),
    'citytimes'
  );
  return module.createCityTimesLayers;
};

export const loadISSLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/ISSLayer'),
    'iss'
  );
  return {
    createISSLayers: module.createISSLayers,
    isISSTrackingConfigured: module.isISSTrackingConfigured,
    ISSManager: module.ISSManager
  };
};

export const loadHurricaneLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/HurricaneLayer'),
    'hurricane'
  );
  return {
    createHurricaneLayers: module.createHurricaneLayers,
    isHurricaneLayerConfigured: module.isHurricaneLayerConfigured,
    HurricaneManager: module.HurricaneManager
  };
};

export const loadEarthquakeLayers = async () => {
  const module = await importWithCache(
    () => import('../layers/EarthquakeLayer'),
    'earthquake'
  );
  return {
    createEarthquakeLayers: module.createEarthquakeLayers,
    isEarthquakeLayerConfigured: module.isEarthquakeLayerConfigured,
    EarthquakeManager: module.EarthquakeManager
  };
};

// Preload critical layers
export const preloadCriticalLayers = async () => {
  // Preload only the most commonly used layers
  const criticalLayers = [
    loadTerminatorLayer(),
    loadCityTimesLayers()
  ];
  
  await Promise.allSettled(criticalLayers);
};

// Clear cache (useful for development)
export const clearLayerCache = () => {
  layerCache.clear();
};