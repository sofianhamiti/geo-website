/**
 * Hurricane Layer - Refactored with New Architecture
 * 
 * Dramatically simplified hurricane visualization layer that leverages
 * the new service-oriented architecture. Reduced from 884 lines to ~100 lines
 * while maintaining exact functionality and backward compatibility.
 * 
 * Features:
 * - Uses HurricaneDataManager for all data operations
 * - Uses focused layer components for clean visualization
 * - Uses IconFactory for efficient icon management
 * - Maintains same exports and API for backward compatibility
 */

import type { Layer } from '@deck.gl/core';
import { TextLayer } from '@deck.gl/layers';
import { hurricaneDataManager } from '../services/HurricaneDataManager';
import {
  createConeLayer,
  createTrackLayer,
  createForecastCenterlineLayer,
  createHistoricalPositionLayer,
  createCurrentPositionLayer,
  createForecastPositionLayer
} from './hurricane';

/**
 * Create error display layer for API failures
 * @param error - Error message to display
 * @returns TextLayer showing error message
 */
function createErrorLayer(error: string): Layer {
  return new TextLayer({
    id: 'hurricane-error',
    data: [{ position: [0, 0], text: `Hurricane Error: ${error}` }],
    getPosition: (d: any) => d.position,
    getText: (d: any) => d.text,
    getSize: 16,
    getColor: [255, 107, 53, 255], // Orange error text
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    background: true,
    getBackgroundColor: [15, 23, 42, 204],
    backgroundPadding: [8, 4, 8, 4],
    pickable: false,
  });
}

/**
 * Create hurricane visualization layers using the new architecture
 * 
 * This is the main export function that creates all hurricane layers.
 * It uses the HurricaneDataManager for data access and the focused
 * layer components for visualization, maintaining exact functionality
 * while dramatically simplifying the codebase.
 * 
 * @returns Array of deck.gl layers for hurricane visualization
 */
export function createHurricaneLayers(): Layer[] {
  // Get data from the centralized data manager
  const data = hurricaneDataManager.getData();
  
  // Handle error state - show error message if API fails
  if (data.error) {
    return [createErrorLayer(data.error)];
  }

  // Create layers using focused layer components
  // Each component handles its own layer creation and error handling
  // Cast readonly arrays to mutable arrays for compatibility
  const layers: Layer[] = [
    createConeLayer(data.trajectories as any),
    createTrackLayer(data.processedStorms as any),
    createForecastCenterlineLayer(data.tracks as any, data.processedStorms as any),
    createHistoricalPositionLayer(data.processedStorms as any),
    createCurrentPositionLayer(data.processedStorms as any),
    createForecastPositionLayer(data.processedStorms as any)
  ].filter(Boolean) as Layer[]; // Remove null entries

  return layers;
}

/**
 * Check if hurricane layer is properly configured
 * 
 * Maintains backward compatibility with existing code that checks
 * if the hurricane layer is available before using it.
 * 
 * @returns Always true since we're using Esri's reliable service
 */
export function isHurricaneLayerConfigured(): boolean {
  return true; // Always available since we're using Esri's public service
}

/**
 * Hurricane Manager using the new HurricaneDataManager
 *
 * This maintains backward compatibility with any existing code that
 * uses the HurricaneManager class directly. It now delegates to the
 * new HurricaneDataManager singleton instance.
 */
export class HurricaneManager {
  /**
   * Start the manager (delegates to HurricaneDataManager.initialize)
   */
  public async start(): Promise<void> {
    await hurricaneDataManager.initialize();
  }

  /**
   * Stop the manager (delegates to HurricaneDataManager.destroy)
   */
  public stop(): void {
    hurricaneDataManager.destroy();
  }

  /**
   * Get current data (delegates to HurricaneDataManager)
   */
  public getData() {
    return hurricaneDataManager.getData();
  }

  /**
   * Manual refresh (delegates to HurricaneDataManager)
   */
  public async refresh(): Promise<void> {
    return hurricaneDataManager.refresh();
  }
}

/**
 * Export the singleton data manager instance for direct usage
 * 
 * This allows other parts of the application to directly access
 * the hurricane data manager for advanced use cases while maintaining
 * the simplified layer creation interface.
 */
export { hurricaneDataManager };

/**
 * Export types for backward compatibility
 * 
 * Re-exports the hurricane types so existing imports continue to work
 */
export type {
  HurricaneFeature,
  TrajectoryFeature,
  ForecastTrackFeature,
  ColoredTrackSegment,
  ProcessedStorm,
  HurricaneLayerData
} from '../types/hurricane';
