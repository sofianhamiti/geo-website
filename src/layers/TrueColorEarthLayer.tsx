/**
 * True-Color Daily Earth Layer — NASA GIBS VIIRS SNPP
 * Shows today's (or yesterday's) satellite true-color imagery as a raster tile overlay.
 */

import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { BaseDataManager } from '../utils/BaseDataManager';
import { CONFIG } from '../config';

// ── Date helpers ─────────────────────────────────────────────────────

function formatGIBSDate(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

// ── Data cache ───────────────────────────────────────────────────────

interface TrueColorEarthData {
  date: string;
  lastUpdate: Date | null;
  error: string | null;
}

let trueColorEarthCache: TrueColorEarthData = {
  date: formatGIBSDate(getYesterday()),
  lastUpdate: null,
  error: null,
};

// ── Data fetching ────────────────────────────────────────────────────

/**
 * Always use yesterday's date for full global coverage.
 * VIIRS is a polar-orbiting satellite — "today's" NRT imagery has
 * orbital swath gaps (dark stripes where the satellite hasn't passed yet).
 * Yesterday's composite is stitched from all overpasses and has no gaps.
 */
async function updateTrueColorEarthData(): Promise<void> {
  trueColorEarthCache = {
    date: formatGIBSDate(getYesterday()),
    lastUpdate: new Date(),
    error: null,
  };
}

// ── Manager ──────────────────────────────────────────────────────────

export class TrueColorEarthManager extends BaseDataManager<TrueColorEarthData> {
  constructor() {
    super({
      updateFunction: updateTrueColorEarthData,
      updateIntervalMs: CONFIG.trueColorEarth.updateIntervalMs,
      getDataCache: () => trueColorEarthCache,
    });
  }
}

// ── Layer factory ────────────────────────────────────────────────────

export function createTrueColorEarthLayers(): Layer[] {
  const { date } = trueColorEarthCache;
  const tileUrl = CONFIG.trueColorEarth.tileUrlTemplate.replace('{date}', date);

  return [
    new TileLayer({
      id: CONFIG.layerIds.trueColorEarth,
      data: tileUrl,
      minZoom: 0,
      maxZoom: CONFIG.trueColorEarth.maxZoom,
      tileSize: CONFIG.trueColorEarth.tileSize,
      opacity: CONFIG.trueColorEarth.opacity,
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
