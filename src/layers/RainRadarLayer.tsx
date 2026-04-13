/**
 * Rain Radar Layer — RainViewer precipitation radar
 *
 * Single TileLayer loads ALL 6 radar frames per tile coordinate once.
 * renderSubLayers creates 6 stacked BitmapLayers per tile (one per frame).
 * Animation is driven by a module-level activeFrame variable — renderSubLayers
 * reads it to set initial opacity, and the animation loop updates it and
 * triggers a re-render via updateTriggers.
 *
 * Data refreshes every 10 minutes when new frames become available.
 */

import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { BaseDataManager } from '../utils/BaseDataManager';
import { CONFIG } from '../config';

// ── Types ────────────────────────────────────────────────────────────

interface RainViewerManifest {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: { time: number; path: string }[];
    nowcast: { time: number; path: string }[];
  };
}

interface RainRadarFrame {
  path: string;
  time: number;
}

interface RainRadarData {
  frames: RainRadarFrame[];
  host: string;
  lastUpdate: Date | null;
  error: string | null;
}

// ── Constants ───────────────────────────────────────────────────────

const FRAME_COUNT = 6;

// ── Data cache ───────────────────────────────────────────────────────

let rainRadarCache: RainRadarData = {
  frames: [],
  host: '',
  lastUpdate: null,
  error: null,
};

let rainRadarRevision = 0;

/** Returns a counter that increments each time the manifest is fetched. */
export function getRainRadarRevision(): number {
  return rainRadarRevision;
}

// ── Animation state ─────────────────────────────────────────────────

/** Per-frame opacity array. Written by animation loop, read by renderSubLayers. */
let rrOpacities: number[] = [];

/** Set opacities for each frame (called by animation loop). */
export function setRainRadarOpacities(opacities: number[]): void {
  rrOpacities = opacities;
}

/** Get current frame count for animation loop. */
export function getRainRadarFrameCount(): number {
  return rainRadarCache.frames.length;
}

// ── Data fetching ────────────────────────────────────────────────────

async function updateRainRadarData(): Promise<void> {
  try {
    const res = await fetch(CONFIG.rainRadar.manifestUrl);
    if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`);

    const manifest: RainViewerManifest = await res.json();
    const past = manifest.radar?.past || [];

    if (past.length === 0) {
      rainRadarCache = { ...rainRadarCache, error: 'No radar frames available' };
      return;
    }

    const frames = past.slice(-FRAME_COUNT).map(f => ({
      path: f.path,
      time: f.time,
    }));

    rainRadarCache = {
      frames,
      host: manifest.host || 'https://tilecache.rainviewer.com',
      lastUpdate: new Date(),
      error: null,
    };
    rainRadarRevision++;
  } catch (e: any) {
    rainRadarCache = {
      ...rainRadarCache,
      error: e.message || 'Failed to fetch rain radar data',
    };
  }
}

// ── Manager ──────────────────────────────────────────────────────────

export class RainRadarManager extends BaseDataManager<RainRadarData> {
  constructor() {
    super({
      updateFunction: updateRainRadarData,
      updateIntervalMs: CONFIG.rainRadar.updateIntervalMs,
      getDataCache: () => rainRadarCache,
    });
  }
}

// ── Layer factory ────────────────────────────────────────────────────

/**
 * Load all frame images sequentially per tile to avoid CDN rate limits.
 */
async function loadAllFrames(
  frames: RainRadarFrame[],
  host: string,
  z: number, x: number, y: number,
  signal?: AbortSignal,
): Promise<(HTMLImageElement | null)[]> {
  const images: (HTMLImageElement | null)[] = [];
  for (const frame of frames) {
    if (signal?.aborted) break;
    const url = `${host}${frame.path}/256/${z}/${x}/${y}/6/1_1.png`;
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    images.push(img);
  }
  return images;
}

export function createRainRadarLayers(): Layer[] {
  const { frames, host, error } = rainRadarCache;
  if (error || frames.length === 0) return [];

  const frozenFrames = [...frames];
  const frozenHost = host;

  // Initialize opacities — first frame visible
  if (rrOpacities.length !== frozenFrames.length) {
    rrOpacities = frozenFrames.map((_, i) =>
      i === 0 ? CONFIG.rainRadar.opacity : 0,
    );
  }

  return [
    new TileLayer({
      id: CONFIG.layerIds.rainRadar,
      // URL template seeds the tile grid; actual loading is in getTileData
      data: `${frozenHost}${frozenFrames[0].path}/256/{z}/{x}/{y}/6/1_1.png`,
      minZoom: 0,
      maxZoom: CONFIG.rainRadar.maxZoom,
      tileSize: CONFIG.rainRadar.tileSize,
      refinementStrategy: 'best-available',
      maxCacheSize: 150,
      opacity: 1,

      // Load all 6 frame images per tile (sequential to respect rate limits)
      getTileData: (params: any) => {
        const { x, y, z } = params.index;
        return loadAllFrames(frozenFrames, frozenHost, z, x, y, params.signal);
      },

      // 6 stacked BitmapLayers per tile — opacity driven by rrOpacities
      renderSubLayers: (props: any) => {
        const { boundingBox } = props.tile;
        const [west, south] = boundingBox[0];
        const [east, north] = boundingBox[1];
        const images: (HTMLImageElement | null)[] = props.data || [];

        return images.map((img, i) =>
          new BitmapLayer({
            ...props,
            id: `${props.id}-frame-${i}`,
            data: undefined,
            image: img,
            bounds: [west, south, east, north],
            opacity: rrOpacities[i] ?? 0,
            parameters: { depthTest: false },
          }),
        );
      },

      // Re-render sublayers when opacities change (animation loop triggers this)
      updateTriggers: {
        renderSubLayers: rrOpacities.join(','),
      },

      pickable: false,
    }),
  ];
}
