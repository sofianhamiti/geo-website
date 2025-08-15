/**
 * Hurricane Uncertainty Cone Layer Component
 * Handles the PolygonLayer for forecast uncertainty cones
 */

import { PolygonLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../../config';
import type { TrajectoryFeature } from '../../types/hurricane';
import { safeSyncOperation } from '../../utils/errorHandler';

/**
 * Creates a PolygonLayer for hurricane uncertainty cones
 * @param trajectories - Array of trajectory features containing uncertainty cone data
 * @returns PolygonLayer for uncertainty cones or null if no data
 */
export function createConeLayer(trajectories: TrajectoryFeature[]): Layer | null {
  return safeSyncOperation(
    () => {
      // Return null if no trajectory data
      if (!trajectories || trajectories.length === 0) {
        return null;
      }

      return new PolygonLayer({
        id: 'hurricane-uncertainty-cones',
        data: trajectories,
        getPolygon: (d: TrajectoryFeature) => {
          const rings = d.geometry.rings;
          if (!rings || rings.length === 0) return [];
          const outerRing = rings[0];
          return outerRing.map(coord => [coord[0], coord[1]]);
        },
        getFillColor: CONFIG.weather.hurricanes.zoomEarthColors.uncertaintyCone,
        getLineColor: CONFIG.weather.hurricanes.visualParams.coneStrokeColor,
        getLineWidth: CONFIG.weather.hurricanes.visualParams.coneStrokeWidth,
        lineWidthUnits: 'pixels',
        pickable: true,
        stroked: true,
        filled: true,
        getTooltip: ({object}: {object: TrajectoryFeature}) => {
          if (!object) return null;
          const attrs = object.attributes;
          return {
            html: `
              <div style="
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 13px;
                border-left: 4px solid rgb(204, 0, 204);
              ">
                <div style="font-weight: 600; margin-bottom: 4px; color: rgb(204, 0, 204);">
                  🌀 ${attrs.STORMNAME || 'Storm'} Forecast Cone
                </div>
                <div style="color: #e5e7eb;">
                  <div>Forecast Hour: ${attrs.FCST_HR}h</div>
                  <div>Category: ${attrs.SS > 0 ? attrs.SS : 'TS'}</div>
                </div>
              </div>
            `
          };
        }
      });
    },
    'create hurricane uncertainty cone layer',
    null
  );
}