/**
 * Rain Radar Layer — RainViewer precipitation radar
 * Animates the last 6 radar frames (~1 hour) as stacked TileLayers.
 * Only the active frame has opacity > 0; the rest are hidden but cached.
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

    // Take the last FRAME_COUNT frames
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

// ── Tile fetcher — clamp z to RainViewer's max (7) ─────────────────
// RainViewer returns an error-text PNG for z >= 8.  Instead of relying
// on deck.gl's overzoom behaviour (which is unreliable with 6 stacked
// animated TileLayers), we let deck.gl request tiles at any z the map
// needs and silently clamp the URL to z=7.  The BitmapLayer stretches
// the image to the tile's geographic bounds, so it looks upscaled.

const RAIN_MAX_NATIVE_ZOOM = CONFIG.rainRadar.maxZoom; // 7

function makeRainTileFetcher(host: string, framePath: string) {
  return async (props: any) => {
    const { index, signal } = props;
    const z = Math.min(index.z, RAIN_MAX_NATIVE_ZOOM);

    // When overzoomed, map the requested x/y back to the clamped z
    const dz = index.z - z;
    const x = index.x >> dz;
    const y = index.y >> dz;

    const url = `${host}${framePath}/256/${z}/${x}/${y}/6/1_1.png`;
    const res = await fetch(url, { signal });
    if (signal?.aborted) return null;
    if (!res.ok) return null;
    const blob = await res.blob();
    return await createImageBitmap(blob);
  };
}

// ── Layer factory ────────────────────────────────────────────────────

export function createRainRadarLayers(): Layer[] {
  const { frames, host, error } = rainRadarCache;
  if (error || frames.length === 0) return [];

  return frames.map((frame, i) =>
    new TileLayer({
      id: `${CONFIG.layerIds.rainRadar}-${i}`,
      getTileData: makeRainTileFetcher(host, frame.path),
      minZoom: 0,
      maxZoom: 8,
      tileSize: CONFIG.rainRadar.tileSize,
      refinementStrategy: 'best-available',
      maxCacheSize: 150,
      opacity: i === 0 ? CONFIG.rainRadar.opacity : 0,
      renderSubLayers: (props: any) => {
        const { boundingBox } = props.tile;
        const [west, south] = boundingBox[0];
        const [east, north] = boundingBox[1];

        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
          parameters: { depthTest: false },
        });
      },
      pickable: false,
    }),
  );
}
