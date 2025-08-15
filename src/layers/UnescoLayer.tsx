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
 * Create clean UNESCO location pin icons
 */
function createUnescoIconLayer(sites: UnescoSite[]): IconLayer {
  // Location pin SVG as data URL with color coding
  const getLocationPinDataUrl = (danger: number) => {
    const color = danger === 1 ? '#ef4444' : '#22c55e'; // Red for danger, green for protected
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 23l-6-6a9 9 0 1 1 12 0z"/>
      </svg>
    `)}`;
  };

  return new IconLayer({
    id: 'unesco-sites',
    data: sites,
    pickable: true,
    
    getPosition: (d: UnescoSite) => [d.longitude, d.latitude],
    getIcon: (d: UnescoSite) => ({
      url: getLocationPinDataUrl(d.danger),
      width: 128,
      height: 128,
      anchorY: 24,
    }),
    getSize: () => 16, // Clean, readable size
    
    // Fixed sizing - no zoom scaling
    sizeUnits: 'pixels',
    sizeScale: 1.0,
    sizeMinPixels: 16,
    sizeMaxPixels: 16,
    
    // Include transparent pixels for proper hover detection
    alphaCutoff: -1,
    
    // No visual highlight - tooltips provide feedback
    autoHighlight: false
  });
}

/**
 * Create UNESCO World Heritage Sites layer - loads from local CSV
 */
export async function createUnescoLayers(): Promise<Layer[]> {
  const allSites = await loadUnescoSitesFromCSV();
  
  if (allSites.length === 0) {
    return [];
  }

  return [
    createUnescoIconLayer(allSites)
  ];
}

// Removed unused export functions: getUnescoSiteCount, getSitesByDangerStatus
