/**
 * City Manager Component - Simple interface for adding/removing cities
 * No complex UI, just clean city management
 */

import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { City } from '../services/simpleCityService';

// Simple geocoding function using OpenStreetMap Nominatim
async function geocodeCity(cityName: string): Promise<City | null> {
  try {
    const encodedCity = encodeURIComponent(cityName.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CityTimesApp/1.0',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const result = data[0];
    const lng = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    const address = result.address || {};
    
    const city = address.city || address.town || address.village || cityName;
    const country = address.country || 'Unknown';
    
    // Simple timezone estimation based on longitude
    const offsetHours = Math.round(lng / 15);
    const utcOffset = Math.max(-12, Math.min(12, offsetHours));
    const timezone = utcOffset >= 0 ? `Etc/GMT-${utcOffset}` : `Etc/GMT+${Math.abs(utcOffset)}`;
    
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: city,
      country: country,
      coordinates: [lng, lat],
      timezone: timezone,
    };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export const CityManager = () => {
  const { 
    cities, 
    isAddingCity, 
    addCity, 
    removeCity, 
    resetToDefaults, 
    setIsAddingCity 
  } = useMapStore();

  const [cityInput, setCityInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCity = async () => {
    if (!cityInput.trim()) {
      setError('Please enter a city name');
      return;
    }
    
    if (cities.length >= 10) {
      setError('Maximum 10 cities allowed');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const city = await geocodeCity(cityInput.trim());
      
      if (!city) {
        setError(`City '${cityInput}' not found`);
        return;
      }

      // Check if city already exists
      const exists = cities.some(c => 
        c.name.toLowerCase() === city.name.toLowerCase() && 
        c.country.toLowerCase() === city.country.toLowerCase()
      );
      
      if (exists) {
        setError(`${city.name} already added`);
        return;
      }

      addCity(city);
      setCityInput('');
      setError(null);
      setIsAddingCity(false);
      
    } catch (err) {
      setError('Failed to lookup city. Try again.');
      console.error('City lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCityInput('');
    setError(null);
    setIsAddingCity(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCity();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="border-t border-blue-200/10 pt-6">
      <h3 className="text-sm font-medium text-blue-200 mb-4 uppercase tracking-wide">
        City Times ({cities.length}/10)
      </h3>

      {/* Current Cities */}
      <div className="space-y-2 mb-4">
        {cities.map(city => (
          <div 
            key={city.id}
            className="flex items-center justify-between p-2 bg-slate-800/30 rounded-md hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-blue-100 text-sm font-medium truncate">
                {city.name}
              </div>
              <div className="text-blue-300 text-xs truncate">
                {city.country}
              </div>
            </div>
            
            <button
              onClick={() => removeCity(city.id)}
              className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
              title={`Remove ${city.name}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add City Input */}
      {isAddingCity ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter city name (e.g. Tokyo, Berlin)..."
              className="w-full px-3 py-2 bg-slate-800/50 border border-blue-200/20 rounded-md text-blue-100 placeholder-blue-300/60 focus:outline-none focus:border-blue-400/60 focus:bg-slate-800/70 transition-colors"
              autoFocus
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-400/10 px-2 py-1 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleAddCity}
              disabled={!cityInput.trim() || isLoading}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              {isLoading ? 'Looking up...' : 'Add City'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-600/50 text-white text-sm rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-2">
          <button
            onClick={() => setIsAddingCity(true)}
            disabled={cities.length >= 10}
            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-blue-100 text-sm rounded transition-colors border border-blue-200/20"
          >
            {cities.length >= 10 ? 'Max Cities (10)' : '+ Add City'}
          </button>
          
          <button
            onClick={resetToDefaults}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-blue-100 text-sm rounded transition-colors border border-blue-200/20"
            title="Reset to London, Paris, New York, Seattle, Dubai, Shanghai"
          >
            Reset
          </button>
        </div>
      )}

      {/* Usage hint */}
      <div className="mt-3 text-xs text-blue-300/60">
        Type any city name to add it to your list
      </div>
    </div>
  );
};
