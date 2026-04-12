/**
 * Aurora Forecast Layer — NOAA SWPC OVATION aurora probability
 * Renders a green-glow heatmap of aurora probability near the poles.
 */

import { BitmapLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { BaseDataManager } from '../utils/BaseDataManager';
import { CONFIG } from '../config';

// ── Types ────────────────────────────────────────────────────────────

interface AuroraObservation {
  Longitude: number;
  Latitude: number;
  Aurora: number; // 0-100 probability
}

interface AuroraData {
  observations: AuroraObservation[];
  lastUpdate: Date | null;
  error: string | null;
}

// ── Data cache ───────────────────────────────────────────────────────

let auroraCache: AuroraData = {
  observations: [],
  lastUpdate: null,
  error: null,
};

let auroraRevision = 0;

/** Returns a counter that increments each time aurora data is fetched. */
export function getAuroraRevision(): number {
  return auroraRevision;
}

// ── Canvas cache (avoid re-rendering every frame) ────────────────────

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedRevision = -1;

// ── Data fetching ────────────────────────────────────────────────────

async function updateAuroraData(): Promise<void> {
  try {
    const res = await fetch(CONFIG.aurora.apiUrl);
    if (!res.ok) throw new Error(`NOAA SWPC error: ${res.status}`);

    const raw: any = await res.json();

    // The API returns an object: { "Observation Time": ..., "coordinates": [[lon, lat, prob], ...] }
    const coordArray: any[] = raw.coordinates || [];
    const observations: AuroraObservation[] = [];

    for (const item of coordArray) {
      // Handle array format [lon, lat, probability]
      if (Array.isArray(item) && item.length >= 3) {
        const lon = Number(item[0]);
        const lat = Number(item[1]);
        const aurora = Number(item[2]);
        if (!isNaN(lon) && !isNaN(lat) && !isNaN(aurora)) {
          observations.push({ Longitude: lon, Latitude: lat, Aurora: aurora });
        }
      }
      // Handle object format { Longitude, Latitude, Aurora }
      else if (item && typeof item === 'object' && 'Longitude' in item) {
        observations.push({
          Longitude: Number(item.Longitude),
          Latitude: Number(item.Latitude),
          Aurora: Number(item.Aurora),
        });
      }
    }

    auroraCache = {
      observations,
      lastUpdate: new Date(),
      error: null,
    };
    auroraRevision++;
    // Invalidate canvas cache
    cachedCanvas = null;
    cachedRevision = -1;
  } catch (e: any) {
    auroraCache = {
      ...auroraCache,
      error: e.message || 'Failed to fetch aurora data',
    };
  }
}

// ── Manager ──────────────────────────────────────────────────────────

export class AuroraManager extends BaseDataManager<AuroraData> {
  constructor() {
    super({
      updateFunction: updateAuroraData,
      updateIntervalMs: CONFIG.aurora.updateIntervalMs,
      getDataCache: () => auroraCache,
    });
  }
}

// ── Canvas rendering ─────────────────────────────────────────────────

/**
 * Render aurora probability grid to a canvas bitmap.
 * The NOAA OVATION grid is 1° resolution covering the whole globe.
 * We render at 2x resolution and apply a Gaussian-style blur so
 * individual grid points form a visible glow rather than isolated pixels.
 */
function renderAuroraCanvas(observations: AuroraObservation[]): HTMLCanvasElement {
  // Return cached version if data hasn't changed
  if (cachedCanvas && cachedRevision === auroraRevision) {
    return cachedCanvas;
  }

  const scale = 2;
  const width = 360 * scale;
  const height = 181 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const { colors, minProbability } = CONFIG.aurora;

  // Draw each observation as a small radial gradient dot
  for (const obs of observations) {
    if (obs.Aurora < minProbability) continue;

    // Map lon/lat to canvas coordinates
    let px = (obs.Longitude + 180) * scale;
    if (px >= width) px -= width;
    const py = (90 - obs.Latitude) * scale;
    if (py < 0 || py >= height || px < 0) continue;

    const prob = obs.Aurora;

    // Color interpolation based on probability
    let r: number, g: number, b: number, a: number;
    if (prob < 30) {
      const t = Math.max(0, (prob - minProbability) / (30 - minProbability));
      r = colors.low[0] + t * (colors.mid[0] - colors.low[0]);
      g = colors.low[1] + t * (colors.mid[1] - colors.low[1]);
      b = colors.low[2] + t * (colors.mid[2] - colors.low[2]);
      a = colors.low[3] + t * (colors.mid[3] - colors.low[3]);
    } else if (prob < 70) {
      const t = (prob - 30) / 40;
      r = colors.mid[0] + t * (colors.high[0] - colors.mid[0]);
      g = colors.mid[1] + t * (colors.high[1] - colors.mid[1]);
      b = colors.mid[2] + t * (colors.high[2] - colors.mid[2]);
      a = colors.mid[3] + t * (colors.high[3] - colors.mid[3]);
    } else {
      const t = (prob - 70) / 30;
      r = colors.high[0] + t * (colors.peak[0] - colors.high[0]);
      g = colors.high[1] + t * (colors.peak[1] - colors.high[1]);
      b = colors.high[2] + t * (colors.peak[2] - colors.high[2]);
      a = colors.high[3] + t * (colors.peak[3] - colors.high[3]);
    }

    // Draw a radial gradient dot (radius proportional to probability)
    const dotRadius = scale * (1.5 + prob / 15);
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, dotRadius);
    const colorStr = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${(a / 255).toFixed(2)})`;
    const colorTransparent = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0)`;
    gradient.addColorStop(0, colorStr);
    gradient.addColorStop(1, colorTransparent);
    ctx.fillStyle = gradient;
    ctx.fillRect(px - dotRadius, py - dotRadius, dotRadius * 2, dotRadius * 2);
  }

  // Cache
  cachedCanvas = canvas;
  cachedRevision = auroraRevision;

  return canvas;
}

// ── Layer factory ────────────────────────────────────────────────────

export function createAuroraLayers(): Layer[] {
  const { observations, error } = auroraCache;
  if (error || observations.length === 0) return [];

  const canvas = renderAuroraCanvas(observations);

  return [
    new BitmapLayer({
      id: CONFIG.layerIds.aurora,
      image: canvas,
      bounds: [-180, -90, 180, 90],
      opacity: CONFIG.aurora.opacity,
      pickable: false,
      parameters: {
        depthTest: false,
        blend: true,
        blendColorSrcFactor: 'src-alpha',
        blendColorDstFactor: 'one',
        blendColorOperation: 'add',
        blendAlphaSrcFactor: 'one',
        blendAlphaDstFactor: 'one-minus-src-alpha',
      },
      updateTriggers: {
        image: auroraCache.lastUpdate?.getTime() || 0,
      },
    }),
  ];
}
