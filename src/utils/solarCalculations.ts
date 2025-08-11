/**
 * Solar calculations utility using SunCalc library
 * Provides accurate solar position and terminator calculations
 */

import SunCalc from 'suncalc';

export interface TerminatorPoint {
  longitude: number;
  latitude: number;
}

/**
 * Generate terminator line coordinates using SunCalc
 * This creates the day/night boundary line on Earth
 */
export function generateTerminatorCoordinates(
  date: Date = new Date(),
  resolution: number = 360
): TerminatorPoint[] {
  const points: TerminatorPoint[] = [];
  
  console.log(`Generating terminator for date: ${date.toISOString()}`);
  
  // Generate points along longitudes
  for (let i = 0; i <= resolution; i++) {
    const longitude = (i * 360 / resolution) - 180;
    const latitude = findTerminatorLatitude(longitude, date);
    
    if (latitude !== null && !isNaN(latitude)) {
      points.push({ longitude, latitude });
      
      // Debug: log first few points
      if (i < 5) {
        console.log(`Point ${i}: lng=${longitude.toFixed(2)}, lat=${latitude.toFixed(2)}`);
      }
    }
  }
  
  console.log(`Generated ${points.length} terminator points`);
  if (points.length > 0) {
    const latRange = [Math.min(...points.map(p => p.latitude)), Math.max(...points.map(p => p.latitude))];
    console.log(`Latitude range: ${latRange[0].toFixed(2)} to ${latRange[1].toFixed(2)}`);
  }
  
  return points;
}

/**
 * Find the latitude where the sun is at the horizon for a given longitude and time
 * Uses binary search with SunCalc for accurate results
 */
function findTerminatorLatitude(longitude: number, date: Date): number | null {
  let minLat = -90;
  let maxLat = 90;
  const tolerance = 0.1; // Slightly larger tolerance for better performance
  const maxIterations = 30;
  let iterations = 0;
  
  while (maxLat - minLat > tolerance && iterations < maxIterations) {
    const midLat = (minLat + maxLat) / 2;
    const sunPosition = SunCalc.getPosition(date, midLat, longitude);
    
    // sunPosition.altitude is in radians, convert to degrees
    const altitudeDegrees = sunPosition.altitude * (180 / Math.PI);
    
    // Simple binary search - if sun is above horizon, it's the day side
    if (altitudeDegrees > 0) {
      // Sun above horizon - this is day side, terminator is on the other side
      maxLat = midLat;
    } else {
      // Sun below horizon - this is night side, terminator is on the other side
      minLat = midLat;
    }
    iterations++;
  }
  
  const result = (minLat + maxLat) / 2;
  
  // Validate result is reasonable
  if (isNaN(result) || result < -90 || result > 90) {
    return null;
  }
  
  return result;
}


/**
 * Get solar position for debugging/information
 */
export function getSolarPosition(date: Date, latitude: number, longitude: number) {
  const position = SunCalc.getPosition(date, latitude, longitude);
  return {
    altitude: position.altitude * (180 / Math.PI), // Convert to degrees
    azimuth: position.azimuth * (180 / Math.PI),   // Convert to degrees
    raw: position
  };
}

/**
 * Get sun times for a location (sunrise, sunset, etc.)
 */
export function getSunTimes(date: Date, latitude: number, longitude: number) {
  return SunCalc.getTimes(date, latitude, longitude);
}

/**
 * Parse hex color to RGBA array for deck.gl
 */
export function parseColorToRGBA(colorHex: string): [number, number, number, number] {
  const hex = colorHex.replace('#', '');
  
  let r: number, g: number, b: number, a = 255;
  
  if (hex.length === 8) {
    // RGBA format
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
    a = parseInt(hex.substr(6, 2), 16);
  } else if (hex.length === 6) {
    // RGB format
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else {
    // Default to orange if parsing fails
    r = 215; g = 106; b = 11; a = 255;
  }
  
  return [r, g, b, a];
}

/**
 * Validate terminator coordinates
 */
export function validateTerminatorCoordinates(coordinates: TerminatorPoint[]): boolean {
  return (
    Array.isArray(coordinates) &&
    coordinates.length > 0 &&
    coordinates.every(point => 
      typeof point.longitude === 'number' &&
      typeof point.latitude === 'number' &&
      point.longitude >= -180 && point.longitude <= 180 &&
      point.latitude >= -90 && point.latitude <= 90
    )
  );
}

/**
 * Debug function to log terminator information
 */
export function debugTerminator(date: Date = new Date()) {
  console.log('=== Terminator Debug Info ===');
  console.log('Date:', date.toISOString());
  
  // Test a few key points
  const testPoints = [
    { lat: 0, lng: 0, name: 'Greenwich' },
    { lat: 40.7, lng: -74, name: 'New York' },
    { lat: 51.5, lng: 0, name: 'London' }
  ];
  
  testPoints.forEach(point => {
    const solar = getSolarPosition(date, point.lat, point.lng);
    const times = getSunTimes(date, point.lat, point.lng);
    console.log(`${point.name}: altitude=${solar.altitude.toFixed(2)}°, sunrise=${times.sunrise?.toISOString()}`);
  });
  
  const coordinates = generateTerminatorCoordinates(date, 36); // Lower resolution for debug
  console.log(`Generated ${coordinates.length} terminator points`);
  console.log('First 5 points:', coordinates.slice(0, 5));
  console.log('Validation:', validateTerminatorCoordinates(coordinates));
}
