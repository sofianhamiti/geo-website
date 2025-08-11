/**
 * Timezone utilities - Replaces complex canvas-based timezone ruler
 * Simple date calculations without external dependencies
 */

export interface TimezoneInfo {
  longitude: number;
  utcOffset: number;
  localTime: string;
  displayTime: string;
}

/**
 * Format time to HH:MM format
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Generate timezone information for visible longitude range
 * Much simpler than the original canvas-based implementation
 */
export function generateTimezoneData(
  westLng: number,
  eastLng: number,
  currentTime: Date = new Date()
): TimezoneInfo[] {
  const timezones: TimezoneInfo[] = [];
  
  // Generate data for every 15 degrees (1 hour intervals)
  const startLng = Math.floor(westLng / 15) * 15;
  const endLng = Math.ceil(eastLng / 15) * 15;
  
  for (let lng = startLng; lng <= endLng; lng += 15) {
    if (lng < westLng - 15 || lng > eastLng + 15) continue;
    
    const utcOffset = lng / 15; // Hours from UTC
    const offsetMs = utcOffset * 3600000; // Convert to milliseconds
    const localTime = new Date(currentTime.getTime() + offsetMs);
    
    timezones.push({
      longitude: lng,
      utcOffset,
      localTime: localTime.toISOString(),
      displayTime: formatTime(localTime),
    });
  }
  
  return timezones;
}

/**
 * Get time at specific longitude
 */
export function getTimeAtLongitude(longitude: number, currentTime: Date = new Date()): string {
  const utcOffset = longitude / 15;
  const offsetMs = utcOffset * 3600000;
  const localTime = new Date(currentTime.getTime() + offsetMs);
  
  return formatTime(localTime);
}

/**
 * Calculate moving offset for smooth timezone ruler animation
 */
export function getTimeOffset(date: Date): number {
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();
  
  // Convert sub-hour time to degrees of longitude offset
  // 15° per hour = 0.25° per minute = 0.00417° per second
  return (minutes * 0.25) + (seconds * 0.00417) + (milliseconds * 0.00000694);
}
