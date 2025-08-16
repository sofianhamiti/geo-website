/**
 * UNESCO World Heritage Sites Layer - CSV Based
 * Loads UNESCO sites from local CSV file - no network bullshit
 */

import { IconLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import Papa from 'papaparse';

interface UnescoSite {
  name_en: string;
  short_description: string;
  date_inscribed: string;
  danger: number;           // 0 or 1
  date_end?: string;        // Optional - year when site lost status
  longitude: number;
  latitude: number;
  area_hecta: number;
  category: string;         // Cultural, Natural, Mixed
}

// UNESCO sites cache - loaded once from CSV
let unescoSitesCache: UnescoSite[] | null = null;

// Icon cache to prevent recreation on every render
const ICON_CACHE = {
  circular: {
    danger: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256">
        <path fill="#ef4444" d="M128 80a48 48 0 1 0 48 48a48 48 0 0 0-48-48m0 60a12 12 0 1 1 12-12a12 12 0 0 1-12 12" stroke-width="6.5" stroke="#ef4444"/>
      </svg>
    `)}`,
    safe: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256">
        <path fill="#22c55e" d="M128 80a48 48 0 1 0 48 48a48 48 0 0 0-48-48m0 60a12 12 0 1 1 12-12a12 12 0 0 1-12 12" stroke-width="6.5" stroke="#22c55e"/>
      </svg>
    `)}`
  },
  pin: {
    danger: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24">
        <path fill="#ef4444" d="M12 5c1.609 0 3.12.614 4.254 1.73C17.38 7.837 18 9.309 18 10.87s-.62 3.03-1.745 4.139L12 19.193l-4.254-4.186c-1.125-1.107-1.745-2.576-1.745-4.139s.62-3.032 1.745-4.141A6.04 6.04 0 0 1 12 5m0-2a8.04 8.04 0 0 0-5.657 2.305a7.78 7.78 0 0 0 0 11.131L12 21.999l5.657-5.565a7.78 7.78 0 0 0 0-11.129A8.04 8.04 0 0 0 12 3m0 5.499c.668 0 1.296.26 1.768.731a2.5 2.5 0 0 1 0 3.537c-.473.472-1.1.731-1.768.731s-1.295-.26-1.768-.731a2.5 2.5 0 0 1 0-3.537A2.5 2.5 0 0 1 12 8.499m0-1a3.501 3.501 0 1 0 2.475 5.975a3.503 3.503 0 0 0 0-4.951A3.5 3.5 0 0 0 12 7.499" stroke-width="0.5" stroke="#ef4444"/>
      </svg>
    `)}`,
    safe: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24">
        <path fill="#22c55e" d="M12 5c1.609 0 3.12.614 4.254 1.73C17.38 7.837 18 9.309 18 10.87s-.62 3.03-1.745 4.139L12 19.193l-4.254-4.186c-1.125-1.107-1.745-2.576-1.745-4.139s.62-3.032 1.745-4.141A6.04 6.04 0 0 1 12 5m0-2a8.04 8.04 0 0 0-5.657 2.305a7.78 7.78 0 0 0 0 11.131L12 21.999l5.657-5.565a7.78 7.78 0 0 0 0-11.129A8.04 8.04 0 0 0 12 3m0 5.499c.668 0 1.296.26 1.768.731a2.5 2.5 0 0 1 0 3.537c-.473.472-1.1.731-1.768.731s-1.295-.26-1.768-.731a2.5 2.5 0 0 1 0-3.537A2.5 2.5 0 0 1 12 8.499m0-1a3.501 3.501 0 1 0 2.475 5.975a3.503 3.503 0 0 0 0-4.951A3.5 3.5 0 0 0 12 7.499" stroke-width="0.5" stroke="#22c55e"/>
      </svg>
    `)}`
  }
};

/**
 * Load UNESCO sites from local CSV file
 */
async function loadUnescoSitesFromCSV(): Promise<UnescoSite[]> {
  if (unescoSitesCache) {
    return unescoSitesCache;
  }

  try {
    const csvUrl = './data/wold-heritage-sites-2025.csv';

    // Fetch the local CSV file
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText} at ${response.url}`);
    }
    
    const csvText = await response.text();
    
    // Parse CSV with PapaParse
    const parseResult = Papa.parse<UnescoSite>(csvText, {
      header: true,           // Use first row as keys
      skipEmptyLines: true,   // Ignore blank lines
      dynamicTyping: true,    // Convert numbers automatically
      transformHeader: (header: string) => header.trim() // Clean headers
    });
    
    if (parseResult.errors.length > 0) {
      // CSV parsing had errors but continue with valid data
    }
    
    // Filter out rows with missing coordinates
    const validSites = parseResult.data.filter(site => 
      site.longitude !== undefined && 
      site.latitude !== undefined &&
      site.name_en !== undefined
    );
    
    unescoSitesCache = validSites;

    return validSites;
    
  } catch (error) {
    unescoSitesCache = [];
    return [];
  }
}

/**
 * Create clean UNESCO location pin icons using cached SVG data
 */
function createUnescoIconLayer(sites: UnescoSite[], zoom: number): IconLayer {
  return new IconLayer({
    id: 'unesco-sites',
    data: sites,
    pickable: true,
    
    getPosition: (d: UnescoSite) => [d.longitude, d.latitude],
    getIcon: (d: UnescoSite) => {
      const isPin = zoom > 5;
      const isDanger = d.danger === 1;
      
      return {
        url: isPin 
          ? (isDanger ? ICON_CACHE.pin.danger : ICON_CACHE.pin.safe)
          : (isDanger ? ICON_CACHE.circular.danger : ICON_CACHE.circular.safe),
        width: 128,
        height: 128,
        anchorY: isPin ? 24 : 12, // Adjust anchor for pin vs circle
      };
    },
    getSize: () => zoom > 5 ? 24 : 16, // Larger icons when zoomed in
    
    // Fixed sizing - no zoom scaling
    sizeUnits: 'pixels',
    sizeScale: 1.0,
    sizeMinPixels: 16,
    sizeMaxPixels: zoom > 5 ? 24 : 16,
    
    // Include transparent pixels for proper hover detection
    alphaCutoff: -1,
    
    // No visual highlight - tooltips provide feedback
    autoHighlight: false,
    
    // Update icons when zoom changes
    updateTriggers: {
      getIcon: [zoom],
      getSize: [zoom]
    }
  });
}

/**
 * Create UNESCO World Heritage Sites layer - loads from local CSV
 * Optimized to minimize recreation - only zoom-sensitive properties change
 */
export async function createUnescoLayers(zoom: number = 3): Promise<Layer[]> {
  const allSites = await loadUnescoSitesFromCSV();
  
  if (allSites.length === 0) {
    return [];
  }

  return [
    createUnescoIconLayer(allSites, zoom)
  ];
}

/**
 * Create optimized UNESCO layer that can be updated instead of recreated
 */
export async function createOptimizedUnescoLayer(): Promise<Layer | null> {
  const allSites = await loadUnescoSitesFromCSV();
  
  if (allSites.length === 0) {
    return null;
  }

  // Create layer with initial zoom state, will be updated via props
  return new IconLayer({
    id: 'unesco-sites-optimized',
    data: allSites,
    pickable: true,
    
    getPosition: (d: UnescoSite) => [d.longitude, d.latitude],
    getIcon: (d: UnescoSite, { zoom = 3 }: { zoom?: number } = {}) => {
      const isPin = zoom > 5;
      const isDanger = d.danger === 1;
      
      return {
        url: isPin 
          ? (isDanger ? ICON_CACHE.pin.danger : ICON_CACHE.pin.safe)
          : (isDanger ? ICON_CACHE.circular.danger : ICON_CACHE.circular.safe),
        width: 128,
        height: 128,
        anchorY: isPin ? 24 : 12,
      };
    },
    getSize: ({ zoom = 3 }: { zoom?: number } = {}) => zoom > 5 ? 24 : 16,
    
    // Fixed sizing - no zoom scaling
    sizeUnits: 'pixels',
    sizeScale: 1.0,
    sizeMinPixels: 16,
    sizeMaxPixels: 24,
    
    // Include transparent pixels for proper hover detection
    alphaCutoff: -1,
    
    // No visual highlight - tooltips provide feedback
    autoHighlight: false,
  });
}

// Removed unused export functions: getUnescoSiteCount, getSitesByDangerStatus
