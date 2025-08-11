/**
 * Cities Overlay - Simplified HTML-based real-time city times
 * Direct positioning without leader lines or complex offsets
 */

import { useEffect, useState, useRef } from 'react';
import type { Map } from 'maplibre-gl';
import { useMapStore } from '../store/mapStore';
import { City, getCityLocalTime } from '../services/simpleCityService';

interface CityPosition {
  city: City;
  screenX: number;
  screenY: number;
  time: string;
}

interface CitiesOverlayProps {
  map: Map | null;
  visible: boolean;
}

export const CitiesOverlay: React.FC<CitiesOverlayProps> = ({ map, visible }) => {
  const { cities } = useMapStore();
  const [cityPositions, setCityPositions] = useState<CityPosition[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update times synchronized to minute boundaries (drift-free)
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setCurrentTime(now);
      console.log('🏙️ HTML Overlay: City times updated at:', now.toISOString());
    };

    // Schedule next update to sync with top of minute
    const scheduleNextUpdate = () => {
      const now = new Date();
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      
      return setTimeout(() => {
        updateTimes();
        // Recalculate for next minute to avoid drift
        timeoutId = scheduleNextUpdate();
      }, msToNextMinute);
    };

    // Initial update and start scheduling
    updateTimes();
    let timeoutId = scheduleNextUpdate();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Update city positions when map changes (simplified - no leader lines)
  useEffect(() => {
    if (!map || !visible) {
      setCityPositions([]);
      return;
    }

    const updatePositions = () => {
      // Use map's actual zoom instead of prop to avoid race conditions
      const currentZoom = map.getZoom();
      
      // Don't show cities at very low zoom levels
      if (currentZoom < 2) {
        setCityPositions([]);
        return;
      }

      const newPositions: CityPosition[] = cities.map((city: City) => {
        // Direct positioning - no offsets or leader lines
        const point = map.project(city.coordinates);
        
        return {
          city,
          screenX: point.x,
          screenY: point.y,
          time: getCityLocalTime(city.timezone, currentTime),
        };
      });

      setCityPositions(newPositions);
    };

    // Initial position update
    updatePositions();

    // Use continuous events for super smooth positioning during zoom/pan
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);

    return () => {
      map.off('move', updatePositions);
      map.off('zoom', updatePositions);
      map.off('resize', updatePositions);
    };
  }, [map, visible, currentTime, cities]); // Removed zoom dependency to prevent race conditions

  if (!visible || cityPositions.length === 0) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* City labels with dots directly positioned */}
      {cityPositions.map(({ city, screenX, screenY, time }) => (
        <div
          key={`${city.name}`}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${screenX}px`,
            top: `${screenY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* City dot */}
          <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-white rounded-full border border-black/20 transform -translate-x-1/2 -translate-y-1/2" />
          
          {/* City label */}
          <div className="bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10 text-center">
            <div className="text-white text-sm font-bold leading-tight">
              {city.name}
            </div>
            <div className="text-blue-200 text-xs leading-tight">
              {time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};