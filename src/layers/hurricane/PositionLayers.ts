/**
 * Hurricane Position Layers Components
 * Handles ScatterplotLayer and IconLayer components for historical, current, and forecast positions
 */

import { ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { CONFIG } from '../../config';
import type { ProcessedStorm } from '../../types/hurricane';
import { safeSyncOperation } from '../../utils/errorHandler';
import { getIconFactory, getCategoryColor, getStormSize } from '../../utils/IconFactory';
import { createHurricaneTooltip } from '../../utils/tooltipFactory';
import { HurricaneProcessor, getCategoryText } from '../../utils/HurricaneProcessor';

// Create processor instance for wind speed conversion
const hurricaneProcessor = new HurricaneProcessor();

/**
 * Creates a ScatterplotLayer for historical hurricane positions (small dots along track)
 * @param processedStorms - Array of processed storm data
 * @returns ScatterplotLayer for historical positions or null if no data
 */
export function createHistoricalPositionLayer(processedStorms: ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      // Return null if no storm data
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      // Extract historical positions from all storms
      const historicalPositions = processedStorms.flatMap(storm => 
        storm.historical.map(pos => ({...pos, stormName: storm.stormName, currentCategory: storm.currentCategory}))
      );
      
      if (historicalPositions.length === 0) {
        return null;
      }

      return new ScatterplotLayer({
        id: 'hurricane-historical-positions',
        data: historicalPositions,
        getPosition: (d: any) => [d.geometry.x, d.geometry.y],
        getRadius: CONFIG.weather.hurricanes.visualParams.historicalDotRadius,
        getFillColor: (d: any) => {
          const color = getCategoryColor(d.attributes.SS || 0);
          return [color[0], color[1], color[2], 255]; // Full opacity - maximum visibility
        },
        getLineColor: CONFIG.weather.hurricanes.visualParams.historicalDotStroke,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        pickable: true,
        getTooltip: ({object}: {object: any}) => {
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
                  🌀 ${object.stormName}
                </div>
                <div style="color: #e5e7eb;">
                  <div>${getCategoryText(object.attributes.SS || 0)}</div>
                  <div>Winds: ${object.attributes.INTENSITY || 0} kt</div>
                  <div>${new Date(object.attributes.DTG).toLocaleString()}</div>
                </div>
              </div>
            `
          };
        }
      });
    },
    'create hurricane historical position layer',
    null
  );
}

/**
 * Creates an IconLayer for current hurricane positions (prominent current positions)
 * @param processedStorms - Array of processed storm data
 * @returns IconLayer for current positions or null if no data
 */
export function createCurrentPositionLayer(processedStorms: ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      // Return null if no storm data
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      // Extract current positions from storms that have current data
      const currentPositions = processedStorms
        .filter(storm => storm.current)
        .map(storm => ({...storm.current!, stormName: storm.stormName, currentCategory: storm.currentCategory}));
      
      if (currentPositions.length === 0) {
        return null;
      }

      return new IconLayer({
        id: 'hurricane-current-positions',
        data: currentPositions,
        getPosition: (d: any) => [d.geometry.x, d.geometry.y],
        getIcon: (d: any) => {
          const iconFactory = getIconFactory();
          return iconFactory.getIconConfig('current', d.attributes.SS || 0);
        },
        getSize: (d: any) => getStormSize(d.attributes.SS || 0, true),
        sizeUnits: 'pixels',
        pickable: true,
        getTooltip: ({object}: {object: any}) => {
          if (!object) return null;
          return createHurricaneTooltip(object);
        }
      });
    },
    'create hurricane current position layer',
    null
  );
}

/**
 * Creates a ScatterplotLayer for forecast hurricane positions with PREDICTED intensity colors
 * FIXED: Now colors forecast dots based on predicted intensity, not fixed purple
 * @param processedStorms - Array of processed storm data
 * @returns ScatterplotLayer for forecast positions or null if no data
 */
export function createForecastPositionLayer(processedStorms: ProcessedStorm[]): Layer | null {
  return safeSyncOperation(
    () => {
      // Return null if no storm data
      if (!processedStorms || processedStorms.length === 0) {
        return null;
      }

      // Extract forecast positions from all storms
      const forecastPositions = processedStorms.flatMap(storm => 
        storm.forecast.map(pos => ({...pos, stormName: storm.stormName, currentCategory: storm.currentCategory}))
      );
      
      if (forecastPositions.length === 0) {
        return null;
      }

      return new ScatterplotLayer({
        id: 'hurricane-forecast-positions',
        data: forecastPositions,
        getPosition: (d: any) => [d.geometry.x, d.geometry.y],
        getRadius: CONFIG.weather.hurricanes.visualParams.forecastDotRadius,
        getFillColor: (d: any) => {
          // Use PREDICTED intensity from INTENSITY field, convert to category
          const windSpeed = d.attributes.INTENSITY || 0;
          const predictedCategory = windSpeed > 0 
            ? hurricaneProcessor.windSpeedToCategory(windSpeed)  
            : (d.attributes.SS || 0);
          const color = getCategoryColor(predictedCategory);
          return [color[0], color[1], color[2], 220]; // High opacity for visibility
        },
        getLineColor: CONFIG.weather.hurricanes.visualParams.forecastDotStroke,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        pickable: true,
        getTooltip: ({object}: {object: any}) => {
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
                  🌀 ${object.stormName} Forecast
                </div>
                <div style="color: #e5e7eb;">
                  <div>+${object.attributes.FCST_HR || 0}h forecast</div>
                  <div>Winds: ${object.attributes.INTENSITY || 0} kt</div>
                  <div>${getCategoryText(object.attributes.SS || 0)}</div>
                </div>
              </div>
            `
          };
        }
      });
    },
    'create hurricane forecast position layer',
    null
  );
}
