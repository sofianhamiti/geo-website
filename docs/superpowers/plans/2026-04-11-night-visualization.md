# Night Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current terminator line with a full day/night visualization system, offering multiple switchable styles in the control panel menu (same UX pattern as earthquake style presets).

**Architecture:** Compute the night-side polygon using d3-geo's `geoCircle` centered on the antisolar point (zero edge cases). Render night visualization using deck.gl layers: shadow overlays (SolidPolygonLayer via GeoJsonLayer), Black Marble raster tiles (TileLayer + BitmapLayer), and MaskExtension for clipping tiles to the night polygon. Styles are selectable presets in the UI.

**Tech Stack:** d3-geo (geoCircle), @deck.gl/extensions (MaskExtension), @deck.gl/geo-layers (TileLayer), NASA GIBS VIIRS_Black_Marble tiles, suncalc (already installed)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/utils/nightSideGeometry.ts` | Create | Subsolar point calculation + night polygon generation via d3-geo |
| `src/layers/NightLayer.tsx` | Create | Night style presets + layer factory functions for all 4 styles |
| `src/config.ts` | Modify | Add night tile URLs and night layer config |
| `src/store/mapStore.ts` | Modify | Add `nightStyle` state + `setNightStyle` action |
| `src/components/MapControlPanel.tsx` | Modify | Add night style picker buttons under terminator toggle |
| `src/hooks/useMapLayers.ts` | Modify | Integrate night layers into layer stack |
| `src/utils/solarCalculations.ts` | Delete | Replaced entirely by nightSideGeometry.ts |
| `src/layers/TerminatorLayer.tsx` | Delete | Replaced — terminator line now rendered inside NightLayer.tsx |

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install d3-geo and deck.gl extensions**

```bash
npm install d3-geo @deck.gl/extensions @types/d3-geo
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('d3-geo'); console.log('d3-geo OK')"
node -e "require('@deck.gl/extensions'); console.log('extensions OK')"
```

---

### Task 2: Create night-side geometry utility

**Files:**
- Create: `src/utils/nightSideGeometry.ts`

- [ ] **Step 1: Create the subsolar point + polygon utility**

```typescript
/**
 * Night-side geometry using d3-geo geodesic circles.
 * Zero edge cases — handles equinoxes, solstices, poles, antimeridian automatically.
 */
import { geoCircle } from 'd3-geo';
import type { GeoJSON } from 'geojson';

/**
 * Compute the subsolar point (where the sun is directly overhead).
 * Uses standard astronomical formulas — no external deps beyond Date.
 */
export function getSubsolarPoint(date: Date): [number, number] {
  // Days since J2000.0 epoch (Jan 1, 2000 at 12:00 UTC)
  const J2000 = Date.UTC(2000, 0, 1, 12);
  const d = (date.getTime() - J2000) / 86400000;

  // Mean longitude and anomaly of the sun (degrees)
  const L = (280.460 + 0.9856474 * d) % 360;
  const g = (357.528 + 0.9856003 * d) % 360;
  const gRad = (g * Math.PI) / 180;

  // Ecliptic longitude
  const lambda = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
  const lambdaRad = (lambda * Math.PI) / 180;

  // Obliquity of the ecliptic
  const epsilonRad = (23.4397 * Math.PI) / 180;

  // Solar declination = subsolar latitude
  const declination =
    Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad)) * (180 / Math.PI);

  // Right ascension
  const ra =
    Math.atan2(
      Math.cos(epsilonRad) * Math.sin(lambdaRad),
      Math.cos(lambdaRad)
    ) *
    (180 / Math.PI);

  // Greenwich Mean Sidereal Time (degrees)
  const GMST = (280.16 + 360.9856235 * d) % 360;

  // Subsolar longitude = RA - GMST, normalized to [-180, 180]
  let lon = ra - GMST;
  lon = ((lon % 360) + 540) % 360 - 180;

  return [lon, declination];
}

/**
 * Get the antisolar point (antipode of subsolar point).
 * This is the center of the night hemisphere.
 */
export function getAntisolarPoint(date: Date): [number, number] {
  const [lon, lat] = getSubsolarPoint(date);
  return [((lon + 180 + 360) % 360) - 180, -lat];
}

/**
 * Generate the night-side polygon as valid GeoJSON.
 * Uses d3-geo's geoCircle which handles antimeridian, poles, and all edge cases.
 * @param radiusDegrees - Angular radius from antisolar point (90 = terminator, >90 = twilight)
 */
export function getNightPolygon(
  date: Date,
  radiusDegrees: number = 90,
  precision: number = 1
): GeoJSON.Feature {
  const center = getAntisolarPoint(date);

  const geometry = geoCircle()
    .center(center)
    .radius(radiusDegrees)
    .precision(precision)();

  return {
    type: 'Feature',
    geometry,
    properties: {},
  };
}

/**
 * Generate the terminator line as a GeoJSON LineString (the border of the night polygon).
 * This replaces the old suncalc binary search approach.
 */
export function getTerminatorLine(
  date: Date,
  precision: number = 1
): GeoJSON.Feature {
  const polygon = getNightPolygon(date, 90, precision);
  const coords = polygon.geometry.type === 'Polygon'
    ? polygon.geometry.coordinates[0]
    : polygon.geometry.type === 'MultiPolygon'
      ? polygon.geometry.coordinates[0][0]
      : [];

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
    properties: {},
  };
}

/**
 * Generate concentric twilight zone polygons for gradient rendering.
 * Returns polygons from outermost (faintest) to innermost (darkest).
 * Civil twilight: 90-96°, Nautical: 96-102°, Astronomical: 102-108°
 */
export function getTwilightZones(
  date: Date
): GeoJSON.Feature[] {
  return [
    getNightPolygon(date, 99),  // outermost fringe
    getNightPolygon(date, 96),  // civil twilight boundary
    getNightPolygon(date, 93),  // mid-twilight
    getNightPolygon(date, 90),  // terminator (night boundary)
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/nightSideGeometry.ts
git commit -m "feat: add d3-geo night-side geometry utility"
```

---

### Task 3: Create NightLayer with style presets

**Files:**
- Create: `src/layers/NightLayer.tsx`

- [ ] **Step 1: Create the night layer with all style presets and factory functions**

```typescript
/**
 * Night Layer — Multiple visualization styles for the day/night boundary.
 * Styles are switchable via the control panel, same pattern as earthquake presets.
 */

import { GeoJsonLayer, PathLayer, SolidPolygonLayer } from '@deck.gl/layers';
import { TileLayer, BitmapLayer } from '@deck.gl/geo-layers';  
import { MaskExtension } from '@deck.gl/extensions';
import type { Layer } from '@deck.gl/core';
import {
  getNightPolygon,
  getTwilightZones,
  getTerminatorLine,
  getAntisolarPoint,
} from '../utils/nightSideGeometry';
import { CONFIG } from '../config';

// ── Night style presets ────────────────────────────────────────────────
export type NightStyleKey = 'line' | 'shadow' | 'masked' | 'tiles';

export interface NightStylePreset {
  label: string;
  description: string;
}

export const NIGHT_STYLE_PRESETS: Record<NightStyleKey, NightStylePreset> = {
  line: {
    label: 'Line',
    description: 'Terminator line only',
  },
  shadow: {
    label: 'Shadow',
    description: 'Dark overlay on night side',
  },
  masked: {
    label: 'Marble (Mask)',
    description: 'Black Marble tiles masked to night',
  },
  tiles: {
    label: 'Marble (Fade)',
    description: 'Black Marble tiles with per-tile fade',
  },
};

// ── Terminator line (shared across styles) ─────────────────────────────

function createTerminatorPathLayer(date: Date): Layer {
  const line = getTerminatorLine(date, 1);
  const coords = (line.geometry as GeoJSON.LineString).coordinates as [number, number][];

  return new PathLayer({
    id: 'night-terminator-line',
    data: [{ path: coords }],
    getPath: (d: any) => d.path,
    getColor: CONFIG.styles.night.terminatorColor,
    getWidth: CONFIG.styles.night.terminatorWidth,
    widthMinPixels: 2,
    widthMaxPixels: 8,
    opacity: 0.9,
    pickable: false,
    parameters: { depthTest: false },
    updateTriggers: { getPath: date.getTime() },
  });
}

// ── Style: "line" — Terminator line only ───────────────────────────────

function createLineLayers(date: Date): Layer[] {
  return [createTerminatorPathLayer(date)];
}

// ── Style: "shadow" — Dark overlay + twilight gradient ─────────────────

function createShadowLayers(date: Date): Layer[] {
  const layers: Layer[] = [];
  const twilightZones = getTwilightZones(date);

  // Render concentric circles from outermost to innermost.
  // Each circle has low opacity; they stack additively to form a gradient.
  const opacities = [0.04, 0.06, 0.08, 0.12];

  twilightZones.forEach((zone, i) => {
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

  layers.push(createTerminatorPathLayer(date));
  return layers;
}

// ── Style: "masked" — Black Marble tiles clipped to night polygon ──────

function createMaskedLayers(date: Date): Layer[] {
  const layers: Layer[] = [];
  const nightPoly = getNightPolygon(date, 90, 1);
  const twilightZones = getTwilightZones(date);

  // Twilight shadow (same as shadow style but lighter)
  const opacities = [0.03, 0.04, 0.06, 0.08];
  twilightZones.forEach((zone, i) => {
    layers.push(
      new GeoJsonLayer({
        id: `night-masked-shadow-${i}`,
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
          data: null,
          image: props.data,
          bounds: [west, south, east, north],
          extensions: [new MaskExtension()],
          maskId: 'night-mask-polygon',
        });
      },
      pickable: false,
      updateTriggers: {
        renderSubLayers: date.getTime(),
      },
    })
  );

  layers.push(createTerminatorPathLayer(date));
  return layers;
}

// ── Style: "tiles" — Black Marble with per-tile opacity ────────────────

function createTilesLayers(date: Date): Layer[] {
  const layers: Layer[] = [];
  const antisolar = getAntisolarPoint(date);
  const twilightZones = getTwilightZones(date);

  // Light twilight shadow
  const opacities = [0.03, 0.04, 0.06, 0.08];
  twilightZones.forEach((zone, i) => {
    layers.push(
      new GeoJsonLayer({
        id: `night-tiles-shadow-${i}`,
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

  // Black Marble TileLayer — opacity computed per tile
  layers.push(
    new TileLayer({
      id: 'night-tile-fade',
      data: CONFIG.styles.night.tileUrl,
      minZoom: 0,
      maxZoom: CONFIG.styles.night.maxZoom,
      tileSize: 256,
      renderSubLayers: (props: any) => {
        const { boundingBox } = props.tile;
        const [west, south] = boundingBox[0];
        const [east, north] = boundingBox[1];

        // Tile center
        const tileCenterLon = (west + east) / 2;
        const tileCenterLat = (south + north) / 2;

        // Angular distance from antisolar point (approximate, in degrees)
        const dLon = tileCenterLon - antisolar[0];
        const dLat = tileCenterLat - antisolar[1];
        const angularDist = Math.sqrt(dLon * dLon + dLat * dLat);

        // Opacity: 1.0 at center of night, 0 beyond terminator (90°)
        // With a smooth falloff in the twilight zone (80° to 100°)
        let tileOpacity = 0;
        if (angularDist < 80) {
          tileOpacity = CONFIG.styles.night.tileOpacity;
        } else if (angularDist < 100) {
          tileOpacity =
            CONFIG.styles.night.tileOpacity * (1 - (angularDist - 80) / 20);
        }

        if (tileOpacity < 0.01) return null; // Skip fully-day tiles

        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [west, south, east, north],
          opacity: tileOpacity,
        });
      },
      pickable: false,
      updateTriggers: {
        renderSubLayers: date.getTime(),
      },
    })
  );

  layers.push(createTerminatorPathLayer(date));
  return layers;
}

// ── Public API ─────────────────────────────────────────────────────────

const STYLE_FACTORIES: Record<NightStyleKey, (date: Date) => Layer[]> = {
  line: createLineLayers,
  shadow: createShadowLayers,
  masked: createMaskedLayers,
  tiles: createTilesLayers,
};

export function createNightLayers(
  date: Date,
  style: NightStyleKey = 'line'
): Layer[] {
  try {
    return STYLE_FACTORIES[style](date);
  } catch {
    return createLineLayers(date);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/layers/NightLayer.tsx
git commit -m "feat: add NightLayer with 4 switchable visualization styles"
```

---

### Task 4: Add night configuration to config.ts

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add night styles config inside the `styles` object, after the `terminator` block**

Add this new block right after the existing `terminator: { ... }` block:

```typescript
    night: {
      // Tile source — NASA GIBS VIIRS Black Marble (free, no API key)
      tileUrl:
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',
      maxZoom: 8,
      tileOpacity: 0.85,

      // Shadow overlay color (dark blue-black)
      shadowColor: [5, 5, 25, 255] as [number, number, number, number],

      // Terminator line (shared across all styles)
      terminatorColor: [255, 107, 53, 255] as [number, number, number, number], // Sunset orange
      terminatorWidth: 2,
    },
```

- [ ] **Step 2: Add layer ID**

In the `layerIds` object, add:

```typescript
    night: 'deck-gl-night',
```

- [ ] **Step 3: Remove the old `terminator` style block** (its config is now inside `night`)

Delete the `terminator: { ... }` block from `styles`.

- [ ] **Step 4: Commit**

```bash
git add src/config.ts
git commit -m "feat: add night layer configuration to config"
```

---

### Task 5: Add nightStyle state to mapStore

**Files:**
- Modify: `src/store/mapStore.ts`

- [ ] **Step 1: Add state and action types**

In the `MapState` interface, add:

```typescript
  nightStyle: 'line' | 'shadow' | 'masked' | 'tiles';
```

Add the action:

```typescript
  setNightStyle: (style: 'line' | 'shadow' | 'masked' | 'tiles') => void;
```

- [ ] **Step 2: Add initial state and action implementation**

In the initial state, add:

```typescript
  nightStyle: 'line' as 'line' | 'shadow' | 'masked' | 'tiles',
```

Add the action:

```typescript
  setNightStyle: (style) => {
    set({ nightStyle: style });
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/store/mapStore.ts
git commit -m "feat: add nightStyle state to map store"
```

---

### Task 6: Add night style picker to MapControlPanel

**Files:**
- Modify: `src/components/MapControlPanel.tsx`

- [ ] **Step 1: Add imports and props**

Add import:

```typescript
import { NIGHT_STYLE_PRESETS, type NightStyleKey } from '../layers/NightLayer';
```

Add to `MapControlPanelProps`:

```typescript
  nightStyle: NightStyleKey;
  onSetNightStyle: (style: NightStyleKey) => void;
```

- [ ] **Step 2: Add style picker buttons below the terminator LayerControl**

Right after the terminator `<LayerControl>`, add (same pattern as earthquake styles):

```tsx
{showTerminator && (
  <div className="ml-8 mr-2 mb-1 flex flex-wrap gap-1.5">
    {(Object.keys(NIGHT_STYLE_PRESETS) as NightStyleKey[]).map((key) => {
      const preset = NIGHT_STYLE_PRESETS[key];
      const isActive = nightStyle === key;
      return (
        <button
          key={key}
          onClick={() => onSetNightStyle(key)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 ${
            isActive
              ? 'bg-yellow-600 text-white ring-1 ring-yellow-400'
              : 'bg-slate-700/60 text-blue-200 hover:bg-slate-700'
          }`}
          title={preset.description}
        >
          {preset.label}
        </button>
      );
    })}
  </div>
)}
```

- [ ] **Step 3: Update the terminator LayerControl subtitle**

Change subtitle from `"Real-time shadow line"` to `"Day/night boundary"`.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapControlPanel.tsx
git commit -m "feat: add night style picker to control panel"
```

---

### Task 7: Wire up Map.tsx to pass nightStyle props

**Files:**
- Modify: `src/components/Map.tsx`

- [ ] **Step 1: Extract nightStyle and setNightStyle from the store**

Add to the useMapStore destructuring:

```typescript
    nightStyle,
    setNightStyle,
```

- [ ] **Step 2: Pass nightStyle to useMapLayers**

The `useMapLayers` hook call needs `nightStyle` — this is passed via the visibility object (add it there).

- [ ] **Step 3: Pass nightStyle props to MapControlPanel**

Add these props to the `<MapControlPanel>` JSX:

```tsx
nightStyle={nightStyle}
onSetNightStyle={setNightStyle}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Map.tsx
git commit -m "feat: wire up nightStyle through Map component"
```

---

### Task 8: Integrate night layers into useMapLayers

**Files:**
- Modify: `src/hooks/useMapLayers.ts`

- [ ] **Step 1: Replace terminator layer creation with night layers**

Replace the import of `createTerminatorLayer` with:

```typescript
import { createNightLayers, type NightStyleKey } from '../layers/NightLayer';
```

Add `nightStyle: NightStyleKey` to the `LayerVisibility` interface.

Update the `useMapLayers` function signature to accept `nightStyle`.

- [ ] **Step 2: Replace the terminator section in timeDependentLayers**

Replace the terminator layer block with:

```typescript
    // Night layers (terminator + optional night tiles/shadow)
    const nightLayers = createNightLayers(currentTime, nightStyle);
    nightLayers.forEach(layer => {
      layers.push(layer.clone({
        visible: visibility.showTerminator,
        updateTriggers: { getPath: currentTime.getTime() }
      }));
    });
```

- [ ] **Step 3: Update the useMemo dependency to include nightStyle**

Add `nightStyle` to the dependency array of `timeDependentLayers`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMapLayers.ts
git commit -m "feat: integrate night layers into useMapLayers"
```

---

### Task 9: Clean up old files and update imports

**Files:**
- Delete: `src/utils/solarCalculations.ts`
- Delete: `src/layers/TerminatorLayer.tsx`

- [ ] **Step 1: Delete old terminator files**

```bash
rm src/utils/solarCalculations.ts src/layers/TerminatorLayer.tsx
```

- [ ] **Step 2: Verify no remaining imports reference deleted files**

```bash
grep -r "solarCalculations\|TerminatorLayer" src/ --include="*.ts" --include="*.tsx"
```

Should return zero results. If any remain, update those imports.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "refactor: remove old terminator files replaced by NightLayer"
```

---

### Task 10: Build verification and browser test

- [ ] **Step 1: Type check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Start dev server and test all 4 styles**

```bash
npm run dev
```

Open browser and verify:
1. Toggle "Day/Night Terminator" ON
2. Click "Line" — see terminator line only (same as before but smoother from d3-geo)
3. Click "Shadow" — see dark overlay on night side with twilight gradient
4. Click "Marble (Mask)" — see Black Marble tiles on night side, day basemap on day side
5. Click "Marble (Fade)" — see Black Marble tiles with per-tile opacity fade
6. Toggle OFF — all night visualization disappears
7. Switch basemaps — night visualization works on all 3 basemaps

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete night visualization with 4 switchable styles"
```
