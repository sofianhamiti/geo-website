/**
 * Hurricane Forecast Centerline Layer Component
 * 
 * FIXED: Now properly segments forecast tracks by PREDICTED intensity changes
 * instead of using current storm intensity like a fucking amateur
 * 
 * Creates colored segments based on forecast position intensities, matching
 * zoom.earth's professional forecast visualization
 */

import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../../config';
import type { ForecastTrackFeature, ProcessedStorm } from '../../types/hurricane';
import { safeSyncOperation } from '../../utils/errorHandler';
import { HurricaneProcessor, getCategoryText } from '../../utils/HurricaneProcessor';

/**
 * Interface for forecast centerline segment with PREDICTED intensity
 */
interface ForecastCenterlineSegment {
  readonly path: readonly [number, number][];
  readonly color: readonly [number, number, number, number];
  readonly category: number;
  readonly stormName: string;
  readonly stormId: string;
  readonly segmentIndex: number;
}

/**
 * Creates properly segmented forecast tracks colored by PREDICTED intensity changes
 * This is how zoom.earth does it - they show intensity transitions in the forecast
 * 
 * @param tracks - Array of forecast track features containing centerline paths
 * @param processedStorms - Array of processed storm data for forecast positions
 * @returns PathLayer for forecast centerlines or null if no data
 */
export function createForecastCenterlineLayer(tracks: ForecastTrackFeature[], processedStorms: ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      // Return null if no track data
      if (!tracks || tracks.length === 0) {
        return null;
      }

      // Build forecast intensity map from storm forecast positions
      // This is the KEY FUCKING DIFFERENCE - we use FORECAST data, not current data
      const forecastIntensityMap = new Map<string, Map<number, number>>();
      
      if (processedStorms) {
        for (const storm of processedStorms) {
          const hourlyIntensities = new Map<number, number>();
          
          // Extract forecast hour and intensity from each forecast position
          for (const forecastPos of storm.forecast) {
            const forecastHour = forecastPos.attributes.FCST_HR || 0;
            const intensity = forecastPos.attributes.SS || 0;
            hourlyIntensities.set(forecastHour, intensity);
          }
          
          forecastIntensityMap.set(storm.stormId, hourlyIntensities);
        }
      }

      // Process tracks into properly segmented renderable segments
      const centerlineSegments: ForecastCenterlineSegment[] = [];
      const processor = new HurricaneProcessor();
      
      for (const track of tracks) {
        const { attributes, geometry } = track;
        const stormId = attributes.STORMID || 'unknown';
        const stormName = attributes.STORMNAME || 'Unknown Storm';
        
        // Get forecast intensities for this storm
        const stormForecastIntensities = forecastIntensityMap.get(stormId);
        
        // Process each path in the track
        if (geometry.paths && geometry.paths.length > 0) {
          for (const path of geometry.paths) {
            if (path.length < 2) continue; // Need at least 2 points
            
            // If we have forecast intensity data, segment the path by intensity changes
            if (stormForecastIntensities && stormForecastIntensities.size > 0) {
              // Create segments based on intensity changes
              const intensityHours = Array.from(stormForecastIntensities.keys()).sort((a, b) => a - b);
              
              // Interpolate path segments based on forecast hours
              // This is a simplified approach - ideally we'd match path points to forecast times
              const segmentLength = Math.floor(path.length / Math.max(intensityHours.length, 1));
              
              let segmentIndex = 0;
              for (let i = 0; i < intensityHours.length - 1; i++) {
                const startIdx = i * segmentLength;
                const endIdx = Math.min((i + 1) * segmentLength + 1, path.length);
                
                if (endIdx - startIdx >= 2) {
                  const segmentPath = path.slice(startIdx, endIdx);
                  const forecastCategory = stormForecastIntensities.get(intensityHours[i]) || 0;
                  const color = processor.getCategoryColor(forecastCategory);
                  
                  centerlineSegments.push({
                    path: segmentPath.map(coord => [coord[0], coord[1]] as [number, number]),
                    color: [color[0], color[1], color[2], 200] as [number, number, number, number], // Slightly transparent
                    category: forecastCategory,
                    stormName,
                    stormId,
                    segmentIndex: segmentIndex++
                  });
                }
              }
              
              // Add final segment if there are remaining points
              const lastSegmentStart = (intensityHours.length - 1) * segmentLength;
              if (lastSegmentStart < path.length - 1) {
                const finalPath = path.slice(lastSegmentStart);
                const finalCategory = stormForecastIntensities.get(intensityHours[intensityHours.length - 1]) || 0;
                const finalColor = processor.getCategoryColor(finalCategory);
                
                centerlineSegments.push({
                  path: finalPath.map(coord => [coord[0], coord[1]] as [number, number]),
                  color: [finalColor[0], finalColor[1], finalColor[2], 200] as [number, number, number, number],
                  category: finalCategory,
                  stormName,
                  stormId,
                  segmentIndex: segmentIndex++
                });
              }
            } else {
              // Fallback: use track's SS value or default if no forecast data
              const category = attributes.SS ?? 0;
              const color = processor.getCategoryColor(category);
              
              centerlineSegments.push({
                path: path.map(coord => [coord[0], coord[1]] as [number, number]),
                color: [color[0], color[1], color[2], 200] as [number, number, number, number],
                category,
                stormName,
                stormId,
                segmentIndex: 0
              });
            }
          }
        }
      }
      
      if (centerlineSegments.length === 0) {
        return null;
      }

      return new PathLayer({
        id: 'hurricane-forecast-centerlines',
        data: centerlineSegments,
        getPath: (d: ForecastCenterlineSegment) => d.path as any,
        getColor: (d: ForecastCenterlineSegment) => d.color as any,
        getWidth: CONFIG.weather.hurricanes.visualParams.forecastTrackWidth,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: true,
        getTooltip: ({object}: {object: ForecastCenterlineSegment}) => {
          if (!object) return null;
          
          // Get proper color hex for display
          const colorToHex = (color: readonly [number, number, number, number]) => {
            const r = color[0].toString(16).padStart(2, '0');
            const g = color[1].toString(16).padStart(2, '0');
            const b = color[2].toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          };
          
          return {
            html: `
              <div style="
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 13px;
                border-left: 4px solid ${colorToHex(object.color)};
              ">
                <div style="font-weight: 600; margin-bottom: 4px; color: ${colorToHex(object.color)};">
                  🌀 ${object.stormName} Forecast Track
                </div>
                <div style="color: #e5e7eb;">
                  <div>Predicted: ${getCategoryText(object.category)}</div>
                  <div>Forecast Segment #${object.segmentIndex + 1}</div>
                </div>
              </div>
            `
          };
        }
      });
    },
    'create forecast centerline layer',
    null
  );
}
