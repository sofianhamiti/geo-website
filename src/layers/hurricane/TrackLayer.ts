/**
 * Hurricane Track Layer Component
 * Handles the PathLayer for category-colored track segments
 */

import { PathLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../../config';
import type { ColoredTrackSegment, ProcessedStorm } from '../../types/hurricane';
import { safeSyncOperation } from '../../utils/errorHandler';
import { getCategoryText } from '../../utils/HurricaneProcessor';

/**
 * Creates a PathLayer for hurricane track segments with category-based coloring
 * @param processedStorms - Array of processed storm data containing colored track segments
 * @returns PathLayer for track segments or null if no data
 */
export function createTrackLayer(processedStorms: ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      // Return null if no storm data
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      // Flatten all track segments from all storms
      const allTrackSegments = processedStorms.flatMap(storm => storm.coloredTrackSegments);
      
      if (allTrackSegments.length === 0) {
        return null;
      }

      return new PathLayer({
        id: 'hurricane-colored-track-segments',
        data: allTrackSegments,
        getPath: (d: ColoredTrackSegment) => d.path as any,
        getColor: (d: ColoredTrackSegment) => d.color as any,
        getWidth: (d: ColoredTrackSegment) => {
          return d.segmentType === 'historical' 
            ? CONFIG.weather.hurricanes.visualParams.historicalTrackWidth 
            : CONFIG.weather.hurricanes.visualParams.forecastTrackWidth;
        },
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: true,
        getTooltip: ({object}: {object: ColoredTrackSegment}) => {
          if (!object) return null;
          return {
            html: `
              <div style="
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 13px;
              ">
                <div style="font-weight: 600; margin-bottom: 4px;">
                  🌀 ${object.stormName} ${object.segmentType === 'historical' ? 'Track' : 'Forecast'}
                </div>
                <div style="color: #e5e7eb;">
                  <div>${getCategoryText(object.category)}</div>
                  <div>Segment Type: ${object.segmentType}</div>
                </div>
              </div>
            `
          };
        }
      });
    },
    'create hurricane track layer',
    null
  );
}
