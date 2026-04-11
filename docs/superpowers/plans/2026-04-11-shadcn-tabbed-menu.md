# shadcn/ui Tabbed Menu (B3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long single-scroll MapControlPanel with a 3-tab layout (Map, Day & Night, Live Feeds) using shadcn/ui components, matching the B3 design in `design/map.pen`.

**Architecture:** Install shadcn/ui on the existing Vite + React + Tailwind 3 stack. Replace all custom toggle/switch/tab UI with shadcn primitives (`Tabs`, `Switch`, `ScrollArea`). Restructure the panel into 3 icon+label tabs. Refactor the night cycle controls into a dedicated section with a 3-state selector (Off / Shadow / Earth at Night) that replaces the old toggle + sub-picker. Change `showTerminator` default to `false`.

**Tech Stack:** React 18, Tailwind CSS 3, shadcn/ui (Radix primitives), Zustand, Vite, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `tailwind.config.js` | Modify | Add shadcn CSS variable theme structure |
| `src/index.css` | Modify | Add shadcn CSS variables for dark theme |
| `tsconfig.json` | Verify | Already has `@/*` path alias (good) |
| `src/lib/utils.ts` | Create | shadcn `cn()` utility |
| `src/components/ui/tabs.tsx` | Create | shadcn Tabs component |
| `src/components/ui/switch.tsx` | Create | shadcn Switch component |
| `src/components/ui/scroll-area.tsx` | Create | shadcn ScrollArea component |
| `src/components/MapControlPanel.tsx` | Rewrite | 3-tab layout using shadcn components |
| `src/store/mapStore.ts` | Modify | `showTerminator` default `false`, remove `toggleNight`, add `setNightStyle('off')` support |
| `src/components/Map.tsx` | Modify | Simplify props passed to new panel |

---

### Task 1: Install shadcn/ui Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install shadcn base dependencies**

```bash
cd /Users/hamitis/Desktop/website/geo-website
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-tabs @radix-ui/react-switch @radix-ui/react-scroll-area
```

- [ ] **Step 2: Verify install succeeded**

Run: `npm ls lucide-react @radix-ui/react-tabs @radix-ui/react-switch @radix-ui/react-scroll-area`

Expected: All packages listed without errors.

---

### Task 2: Configure shadcn Tailwind Theme

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Update tailwind.config.js**

Replace the entire file with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0e1a',
        'terminator': '#d76a0b',
        'border-subtle': '#ddddddbd',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

- [ ] **Step 2: Add CSS variables to src/index.css**

Add the following block right after the `@import` lines and before the `/* Base styles */` comment:

```css
@layer base {
  :root {
    --background: 222 47% 6%;
    --foreground: 213 31% 91%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 45%;
    --primary: 217 91% 60%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 217 91% 60%;
    --radius: 0.5rem;
  }
}
```

These values match the existing dark slate theme (`#0f172a` bg, `#dbeafe` text, `#1e293b` borders).

- [ ] **Step 3: Create src/lib/utils.ts**

```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Verify the app still builds**

Run: `cd /Users/hamitis/Desktop/website/geo-website && npx vite build 2>&1 | tail -5`

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.css src/lib/utils.ts
git commit -m "chore: configure shadcn/ui theme and utilities"
```

---

### Task 3: Add shadcn UI Components

**Files:**
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/switch.tsx`
- Create: `src/components/ui/scroll-area.tsx`

- [ ] **Step 1: Create src/components/ui/tabs.tsx**

```tsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto w-full items-center justify-center bg-[#0f172a] px-3",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap py-2 text-[10px] font-medium text-slate-500 transition-all",
      "border-b-2 border-transparent",
      "data-[state=active]:border-blue-500 data-[state=active]:text-blue-100",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("flex-1 overflow-y-auto", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 2: Create src/components/ui/switch.tsx**

```tsx
import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-600",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
        "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
```

- [ ] **Step 3: Create src/components/ui/scroll-area.tsx**

```tsx
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2 border-l border-l-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-white/20 hover:bg-white/30" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/hamitis/Desktop/website/geo-website && npx vite build 2>&1 | tail -5`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "chore: add shadcn Tabs, Switch, ScrollArea components"
```

---

### Task 4: Update Store Defaults and Night Style Logic

**Files:**
- Modify: `src/store/mapStore.ts`

The night style becomes a 3-state value: `'off' | 'shadow' | 'masked'`. When `nightStyle === 'off'`, `showNight` is `false`. When `'shadow'` or `'masked'`, `showNight` is `true`. This replaces the separate `toggleNight` + `setNightStyle` pattern.

- [ ] **Step 1: Update the store**

In `src/store/mapStore.ts`, make these changes:

1. Change `showTerminator` default from `true` to `false`:

```ts
showTerminator: false,
```

2. Change `nightStyle` type from `'shadow' | 'masked'` to `'off' | 'shadow' | 'masked'` in the `MapState` interface:

```ts
nightStyle: 'off' | 'shadow' | 'masked';
```

3. Update `setNightStyle` signature:

```ts
setNightStyle: (style: 'off' | 'shadow' | 'masked') => void;
```

4. Update the `setNightStyle` action to also control `showNight`:

```ts
setNightStyle: (style) => {
  set({
    nightStyle: style,
    showNight: style !== 'off',
  });
},
```

5. Keep `toggleNight` for backwards compat but have it toggle between 'off' and last-used style. Actually, since the new panel won't use `toggleNight`, just leave it as-is — it still sets `showNight` directly and won't conflict.

- [ ] **Step 2: Update NightStyleKey type**

In `src/layers/NightLayer.tsx`, update the type:

```ts
export type NightStyleKey = 'off' | 'shadow' | 'masked';
```

And add the `off` entry to `NIGHT_STYLE_PRESETS`:

```ts
export const NIGHT_STYLE_PRESETS: Record<NightStyleKey, NightStylePreset> = {
  off: {
    label: 'Off',
    description: 'No night overlay',
  },
  shadow: {
    label: 'Shadow',
    description: 'Dark overlay on night side',
  },
  // ... masked stays as-is
};
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/hamitis/Desktop/website/geo-website && npx vite build 2>&1 | tail -5`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/store/mapStore.ts src/layers/NightLayer.tsx
git commit -m "feat: terminator default off, night style 3-state (off/shadow/masked)"
```

---

### Task 5: Rewrite MapControlPanel with Tabbed Layout

**Files:**
- Rewrite: `src/components/MapControlPanel.tsx`

This is the main task. The panel becomes a 3-tab layout using shadcn components. The design matches B3 from `design/map.pen`: icon+label tabs, compact rows, no descriptions except for update metadata on live layers.

- [ ] **Step 1: Rewrite MapControlPanel.tsx**

Replace the entire file with the new implementation. The component:
- Uses shadcn `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Uses shadcn `Switch` for all toggles
- Uses shadcn `ScrollArea` for the panel body
- Uses `lucide-react` for all icons (Globe, SunMoon, Radio, MapPin, Clock4, Mountain, Star, Building2, Activity, Wind, X, RefreshCw)
- Has 3 tabs: Map (globe icon), Day & Night (sun-moon icon), Live Feeds (radio icon)
- Map tab: Basemap picker + Overlays (Places, Time Zones, Mountains, UNESCO)
- Day & Night tab: Terminator toggle + Night Style 3-state segmented selector
- Live Feeds tab: City Times, ISS, Earthquakes, Hurricanes — each with inline update freq

The interface is simplified since the component reads directly from the store via `useMapStore`:

```tsx
/**
 * Map Control Panel — Tabbed layout with shadcn/ui components
 * Tabs: Map | Day & Night | Live Feeds
 */

import React from 'react';
import {
  Globe, SunMoon, Radio, MapPin, Clock4, Mountain, Star,
  Building2, Activity, Wind, X, RefreshCw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CityManager } from './CityManager';
import { NIGHT_STYLE_PRESETS, type NightStyleKey } from '../layers/NightLayer';

interface MapControlPanelProps {
  isMenuOpen: boolean;
  selectedBasemap: 'usgs' | 'arcgis' | 'eox';
  showArcgisPlaces: boolean;
  showTimezones: boolean;
  showMountains: boolean;
  showUnesco: boolean;
  showCities: boolean;
  showTerminator: boolean;
  showISS: boolean;
  showEarthquakes: boolean;
  showHurricanes: boolean;
  isISSLoading: boolean;
  isEarthquakesLoading: boolean;
  isHurricanesLoading: boolean;
  earthquakeLastUpdate: Date | null;
  hurricaneLastUpdate: Date | null;
  hurricaneLayerCount: number;
  currentTime: Date;
  onToggleMenu: () => void;
  onSetSelectedBasemap: (basemap: 'usgs' | 'arcgis' | 'eox') => void;
  onToggleArcgisPlaces: () => void;
  onToggleTimezones: () => void;
  onToggleMountains: () => void;
  onToggleUnesco: () => void;
  onToggleCities: () => void;
  onToggleTerminator: () => void;
  onToggleISS: () => void;
  onToggleEarthquakes: () => void;
  onToggleHurricanes: () => void;
  nightStyle: NightStyleKey;
  onSetNightStyle: (style: NightStyleKey) => void;
}

/* ── Reusable small components ──────────────────────────────── */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1 pt-1 pb-1">
    <span className="text-[10px] font-semibold tracking-widest text-blue-500/50 uppercase">
      {children}
    </span>
  </div>
);

const LayerRow: React.FC<{
  icon: React.ReactNode;
  name: string;
  enabled: boolean;
  loading?: boolean;
  disabled?: boolean;
  meta?: string;
  onToggle: () => void;
}> = ({ icon, name, enabled, loading = false, disabled = false, meta, onToggle }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-slate-800/50 transition-colors">
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      <span className="text-[13px] font-medium text-blue-100">{name}</span>
      {meta && (
        <span className="text-[9px] text-teal-300/30">{meta}</span>
      )}
      {loading && (
        <div className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
    <Switch
      checked={enabled}
      onCheckedChange={onToggle}
      disabled={disabled || loading}
    />
  </div>
);

const UpdateMeta: React.FC<{ freq: string; lastUpdate?: Date | null; source?: string }> = ({
  freq, lastUpdate, source
}) => (
  <div className="flex items-center gap-1.5 pl-9 pb-1">
    <RefreshCw className="w-2.5 h-2.5 text-teal-300/30" />
    <span className="text-[10px] text-teal-300/30">{freq}</span>
    {lastUpdate && (
      <>
        <span className="text-[10px] text-slate-600/50">·</span>
        <span className="text-[10px] text-slate-600/50">
          {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </>
    )}
    {source && (
      <>
        <span className="text-[10px] text-slate-600/50">·</span>
        <span className="text-[10px] text-slate-600/50">{source}</span>
      </>
    )}
  </div>
);

/* ── Main Panel ─────────────────────────────────────────────── */

export const MapControlPanel: React.FC<MapControlPanelProps> = ({
  isMenuOpen,
  selectedBasemap,
  showArcgisPlaces,
  showTimezones,
  showMountains,
  showUnesco,
  showCities,
  showTerminator,
  showISS,
  showEarthquakes,
  showHurricanes,
  isISSLoading,
  isEarthquakesLoading,
  isHurricanesLoading,
  earthquakeLastUpdate,
  hurricaneLastUpdate,
  hurricaneLayerCount,
  currentTime,
  onToggleMenu,
  onSetSelectedBasemap,
  onToggleArcgisPlaces,
  onToggleTimezones,
  onToggleMountains,
  onToggleUnesco,
  onToggleCities,
  onToggleTerminator,
  onToggleISS,
  onToggleEarthquakes,
  onToggleHurricanes,
  nightStyle,
  onSetNightStyle,
}) => {
  const basemaps: { key: 'usgs' | 'arcgis' | 'eox'; name: string; icon: React.ReactNode }[] = [
    { key: 'eox', name: 'Sentinel-2 Cloudless', icon: <Star className="w-3.5 h-3.5 text-amber-400" /> },
    { key: 'usgs', name: 'Blue Marble', icon: <Globe className="w-3.5 h-3.5 text-blue-400" /> },
    { key: 'arcgis', name: 'Satellite Imagery', icon: <Globe className="w-3.5 h-3.5 text-green-400" /> },
  ];

  const nightStyles: { key: NightStyleKey; label: string }[] = [
    { key: 'off', label: 'Off' },
    { key: 'shadow', label: 'Shadow' },
    { key: 'masked', label: 'Earth at Night' },
  ];

  return (
    <>
      {/* Menu Toggle Button */}
      <div className="absolute top-3 right-3 z-50">
        <button
          onClick={onToggleMenu}
          className="p-2 bg-slate-800/90 backdrop-blur-sm border border-blue-200/20 rounded-lg text-blue-100 hover:bg-slate-700/90 hover:text-white transition-all duration-200 shadow-lg"
          title="Toggle Controls Panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-200">
            {isMenuOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            )}
          </svg>
        </button>
      </div>

      {/* Right Slide Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-lg border-l border-blue-200/20 shadow-2xl z-40 transform transition-transform duration-200 ease-out flex flex-col ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-blue-100">Map Controls</h2>
          <button
            onClick={onToggleMenu}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="map" className="flex flex-col flex-1 min-h-0">
          <TabsList>
            <TabsTrigger value="map">
              <Globe className="w-4 h-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="daynight">
              <SunMoon className="w-4 h-4" />
              Day & Night
            </TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="w-4 h-4" />
              Live Feeds
            </TabsTrigger>
          </TabsList>

          <div className="border-t border-blue-200/10" />

          {/* ── Map Tab ──────────────────────────────── */}
          <TabsContent value="map" className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Basemap */}
                <div className="space-y-2">
                  <SectionLabel>Basemap</SectionLabel>
                  <div className="space-y-1.5">
                    {basemaps.map(bm => (
                      <div
                        key={bm.key}
                        onClick={() => onSetSelectedBasemap(bm.key)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                          selectedBasemap === bm.key
                            ? 'bg-blue-600/20 border border-blue-400/50'
                            : 'bg-slate-800/30 hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        {bm.icon}
                        <span className={`text-[13px] font-medium ${
                          selectedBasemap === bm.key ? 'text-blue-100' : 'text-slate-400'
                        }`}>
                          {bm.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overlays */}
                <div className="space-y-1">
                  <SectionLabel>Overlays</SectionLabel>
                  <LayerRow icon={<MapPin className="w-3.5 h-3.5 text-violet-400" />} name="Places & Boundaries" enabled={showArcgisPlaces} onToggle={onToggleArcgisPlaces} />
                  <LayerRow icon={<Clock4 className="w-3.5 h-3.5 text-cyan-400" />} name="Time Zones" enabled={showTimezones} onToggle={onToggleTimezones} />
                  <LayerRow icon={<Mountain className="w-3.5 h-3.5 text-yellow-500" />} name="Mountain Peaks" enabled={showMountains} onToggle={onToggleMountains} />
                  <LayerRow icon={<MapPin className="w-3.5 h-3.5 text-orange-400" />} name="UNESCO Sites" enabled={showUnesco} onToggle={onToggleUnesco} />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Day & Night Tab ──────────────────────── */}
          <TabsContent value="daynight" className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Terminator */}
                <div className="bg-slate-800/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SunMoon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[13px] font-medium text-blue-100">Terminator Line</span>
                    </div>
                    <Switch checked={showTerminator} onCheckedChange={onToggleTerminator} />
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">Day/night boundary line</p>
                  <div className="flex items-center gap-1.5 pl-6">
                    <RefreshCw className="w-2.5 h-2.5 text-teal-300/30" />
                    <span className="text-[10px] text-teal-300/30">Every 10s</span>
                    <span className="text-[10px] text-slate-600/50">·</span>
                    <span className="text-[10px] text-slate-600/50">Computed</span>
                  </div>
                </div>

                {/* Night Style Selector */}
                <div className="bg-slate-800/30 rounded-lg p-3 space-y-3">
                  <span className="text-xs font-medium text-slate-400">Night Style</span>
                  <div className="flex bg-[#0f172a] rounded-lg p-0.5 gap-0.5">
                    {nightStyles.map(ns => (
                      <button
                        key={ns.key}
                        onClick={() => onSetNightStyle(ns.key)}
                        className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
                          nightStyle === ns.key
                            ? 'bg-indigo-500/20 text-violet-300 ring-1 ring-indigo-400/30'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        {ns.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Live Feeds Tab ───────────────────────── */}
          <TabsContent value="live" className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                <LayerRow icon={<Building2 className="w-3.5 h-3.5 text-green-400" />} name="City Times" enabled={showCities} onToggle={onToggleCities} meta="10s" />
                <UpdateMeta freq="Every 10s" source="Computed" />

                <LayerRow icon={<Radio className="w-3.5 h-3.5 text-yellow-400" />} name="ISS Tracking" enabled={showISS} loading={isISSLoading} onToggle={onToggleISS} meta="10s" />
                <UpdateMeta freq="Every 10s" />

                <LayerRow icon={<Activity className="w-3.5 h-3.5 text-red-500" />} name="Earthquakes" enabled={showEarthquakes} loading={isEarthquakesLoading} onToggle={onToggleEarthquakes} meta="1h" />
                <UpdateMeta freq="Hourly" lastUpdate={earthquakeLastUpdate} source="USGS" />

                <LayerRow icon={<Wind className="w-3.5 h-3.5 text-orange-400" />} name="Hurricanes" enabled={showHurricanes} loading={isHurricanesLoading} onToggle={onToggleHurricanes} meta="1h" />
                <UpdateMeta
                  freq="Hourly"
                  lastUpdate={hurricaneLastUpdate}
                  source={hurricaneLayerCount > 0 ? 'NHC/JTWC' : undefined}
                />

                {/* City Manager */}
                <div className="pt-3">
                  <CityManager />
                </div>

                {/* System Time */}
                <div className="border-t border-blue-200/10 pt-3 mt-3">
                  <div className="flex items-center gap-2 px-3">
                    <Clock4 className="w-3 h-3 text-slate-600" />
                    <span className="text-[11px] text-slate-500 font-mono">
                      {currentTime.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Overlay for closing panel */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-10"
          onClick={onToggleMenu}
        />
      )}
    </>
  );
};
```

- [ ] **Step 2: Update Map.tsx props**

Remove the `showNight` and `onToggleNight` props from the `MapControlPanel` invocation in `src/components/Map.tsx`. The old props `showNight` and `onToggleNight` are no longer used by the panel — the night style is controlled entirely via `onSetNightStyle('off' | 'shadow' | 'masked')`.

Remove these lines from the MapControlPanel JSX in Map.tsx:
```tsx
showNight={showNight}
onToggleNight={toggleNight}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/hamitis/Desktop/website/geo-website && npx vite build 2>&1 | tail -10`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapControlPanel.tsx src/components/Map.tsx
git commit -m "feat: rewrite control panel with shadcn tabbed layout (B3 design)"
```

---

### Task 6: Visual Verification and Polish

- [ ] **Step 1: Start dev server and test**

Run: `cd /Users/hamitis/Desktop/website/geo-website && npm run dev`

Open in browser. Verify:
1. Panel opens/closes with the hamburger button
2. Three icon+label tabs render correctly (Map, Day & Night, Live Feeds)
3. Map tab: basemap selection works, overlay toggles work
4. Day & Night tab: Terminator toggle works (defaults OFF), night style selector works (defaults Shadow)
5. Live Feeds tab: all layer toggles work, loading spinners appear, update metadata shows
6. City Manager is accessible in Live Feeds tab
7. Panel scrolls properly in each tab if content is long

- [ ] **Step 2: Fix any visual issues found**

Address any spacing, color, or layout issues discovered during testing.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "polish: visual adjustments for tabbed control panel"
```
