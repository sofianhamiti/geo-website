/**
 * Map Control Panel - Extracted from Map.tsx to reduce component size
 * Handles all the UI controls for layers, basemaps, and settings
 */

import React from 'react';
import { CityManager } from './CityManager';

interface MapControlPanelProps {
  isMenuOpen: boolean;
  selectedBasemap: 'usgs' | 'arcgis';
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
  currentTime: Date;
  onToggleMenu: () => void;
  onSetSelectedBasemap: (basemap: 'usgs' | 'arcgis') => void;
  onToggleArcgisPlaces: () => void;
  onToggleTimezones: () => void;
  onToggleMountains: () => void;
  onToggleUnesco: () => void;
  onToggleCities: () => void;
  onToggleTerminator: () => void;
  onToggleISS: () => void;
  onToggleEarthquakes: () => void;
  onToggleHurricanes: () => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onClick: () => void; disabled?: boolean }> = ({ 
  enabled, 
  onClick, 
  disabled = false 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
      enabled ? 'bg-blue-600' : 'bg-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
      enabled ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
);

const LayerControl: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  enabled: boolean;
  loading?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}> = ({ title, subtitle, icon, enabled, loading = false, disabled = false, onToggle }) => (
  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-all duration-200">
    <div className="flex items-center space-x-3">
      <div className="w-5 h-5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-blue-100 font-medium">{title}</div>
        <div className="text-blue-300 text-xs">{subtitle}</div>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      {loading && (
        <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
      )}
      <ToggleSwitch enabled={enabled} onClick={onToggle} disabled={disabled || loading} />
    </div>
  </div>
);

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
}) => {
  return (
    <>
      {/* Menu Toggle Button */}
      <div className="absolute top-3 right-3 z-50">
        <button
          onClick={onToggleMenu}
          className="p-2 bg-slate-800/90 backdrop-blur-sm border border-blue-200/20 rounded-lg text-blue-100 hover:bg-slate-700/90 hover:text-white transition-all duration-200 shadow-lg"
          title="Toggle Controls Panel"
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="transition-transform duration-200"
          >
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
        {/* Panel Header */}
        <div className="p-6 border-b border-blue-200/10 flex-shrink-0">
          <h2 className="text-lg font-semibold text-blue-100">Map Controls</h2>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          
            {/* Basemap Section */}
            <div>
              <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Basemap</h3>
              <div className="space-y-3">
                
                {/* USGS Blue Marble */}
                <div 
                  onClick={() => onSetSelectedBasemap('usgs')}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedBasemap === 'usgs' 
                      ? 'bg-blue-600/30 border border-blue-400/50' 
                      : 'bg-slate-800/50 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-blue-100 font-medium">Blue Marble</div>
                      <div className="text-blue-300 text-xs">USGS Natural Earth</div>
                    </div>
                  </div>
                  {selectedBasemap === 'usgs' && (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* ArcGIS Satellite */}
                <div 
                  onClick={() => onSetSelectedBasemap('arcgis')}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedBasemap === 'arcgis' 
                      ? 'bg-blue-600/30 border border-blue-400/50' 
                      : 'bg-slate-800/50 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-blue-100 font-medium">Satellite Imagery</div>
                      <div className="text-blue-300 text-xs">ArcGIS World Imagery</div>
                    </div>
                  </div>
                  {selectedBasemap === 'arcgis' && (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Static Layers Section */}
            <div>
              <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Static Layers</h3>
              <div className="space-y-3">
                
                <LayerControl
                  title="Places & Boundaries"
                  subtitle="Administrative labels"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>}
                  enabled={showArcgisPlaces}
                  onToggle={onToggleArcgisPlaces}
                />

                <LayerControl
                  title="Time Zones"
                  subtitle="World timezone boundaries"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,15.4L16.2,16.2Z"/>
                  </svg>}
                  enabled={showTimezones}
                  onToggle={onToggleTimezones}
                />

                <LayerControl
                  title="Mountain Peaks"
                  subtitle="Elevation markers"
                  icon={<svg width="16" height="16" viewBox="0 0 15 15" fill="currentColor" className="text-yellow-500">
                    <path d="M7.5 1c-.3 0-.4.2-.6.4l-5.8 9.5c-.1.1-.1.3-.1.4c0 .5.4.7.7.7h11.6c.4 0 .7-.2.7-.7c0-.2 0-.2-.1-.4L8.2 1.4C8 1.2 7.8 1 7.5 1m0 1.5L10.8 8H10L8.5 6.5L7.5 8l-1-1.5L5 8h-.9z"/>
                  </svg>}
                  enabled={showMountains}
                  onToggle={onToggleMountains}
                />

                <LayerControl
                  title="UNESCO Sites"
                  subtitle="World Heritage sites"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                    <path d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/>
                  </svg>}
                  enabled={showUnesco}
                  onToggle={onToggleUnesco}
                />
              </div>
            </div>

            {/* Dynamic Layers Section */}
            <div>
              <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">Dynamic Layers</h3>
              <div className="space-y-3">

                <LayerControl
                  title="City Times"
                  subtitle="Major city time zones"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                    <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
                  </svg>}
                  enabled={showCities}
                  onToggle={onToggleCities}
                />

                <LayerControl
                  title="Day/Night Terminator"
                  subtitle="Real-time shadow line"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>}
                  enabled={showTerminator}
                  onToggle={onToggleTerminator}
                />

                <LayerControl
                  title="ISS Tracking"
                  subtitle={isISSLoading ? 'Loading...' : 'Real-time position & orbit'}
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                    <path d="M15.5 19v2h-1.77c-.34.6-.99 1-1.73 1s-1.39-.4-1.73-1H8.5v-2h1.77c.17-.3.43-.56.73-.73V17h-1c-.55 0-1-.45-1-1v-3H6v4c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v3h3V8c0-.55.45-1 1-1h1V6h-1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1h-1v1h1c.55 0 1 .45 1 1v3h3V8c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-4h-3v3c0 .55-.45 1-1 1h-1v1.27c.3.17.56.43.73.73zM3 16v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2V8zm16 8v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2v-1zm0-2v1h2V8z"/>
                  </svg>}
                  enabled={showISS}
                  loading={isISSLoading}
                  onToggle={onToggleISS}
                />

                <LayerControl
                  title="Earthquakes"
                  subtitle={isEarthquakesLoading ? 'Loading...' : earthquakeLastUpdate ? `Updated ${earthquakeLastUpdate.toLocaleTimeString()}` : 'Real-time seismic data'}
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-500">
                    <circle cx="8" cy="8" r="1" fill="currentColor"/>
                    <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="0.8"/>
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7"/>
                  </svg>}
                  enabled={showEarthquakes}
                  loading={isEarthquakesLoading}
                  onToggle={onToggleEarthquakes}
                />

                <LayerControl
                  title="Hurricane Tracking"
                  subtitle={isHurricanesLoading ? 'Loading...' : hurricaneLastUpdate ? `Updated ${hurricaneLastUpdate.toLocaleTimeString()}` : 'Live storm tracking'}
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-orange-400">
                    <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1"/>
                    <path d="M6 3.5l-0.1 0.2A8 8 0 0 0 5.2 8.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    <path d="M10 12.5l0.1-0.2A8 8 0 0 0 10.8 7.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>}
                  enabled={showHurricanes}
                  loading={isHurricanesLoading}
                  onToggle={onToggleHurricanes}
                />
              </div>
            </div>

            {/* City Manager */}
            <CityManager />

            {/* Current Time Display */}
            <div className="border-t border-blue-200/10 pt-6">
              <h3 className="text-sm font-medium text-blue-200 mb-3 uppercase tracking-wide">System Time</h3>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-blue-100 font-mono text-sm">
                  {currentTime.toLocaleString()}
                </div>
                <div className="text-blue-300 text-xs mt-1">
                  Updates every 10 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
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