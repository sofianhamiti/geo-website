/**
 * Simple City Service - No external libraries, just a curated city list
 * Users can pick from popular cities, no geocoding API bullshit
 */

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

// Popular cities users can add
export const POPULAR_CITIES: City[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    coordinates: [139.6917, 35.6895],
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    coordinates: [151.2093, -33.8688],
    timezone: 'Australia/Sydney',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    coordinates: [103.8198, 1.3521],
    timezone: 'Asia/Singapore',
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    country: 'China',
    coordinates: [114.1694, 22.3193],
    timezone: 'Asia/Hong_Kong',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    coordinates: [72.8777, 19.0760],
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brazil',
    coordinates: [-46.6333, -23.5505],
    timezone: 'America/Sao_Paulo',
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    coordinates: [-99.1332, 19.4326],
    timezone: 'America/Mexico_City',
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    country: 'United States',
    coordinates: [-118.2437, 34.0522],
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'chicago',
    name: 'Chicago',
    country: 'United States',
    coordinates: [-87.6298, 41.8781],
    timezone: 'America/Chicago',
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    coordinates: [-79.3832, 43.6532],
    timezone: 'America/Toronto',
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    coordinates: [13.4050, 52.5200],
    timezone: 'Europe/Berlin',
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    coordinates: [-3.7038, 40.4168],
    timezone: 'Europe/Madrid',
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    coordinates: [12.4964, 41.9028],
    timezone: 'Europe/Rome',
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    coordinates: [4.9041, 52.3676],
    timezone: 'Europe/Amsterdam',
  },
  {
    id: 'stockholm',
    name: 'Stockholm',
    country: 'Sweden',
    coordinates: [18.0686, 59.3293],
    timezone: 'Europe/Stockholm',
  },
];

/**
 * Get formatted local time for a city
 */
export function getCityLocalTime(timezone: string, currentTime: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(currentTime);
  } catch {
    return currentTime.getUTCHours().toString().padStart(2, '0') + ':' +
           currentTime.getUTCMinutes().toString().padStart(2, '0');
  }
}

// Manual collision logic removed - now handled by Deck.gl TextLayer collision detection


/**
 * Simple localStorage helpers
 */
const STORAGE_KEY = 'cityTimes_userCities';

export function saveUserCities(cities: City[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
  } catch (error) {
    console.error('Failed to save cities:', error);
  }
}

export function loadUserCities(): City[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(c => c.id && c.name && c.coordinates)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
  
  return [...DEFAULT_CITIES];
}
