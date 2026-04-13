/**
 * Rain Radar Layer — RainViewer precipitation radar
 *
 * Shows the most recent radar frame as a single TileLayer.
 * Data refreshes every 10 minutes when new frames become available.
 *
 * Uses a single TileLayer to keep tile requests within RainViewer's
 * CDN rate limits (6 stacked layers caused 6× requests → rate-limit
 * failures and CORS errors at higher zoom levels).
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

export function createRainRadarLayers(): Layer[] {
  const { frames, host, error } = rainRadarCache;
  if (error || frames.length === 0) return [];

  // Use the most recent radar frame
  const latestFrame = frames[frames.length - 1];

  return [
    new TileLayer({
      id: CONFIG.layerIds.rainRadar,
      data: `${host}${latestFrame.path}/256/{z}/{x}/{y}/6/1_1.png`,
      minZoom: 0,
      maxZoom: CONFIG.rainRadar.maxZoom,
      tileSize: CONFIG.rainRadar.tileSize,
      refinementStrategy: 'best-available',
      maxCacheSize: 150,
      opacity: CONFIG.rainRadar.opacity,

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
  ];
}
