/**
 * Map Control Panel — Tabbed layout with shadcn/ui components
 * Tabs: Map | Day & Night | Live Feeds
 *
 * Sizing uses a golden-ratio scale (φ = 1.618):
 *   8 → 13 → 21 → 34 → 55 px
 */

import React from 'react';
import {
  Globe, SunMoon, Radio, MapPin, Clock4, Mountain, Star,
  Building2, Activity, Wind, RefreshCw, CloudRain, Satellite, Sparkles,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CityManager } from './CityManager';
import { type NightStyleKey } from '../layers/NightLayer';

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
  showTrueColorEarth: boolean;
  isTrueColorEarthLoading: boolean;
  showRainRadar: boolean;
  isRainRadarLoading: boolean;
  rainRadarLastUpdate: Date | null;
  showAurora: boolean;
  isAuroraLoading: boolean;
  auroraLastUpdate: Date | null;
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
  onToggleTrueColorEarth: () => void;
  onToggleRainRadar: () => void;
  onToggleAurora: () => void;
  nightStyle: NightStyleKey;
  onSetNightStyle: (style: NightStyleKey) => void;
}

/* ── Reusable small components ──────────────────────────────── */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1 pb-1">
    <span className="text-[11px] font-semibold tracking-widest text-blue-500/50 uppercase">
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
  <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-800/50 transition-colors">
    <div className="flex items-center gap-3">
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="text-[15px] font-medium text-blue-100">{name}</span>
      {meta && (
        <span className="text-[10px] text-teal-300/30">{meta}</span>
      )}
      {loading && (
        <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
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
  <div className="flex items-center gap-2 pl-12 pb-1">
    <RefreshCw className="w-3 h-3 text-teal-300/30" />
    <span className="text-[11px] text-teal-300/30">{freq}</span>
    {lastUpdate && (
      <>
        <span className="text-[11px] text-slate-600/50">·</span>
        <span className="text-[11px] text-slate-600/50">
          {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </>
    )}
    {source && (
      <>
        <span className="text-[11px] text-slate-600/50">·</span>
        <span className="text-[11px] text-slate-600/50">{source}</span>
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
  showTrueColorEarth,
  isTrueColorEarthLoading,
  showRainRadar,
  isRainRadarLoading,
  rainRadarLastUpdate,
  showAurora,
  isAuroraLoading,
  auroraLastUpdate,
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
  onToggleTrueColorEarth,
  onToggleRainRadar,
  onToggleAurora,
  nightStyle,
  onSetNightStyle,
}) => {
  const basemaps: { key: 'usgs' | 'arcgis' | 'eox'; name: string; icon: React.ReactNode }[] = [
    { key: 'eox', name: 'Sentinel-2 Cloudless', icon: <Star className="w-5 h-5 text-amber-400" /> },
    { key: 'usgs', name: 'Blue Marble', icon: <Globe className="w-5 h-5 text-blue-400" /> },
    { key: 'arcgis', name: 'Satellite Imagery', icon: <Globe className="w-5 h-5 text-green-400" /> },
  ];

  return (
    <>
      {/* Menu Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onToggleMenu}
          className="p-2.5 bg-slate-800/90 backdrop-blur-sm border border-blue-200/20 rounded-lg text-blue-100 hover:bg-slate-700/90 hover:text-white transition-all duration-200 shadow-lg"
          title="Toggle Controls Panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-200">
            {isMenuOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            )}
          </svg>
        </button>
      </div>

      {/* Right Slide Panel — 520px ≈ 34 × φ² */}
      <div className={`fixed top-0 right-0 h-full w-[520px] bg-slate-900/95 backdrop-blur-lg border-l border-blue-200/20 shadow-2xl z-40 transform transition-transform duration-200 ease-out flex flex-col ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header — 34px vertical padding */}
        <div className="flex items-center px-8 py-6 shrink-0">
          <h2 className="text-lg font-semibold text-blue-100">Map Controls</h2>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="map" className="flex flex-col flex-1 min-h-0">
          <TabsList>
            <TabsTrigger value="map">
              <Globe className="w-5 h-5" />
              Map
            </TabsTrigger>
            <TabsTrigger value="daynight">
              <SunMoon className="w-5 h-5" />
              Day & Night
            </TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="w-5 h-5" />
              Live Feeds
            </TabsTrigger>
          </TabsList>

          <div className="border-t border-blue-200/10" />

          {/* ── Map Tab ──────────────────────────────── */}
          <TabsContent value="map" className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-8 space-y-8">
                {/* Basemap */}
                <div className="space-y-3">
                  <SectionLabel>Basemap</SectionLabel>
                  <div className="space-y-2">
                    {basemaps.map(bm => (
                      <div
                        key={bm.key}
                        onClick={() => onSetSelectedBasemap(bm.key)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                          selectedBasemap === bm.key
                            ? 'bg-blue-600/20 border border-blue-400/50'
                            : 'bg-slate-800/30 hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        {bm.icon}
                        <span className={`text-[15px] font-medium ${
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
                  <LayerRow icon={<MapPin className="w-[18px] h-[18px] text-violet-400" />} name="Places & Boundaries" enabled={showArcgisPlaces} onToggle={onToggleArcgisPlaces} />
                  <LayerRow icon={<Clock4 className="w-[18px] h-[18px] text-cyan-400" />} name="Time Zones" enabled={showTimezones} onToggle={onToggleTimezones} />
                  <LayerRow icon={<Mountain className="w-[18px] h-[18px] text-yellow-500" />} name="Mountain Peaks" enabled={showMountains} onToggle={onToggleMountains} />
                  <LayerRow icon={<MapPin className="w-[18px] h-[18px] text-orange-400" />} name="UNESCO Sites" enabled={showUnesco} onToggle={onToggleUnesco} />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Day & Night Tab ──────────────────────── */}
          <TabsContent value="daynight" className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-8 space-y-6">
                {/* Terminator */}
                <div className="bg-slate-800/30 rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SunMoon className="w-5 h-5 text-indigo-400" />
                      <span className="text-[15px] font-medium text-blue-100">Terminator Line</span>
                    </div>
                    <Switch checked={showTerminator} onCheckedChange={onToggleTerminator} />
                  </div>
                  <p className="text-[13px] text-slate-500 pl-8">Day/night boundary line</p>
                  <div className="flex items-center gap-2 pl-8">
                    <RefreshCw className="w-3 h-3 text-teal-300/30" />
                    <span className="text-[11px] text-teal-300/30">Every 10s</span>
                    <span className="text-[11px] text-slate-600/50">·</span>
                    <span className="text-[11px] text-slate-600/50">Computed</span>
                  </div>
                </div>

                {/* Earth at Night */}
                <div className="bg-slate-800/30 rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-indigo-400" />
                      <span className="text-[15px] font-medium text-blue-100">Earth at Night</span>
                    </div>
                    <Switch checked={nightStyle === 'masked'} onCheckedChange={() => onSetNightStyle(nightStyle === 'masked' ? 'off' : 'masked')} />
                  </div>
                  <p className="text-[13px] text-slate-500 pl-8">NASA city lights on night side</p>
                  <div className="flex items-center gap-2 pl-8">
                    <RefreshCw className="w-3 h-3 text-teal-300/30" />
                    <span className="text-[11px] text-teal-300/30">Every 10s</span>
                    <span className="text-[11px] text-slate-600/50">·</span>
                    <span className="text-[11px] text-slate-600/50">NASA VIIRS</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Live Feeds Tab ───────────────────────── */}
          <TabsContent value="live" className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-8 space-y-2">
                <LayerRow icon={<Building2 className="w-[18px] h-[18px] text-green-400" />} name="City Times" enabled={showCities} onToggle={onToggleCities} meta="10s" />
                <UpdateMeta freq="Every 10s" source="Computed" />

                <LayerRow icon={<Radio className="w-[18px] h-[18px] text-yellow-400" />} name="ISS Tracking" enabled={showISS} loading={isISSLoading} onToggle={onToggleISS} meta="10s" />
                <UpdateMeta freq="Every 10s" />

                <LayerRow icon={<Activity className="w-[18px] h-[18px] text-red-500" />} name="Earthquakes" enabled={showEarthquakes} loading={isEarthquakesLoading} onToggle={onToggleEarthquakes} meta="1h" />
                <UpdateMeta freq="Hourly" lastUpdate={earthquakeLastUpdate} source="USGS" />

                <LayerRow icon={<Wind className="w-[18px] h-[18px] text-orange-400" />} name="Hurricanes" enabled={showHurricanes} loading={isHurricanesLoading} onToggle={onToggleHurricanes} meta="1h" />
                <UpdateMeta
                  freq="Hourly"
                  lastUpdate={hurricaneLastUpdate}
                  source={hurricaneLayerCount > 0 ? 'NHC/JTWC' : undefined}
                />

                <div className="pt-3">
                  <SectionLabel>Earth Observation</SectionLabel>
                </div>

                <LayerRow icon={<Satellite className="w-[18px] h-[18px] text-cyan-400" />} name="True-Color Earth" enabled={showTrueColorEarth} loading={isTrueColorEarthLoading} onToggle={onToggleTrueColorEarth} meta="daily" />
                <UpdateMeta freq="Daily" source="NASA GIBS VIIRS" />

                <LayerRow icon={<CloudRain className="w-[18px] h-[18px] text-blue-400" />} name="Rain Radar" enabled={showRainRadar} loading={isRainRadarLoading} onToggle={onToggleRainRadar} meta="10m" />
                <UpdateMeta freq="Every 10m" lastUpdate={rainRadarLastUpdate} source="RainViewer" />

                <LayerRow icon={<Sparkles className="w-[18px] h-[18px] text-green-400" />} name="Aurora Forecast" enabled={showAurora} loading={isAuroraLoading} onToggle={onToggleAurora} meta="30m" />
                <UpdateMeta freq="Every 30m" lastUpdate={auroraLastUpdate} source="NOAA SWPC" />

                {/* City Manager */}
                <div className="pt-5">
                  <CityManager />
                </div>

                {/* System Time */}
                <div className="border-t border-blue-200/10 pt-4 mt-4">
                  <div className="flex items-center gap-2.5 px-4">
                    <Clock4 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[12px] text-slate-500 font-mono">
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
