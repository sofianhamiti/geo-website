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
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 15 15">
        <path fill="#e6b800" d="M7.5 1c-.3 0-.4.2-.6.4l-5.8 9.5c-.1.1-.1.3-.1.4c0 .5.4.7.7.7h11.6c.4 0 .7-.2.7-.7c0-.2 0-.2-.1-.4L8.2 1.4C8 1.2 7.8 1 7.5 1m0 1.5L10.8 8H10L8.5 6.5L7.5 8l-1-1.5L5 8h-.9z"/>
      </svg>
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
