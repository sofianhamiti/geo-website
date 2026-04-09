import SunCalc from 'suncalc';

export interface TerminatorPoint {
  longitude: number;
  latitude: number;
}

export function generateTerminatorCoordinates(
  date: Date = new Date(),
  resolution: number = 360
): TerminatorPoint[] {
  const points: TerminatorPoint[] = [];

  for (let i = 0; i <= resolution; i++) {
    const longitude = (i * 360 / resolution) - 180;
    const latitude = findTerminatorLatitude(longitude, date);

    if (latitude !== null && !isNaN(latitude)) {
      points.push({ longitude, latitude });
    }
  }

  return points;
}

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

