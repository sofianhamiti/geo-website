import { safeSyncOperation } from '../utils/errorHandler';

export interface City {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
  timezone: string;
}

// Default starter cities
export const DEFAULT_CITIES: City[] = [
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    coordinates: [-0.1278, 51.5074],
    timezone: 'Europe/London',
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    coordinates: [2.3522, 48.8566],
    timezone: 'Europe/Paris',
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    coordinates: [-74.0060, 40.7128],
    timezone: 'America/New_York',
  },
  {
    id: 'seattle',
    name: 'Seattle',
    country: 'United States',
    coordinates: [-122.3321, 47.6062],
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    coordinates: [55.2708, 25.2048],
    timezone: 'Asia/Dubai',
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    country: 'China',
    coordinates: [121.4737, 31.2304],
    timezone: 'Asia/Shanghai',
  },
];

/**
 * Get formatted local time for a city
 */
export function getCityLocalTime(timezone: string, currentTime: Date): string {
  return safeSyncOperation(
    () => new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(currentTime),
    `format time for ${timezone}`,
    currentTime.getUTCHours().toString().padStart(2, '0') + ':' +
    currentTime.getUTCMinutes().toString().padStart(2, '0')
  );
}

/**
 * Simple localStorage helpers
 */
const STORAGE_KEY = 'cityTimes_userCities';

export function saveUserCities(cities: City[]): void {
  safeSyncOperation(
    () => localStorage.setItem(STORAGE_KEY, JSON.stringify(cities)),
    'save user cities',
    undefined // No meaningful fallback for void operation
  );
}

export function loadUserCities(): City[] {
  return safeSyncOperation(
    () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(c => c.id && c.name && c.coordinates)) {
          return parsed;
        }
      }
      return [...DEFAULT_CITIES];
    },
    'load user cities',
    [...DEFAULT_CITIES]
  );
}
