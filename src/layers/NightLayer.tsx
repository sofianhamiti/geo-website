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
  getNightGradientZones,
  getTerminatorLine,
} from '../utils/nightSideGeometry';
import { CONFIG } from '../config';

// ── Night style presets (for day/night cycle visualization) ───────────
export type NightStyleKey = 'off' | 'shadow' | 'masked';

export interface NightStylePreset {
  label: string;
  description: string;
}

export const NIGHT_STYLE_PRESETS: Record<NightStyleKey, NightStylePreset> = {
  off: {
    label: 'Off',
    description: 'No night overlay',
  },
  shadow: {
    label: 'Shadow',
    description: 'Dark overlay on night side',
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

// ── Style: "shadow" — Graduated dark overlay on night side ────────────

function createShadowLayers(date: Date): Layer[] {
  const layers: Layer[] = [];
  const zones = getNightGradientZones(date);

  // Stacking opacities: outermost (full night boundary) to innermost (core)
  // At terminator edge: 0.08 | mid-night: 0.14 | deep: 0.18 | core: 0.22
  const opacities = [0.08, 0.06, 0.04, 0.04];

  zones.forEach((zone, i) => {
    layers.push(
      new GeoJsonLayer({
        id: `night-shadow-zone-${i}`,
        data: zone,
        filled: true,
        stroked: false,
        getFillColor: CONFIG.styles.night.shadowColor,
        opacity: opacities[i],
        pickable: false,
        parameters: { depthTest: false },
        updateTriggers: { getFillColor: date.getTime() },
      })
    );
  });

  return layers;
}

// ── Style: "masked" — Black Marble tiles clipped to night polygon ──────

function createMaskedLayers(date: Date): Layer[] {
  const layers: Layer[] = [];
  const nightPoly = getNightPolygon(date, 80, 1);

  // Graduated shadow from terminator (90°) to tile edge (80°).
  // 9 stacking zones every 1° — cumulative opacity grows linearly to ~0.18.
  for (let r = 90; r >= 82; r -= 1) {
    layers.push(
      new GeoJsonLayer({
        id: `night-masked-shadow-${r}`,
        data: getNightPolygon(date, r, 1),
        filled: true,
        stroked: false,
        getFillColor: CONFIG.styles.night.shadowColor,
        opacity: 0.02,
        pickable: false,
        parameters: { depthTest: false },
        updateTriggers: { getFillColor: date.getTime() },
      })
    );
  }

  // Mask layer — invisible, defines the clipping region
  layers.push(
    new GeoJsonLayer({
      id: 'night-mask-polygon',
      data: nightPoly,
      operation: 'mask' as any,
      filled: true,
      stroked: false,
      getFillColor: [0, 0, 0, 255],
      updateTriggers: { getFillColor: date.getTime() },
    })
  );

  // Black Marble TileLayer — masked to night polygon
  layers.push(
    new TileLayer({
      id: 'night-marble-tiles',
      data: CONFIG.styles.night.tileUrl,
      minZoom: 0,
      maxZoom: CONFIG.styles.night.maxZoom,
      tileSize: 256,
      opacity: CONFIG.styles.night.tileOpacity,
      renderSubLayers: (props: any) => {
        const { boundingBox } = props.tile;
        const [west, south] = boundingBox[0];
        const [east, north] = boundingBox[1];

        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
          extensions: [new MaskExtension()],
          maskId: 'night-mask-polygon',
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
  shadow: createShadowLayers,
  masked: createMaskedLayers,
};

export function createNightLayers(
  date: Date,
  style: NightStyleKey = 'shadow'
): Layer[] {
  try {
    return STYLE_FACTORIES[style](date);
  } catch {
    return createShadowLayers(date);
  }
}
