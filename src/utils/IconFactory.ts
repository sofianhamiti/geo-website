import { CONFIG } from '../config';

export function getCategoryColor(category: number): [number, number, number, number] {
  const normalizedCategory = Math.max(0, Math.min(5, Math.floor(category)));
  return CONFIG.weather.hurricanes.categoryColors[normalizedCategory as keyof typeof CONFIG.weather.hurricanes.categoryColors] ||
         CONFIG.weather.hurricanes.categoryColors[0];
}
