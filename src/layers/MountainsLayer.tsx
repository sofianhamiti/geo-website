/**
 * Mountains Layer - Professional Cartographic Peak Markers
 * Using Iconify icons for authentic mountain symbols
 */

import { IconLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../config';

interface Mountain {
  name: string;
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
  elevation: number; // meters above sea level
  range: string;
  sevenSummits: boolean; // True if it's one of the Seven Summits
}

// Clean selection - Seven Summits + iconic Alpine peaks only
const MOUNTAINS: Mountain[] = [
  // Seven Summits (highest peaks on each continent)
  { name: 'Everest', country: 'Nepal/China', coordinates: [86.9250, 27.9881], elevation: 8849, range: 'Himalayas', sevenSummits: true },
  { name: 'Aconcagua', country: 'Argentina', coordinates: [-70.0109, -32.6532], elevation: 6961, range: 'Andes', sevenSummits: true },
  { name: 'Denali', country: 'USA', coordinates: [-151.0074, 63.0692], elevation: 6190, range: 'Alaska Range', sevenSummits: true },
  { name: 'Kilimanjaro', country: 'Tanzania', coordinates: [37.3556, -3.0674], elevation: 5895, range: 'Eastern Rift', sevenSummits: true },
  { name: 'Elbrus', country: 'Russia', coordinates: [42.4453, 43.3499], elevation: 5642, range: 'Caucasus', sevenSummits: true },
  { name: 'Vinson', country: 'Antarctica', coordinates: [-85.6170, -78.5254], elevation: 4892, range: 'Sentinel Range', sevenSummits: true },
  { name: 'Carstensz Pyramid', country: 'Indonesia', coordinates: [137.1583, -4.0833], elevation: 4884, range: 'Sudirman Range', sevenSummits: true },
  { name: 'Mont Blanc', country: 'France/Italy', coordinates: [6.8652, 45.8326], elevation: 4809, range: 'Alps', sevenSummits: false },
  { name: 'Matterhorn', country: 'Switzerland/Italy', coordinates: [7.6583, 45.9763], elevation: 4478, range: 'Alps', sevenSummits: false },
];

/**
 * Fixed mountain icon size - no more fucking zoom scaling
 */
function getMountainSize(): number {
  // Fixed size - no zoom dependency bullshit
  return 26; // Perfect size for visibility and hover detection
}

// Removed unused formatElevation function


/**
 * Get mountains visible at current zoom level - Mont Blanc friendly
 */
function getVisibleMountains(zoom: number): Mountain[] {
  if (zoom < CONFIG.styles.mountains.minZoom) return [];
  
  // At low zoom, show Seven Summits and major peaks including Mont Blanc (4000m+)
  if (zoom < 3) {
    return MOUNTAINS.filter(m => m.sevenSummits || m.elevation > 4000);
  }
  
  // At medium zoom, show peaks above 2000m
  if (zoom < 5) {
    return MOUNTAINS.filter(m => m.elevation > 2000);
  }
  
  // At high zoom, show all mountains
  return MOUNTAINS;
}

/**
 * Create reliable mountain peak icons with the EXACT fucking icon you provided
 */
function createMountainPeaksLayer(mountains: Mountain[]): IconLayer {
  // The exact SVG - alphaCutoff handles transparent pixel detection
  function getMountainIconDataUri(): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 512 512"><path fill="#fffcfc" d="M256.22 18.375c-132.32 0-239.783 107.43-239.783 239.75S123.9 497.905 256.22 497.905S496 390.446 496 258.126S388.54 18.375 256.22 18.375m0 17.875c102.773 0 189.092 69.664 214.374 164.406l-79.313-81.47l-6.967-7.155l-6.688 7.47l-77.22 86.438a1913 1913 0 0 0-34.467-30.063l-6.563-5.625l-6.125 6.156a3510 3510 0 0 0-55.438 57.094l-76.437-83.375l-6.875-7.5l-6.875 7.5l-71.188 77.313C51.364 119.34 143.983 36.25 256.22 36.25m102.25 147.28l-3.845 35.376l21.563-32l10.75 16.688l9.968-8.47l27.188 26.814L417 187.344l19.5 5.062l39.188 40.25l.843-.812a224 224 0 0 1 1.564 26.28c0 37.033-9.06 71.917-25.063 102.595c-46.25-53.48-92.512-100.116-138.75-142.283l11-12.312l33.19-22.594zm-220.16 22.75l26.438 18.782l20.22 22.032c-39.47 42.024-78.63 85.836-115.94 130.344c-21.98-34.443-34.718-75.38-34.718-119.313v-.78l16.25-17.658L87.81 219.5l-17.187 54.063l41.813-51.22l27.312 32.72l-1.438-48.782zm141.375 61.657l53.157 60.938l-7.688-54.563L386.312 315a1632 1632 0 0 1 56.75 62.78l.188-.186C403.853 439.216 334.868 480.03 256.22 480.03c-71.76 0-135.483-33.992-176.033-86.75c19.135-22.91 38.775-45.645 58.72-68.06l56.155-33.814l-29.312 76.75l61.53-73.375l6.25 32.19l19.532-36.783l47.844 69.5l-21.22-91.75z" stroke-width="13" stroke="#fffcfc"/></svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  
  const iconSize = getMountainSize(); // Fixed - no zoom parameter
  
  return new IconLayer({
    id: 'mountain-peaks',
    data: mountains,
    pickable: true,
    
    getPosition: (d: Mountain) => d.coordinates,
    getIcon: () => ({
      url: getMountainIconDataUri(),
      width: 128,
      height: 128,
      anchorY: 64 // Better anchor for this icon shape
    }),
    getSize: () => iconSize,
    
    // Fixed sizing - no zoom dependency
    sizeUnits: 'pixels',
    sizeScale: 1.0,
    sizeMinPixels: iconSize, // Use fixed size
    sizeMaxPixels: iconSize, // Use fixed size
    
    // THE ACTUAL FIX: Include transparent pixels in hit detection
    alphaCutoff: -1, // Include ALL pixels (including transparent) for picking
    
    // No visual highlight - tooltips provide feedback
    autoHighlight: false
  });
}


/**
 * Clean icon-only mountain implementation - hover for details
 */
export function createMountainsLayers(zoom: number = 2): Layer[] {
  const visibleMountains = getVisibleMountains(zoom);
  
  if (visibleMountains.length === 0) {
    return [];
  }

  // Clean approach: icons only, text on hover
  return [
    createMountainPeaksLayer(visibleMountains),    // Clean mountain symbols with hover tooltips
  ];
}

// Removed unused export functions: getMountainCount, getSevenSummitsCount
