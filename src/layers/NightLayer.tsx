/**
 * Night Layer — Terminator line + night visualization styles.
 * Terminator and night cycle are independent controls.
 */

import { GeoJsonLayer, PathLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { MaskExtension } from '@deck.gl/extensions';
import type { Layer } from '@deck.gl/core';
import {
  getNightPolygon,
  getTerminatorLine,
  getSubsolarPoint,
} from '../utils/nightSideGeometry';
import { CONFIG } from '../config';

// ── Night style presets (for day/night cycle visualization) ───────────
export type NightStyleKey = 'off' | 'masked';

export interface NightStylePreset {
  label: string;
  description: string;
}

export const NIGHT_STYLE_PRESETS: Record<NightStyleKey, NightStylePreset> = {
  off: {
    label: 'Off',
    description: 'No night overlay',
  },
  masked: {
    label: 'Black Marble',
    description: 'NASA city lights masked to night side',
  },
};

// ── Terminator line (independent of night styles) ─────────────────────

export function createTerminatorLayer(date: Date): Layer[] {
  const line = getTerminatorLine(date, 1);
  const geom = line.geometry as GeoJSON.LineString;
  const coords = geom.coordinates as [number, number][];

  return [
    new PathLayer({
      id: 'terminator-line',
      data: [{ path: coords }],
      getPath: (d: any) => d.path,
      getColor: CONFIG.styles.night.terminatorColor,
      getWidth: CONFIG.styles.night.terminatorWidth,
      widthMinPixels: 1,
      widthMaxPixels: 3,
      opacity: 0.6,
      pickable: false,
      parameters: { depthTest: false },
      updateTriggers: { getPath: date.getTime() },
    }),
  ];
}

// ── Bitmap gradient — per-pixel smooth shadow, no polygon banding ─────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function createNightGradientBitmap(date: Date, maxAlpha: number): HTMLCanvasElement {
  const width = 720;
  const height = 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const [sunLon, sunLat] = getSubsolarPoint(date);
  const sunLonRad = sunLon * DEG_TO_RAD;
  const sunLatRad = sunLat * DEG_TO_RAD;
  const cosSunLat = Math.cos(sunLatRad);
  const sinSunLat = Math.sin(sunLatRad);

  // Twilight band: 90° from subsolar (terminator) → 96° (tile mask at 84° from antisolar)
  // 6° = civil twilight — city lights first visible from space
  const twilightStart = 90;
  const twilightEnd = 96;
  const bandWidth = twilightEnd - twilightStart;

  const [r, g, b] = CONFIG.styles.night.shadowColor;

  for (let y = 0; y < height; y++) {
    const lat = (90 - (y + 0.5) * 180 / height) * DEG_TO_RAD;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);

    for (let x = 0; x < width; x++) {
      const lon = (-180 + (x + 0.5) * 360 / width) * DEG_TO_RAD;
      const cosAngle = sinSunLat * sinLat + cosSunLat * cosLat * Math.cos(lon - sunLonRad);
      const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * RAD_TO_DEG;

      let alpha = 0;
      if (angleDeg > twilightStart) {
        if (angleDeg < twilightEnd) {
          // Smoothstep through twilight zone — zero banding
          const t = (angleDeg - twilightStart) / bandWidth;
          alpha = t * t * (3 - 2 * t) * maxAlpha;
        } else {
          alpha = maxAlpha;
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Tile brightness boost — per-pixel RGB multiply ───────────────────

function boostTileBrightness(image: any, factor: number): HTMLCanvasElement {
  const w = image.width || 256;
  const h = image.height || 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i] * factor);
    data[i + 1] = Math.min(255, data[i + 1] * factor);
    data[i + 2] = Math.min(255, data[i + 2] * factor);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Style: "masked" — Black Marble tiles clipped to night polygon ──────

function createMaskedLayers(date: Date): Layer[] {
  const layers: Layer[] = [];

  // Per-pixel shadow gradient — smooth transition from daylight to darkness.
  // Replaces polygon zones for true gradient with zero banding.
  layers.push(
    new BitmapLayer({
      id: 'night-shadow-gradient',
      image: createNightGradientBitmap(date, 0.35),
      bounds: [-180, -85, 180, 85],
      opacity: 1,
      pickable: false,
      parameters: { depthTest: false },
      updateTriggers: { image: date.getTime() },
    })
  );

  layers.push(
    new GeoJsonLayer({
      id: 'night-mask-polygon',
      data: getNightPolygon(date, 84, 1),
      operation: 'mask' as any,
      filled: true,
      stroked: false,
      getFillColor: [0, 0, 0, 255],
      updateTriggers: { getFillColor: date.getTime() },
    })
  );

  layers.push(
    new TileLayer({
      id: 'night-marble-tiles',
      data: CONFIG.styles.night.tileUrl,
      minZoom: 0,
      maxZoom: CONFIG.styles.night.maxZoom,
      tileSize: 256,
      opacity: 0.3,
      renderSubLayers: (props: any) => {
        const { boundingBox } = props.tile;
        const [west, south] = boundingBox[0];
        const [east, north] = boundingBox[1];

        return new BitmapLayer(props, {
          data: undefined,
          image: props.data ? boostTileBrightness(props.data, 2.0) : props.data,
          bounds: [west, south, east, north],
          extensions: [new MaskExtension()],
          maskId: 'night-mask-polygon',
          // Additive blending: dark pixels add nothing (basemap shows through),
          // bright city lights add their color (lights glow on top).
          parameters: {
            depthTest: false,
            blend: true,
            blendColorSrcFactor: 'src-alpha',
            blendColorDstFactor: 'one',
            blendColorOperation: 'add',
            blendAlphaSrcFactor: 'one',
            blendAlphaDstFactor: 'one-minus-src-alpha',
          },
        });
      },
      pickable: false,
    })
  );

  return layers;
}

// ── Public API ─────────────────────────────────────────────────────────

const STYLE_FACTORIES: Record<NightStyleKey, (date: Date) => Layer[]> = {
  off: () => [],
  masked: createMaskedLayers,
};

export function createNightLayers(
  date: Date,
  style: NightStyleKey = 'off'
): Layer[] {
  try {
    return STYLE_FACTORIES[style](date);
  } catch {
    return [];
  }
}
