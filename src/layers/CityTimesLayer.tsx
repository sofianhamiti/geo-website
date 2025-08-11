/**
 * City Times Layer - D3-Force Collision Detection
 * Uses d3-force for proper collision avoidance with minimal configuration
 */

import { TextLayer, ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force';
import { City, getCityLocalTime } from '../services/simpleCityService';
import { CONFIG } from '../config';

export interface CityTimesLayerData {
  city: City;
  time: string;
  position: [number, number];
  labelPosition: [number, number];
  needsLeaderLine: boolean;
}

interface LeaderLineData {
  sourcePosition: [number, number];
  targetPosition: [number, number];
}

// Use centralized configuration
const { cities: cityConfig } = CONFIG.styles;

interface ForceNode {
  id: string;
  originalX: number;
  originalY: number;
  x?: number;
  y?: number;
  radius: number;
}

/**
 * Calculate label collision radius based on text content
 */
function calculateLabelRadius(text: string): number {
  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  const { collision } = cityConfig;
  
  // Convert character dimensions to degrees using config
  const width = maxLineLength * collision.charWidth * collision.pixelsToDegrees;
  const height = lines.length * collision.lineHeight * collision.pixelsToDegrees; 
  
  // Return radius of bounding circle with padding
  return Math.max(Math.sqrt(width * width + height * height) / 2, collision.minRadius);
}

/**
 * D3-Force collision detection - concise version
 */
function calculateCollisionFreePositions(cities: City[], currentTime: Date): CityTimesLayerData[] {
  // Prepare nodes for d3-force simulation
  const nodes: ForceNode[] = cities.map(city => {
    const time = getCityLocalTime(city.timezone, currentTime);
    const text = `${city.name}\n${time}`;
    
    return {
      id: city.id,
      originalX: city.coordinates[0],
      originalY: city.coordinates[1],
      x: city.coordinates[0],
      y: city.coordinates[1],
      radius: calculateLabelRadius(text),
    };
  });

  const { collision } = cityConfig;
  
  // Run d3-force simulation to completion using config parameters
  const simulation = forceSimulation(nodes)
    .force('collide', forceCollide<ForceNode>().radius(d => d.radius).strength(collision.collisionStrength))
    .force('x', forceX<ForceNode>().x(d => d.originalX).strength(collision.springStrength))
    .force('y', forceY<ForceNode>().y(d => d.originalY).strength(collision.springStrength))
    .stop();

  // Run simulation synchronously until convergence using config parameters
  for (let i = 0; i < collision.maxIterations && simulation.alpha() > collision.convergenceThreshold; ++i) {
    simulation.tick();
  }

  // Convert back to layer data
  return cities.map((city, index) => {
    const node = nodes[index];
    const time = getCityLocalTime(city.timezone, currentTime);
    const finalPosition: [number, number] = [node.x || city.coordinates[0], node.y || city.coordinates[1]];
    const hasOffset = Math.abs(finalPosition[0] - city.coordinates[0]) > collision.offsetThreshold || 
                      Math.abs(finalPosition[1] - city.coordinates[1]) > collision.offsetThreshold;

    return {
      city,
      time,
      position: city.coordinates,
      labelPosition: finalPosition,
      needsLeaderLine: hasOffset,
    };
  });
}

/**
 * Create the city times visualization layers with d3-force collision detection
 */
export function createCityTimesLayers(cities: City[], currentTime: Date): any[] {
  // Calculate collision-free positions using d3-force
  const cityData = calculateCollisionFreePositions(cities, currentTime);
  
  // Generate leader line data for offset labels
  const leaderLineData: LeaderLineData[] = cityData
    .filter(item => item.needsLeaderLine)
    .map(item => ({
      sourcePosition: item.position,
      targetPosition: item.labelPosition,
    }));

  const layers: any[] = [];

  // 1. CITY DOTS
  layers.push(new ScatterplotLayer({
    id: 'city-dots',
    data: cityData,
    getPosition: (d: CityTimesLayerData) => d.position,
    getRadius: cityConfig.dotRadius,
    getFillColor: cityConfig.dotColor,
    getLineColor: [0, 0, 0, 100],
    getLineWidth: 0.5,
    radiusUnits: 'pixels',
    pickable: false,
    stroked: true,
    filled: true,
  }));

  // 2. LEADER LINES (only for offset labels)
  if (leaderLineData.length > 0) {
    layers.push(new LineLayer({
      id: 'leader-lines',
      data: leaderLineData,
      getSourcePosition: (d: LeaderLineData) => d.sourcePosition,
      getTargetPosition: (d: LeaderLineData) => d.targetPosition,
      getColor: cityConfig.lineColor,
      getWidth: 1,
      widthUnits: 'pixels',
      pickable: false,
    }));
  }

  // 3. CITY LABELS WITH D3-FORCE COLLISION AVOIDANCE
  layers.push(new TextLayer<CityTimesLayerData>({
    id: 'city-labels',
    data: cityData,
    
    getPosition: (d: CityTimesLayerData) => d.labelPosition, // Use collision-free positions
    getText: (d: CityTimesLayerData) => `${d.city.name}\n${d.time}`,
    
    // Typography
    fontFamily: cityConfig.fontFamily,
    fontWeight: cityConfig.fontWeight,
    lineHeight: cityConfig.lineHeight,
    
    // Styling
    getSize: cityConfig.fontSize,
    getColor: cityConfig.textColor,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    
    // Background
    background: true,
    getBackgroundColor: cityConfig.backgroundColor,
    backgroundBorderRadius: cityConfig.borderRadius,
    backgroundPadding: cityConfig.padding,
    getBorderColor: cityConfig.borderColor,
    getBorderWidth: 1,
    
    // Performance
    sizeScale: 1,
    sizeUnits: 'pixels',
    sizeMinPixels: 10,
    sizeMaxPixels: 20,
    billboard: true,
    pickable: false,
    autoHighlight: false,
    
    fontSettings: {
      fontSize: 64,
      buffer: 4,
      sdf: false,
    },
    
    characterSet: 'auto',
    
    updateTriggers: {
      getText: [currentTime.getMinutes()],
      getPosition: [cities.map(c => c.id).join(',')],
    },
  }));

  return layers;
}

// CityTimesLayerManager class removed - use createCityTimesLayers() directly
