/**
 * Tooltip Factory - Centralized tooltip generation for map layers
 * Extracts the repetitive tooltip HTML generation logic from Map.tsx
 */

import { HurricaneProcessor } from './HurricaneProcessor';

// Create processor instance for wind speed conversion
const hurricaneProcessor = new HurricaneProcessor();

// Shared tooltip styling constants
const TOOLTIP_STYLES = {
  base: {
    background: 'rgba(15, 23, 42, 0.95)',
    color: 'white',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  small: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  large: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.4',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
  }
};

const COLORS = {
  primary: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  yellow: '#e6b800',
  light: '#cbd5e1',
  lighter: '#94a3b8',
  gray: '#6b7280',
  iss: '#fff58c',
  hurricane: '#ff4444',
  earthquake: '#fbbf24',
};

/**
 * Creates a tooltip container with shared styling
 */
function createTooltipContainer(
  content: string, 
  borderColor: string = COLORS.primary, 
  size: 'small' | 'large' = 'small',
  maxWidth: string = '200px'
) {
  const sizeStyles = TOOLTIP_STYLES[size];
  
  return {
    html: `
      <div style="
        background: ${TOOLTIP_STYLES.base.background};
        color: ${TOOLTIP_STYLES.base.color};
        padding: ${sizeStyles.padding};
        border-radius: ${sizeStyles.borderRadius};
        border: ${size === 'large' ? '2px' : '1px'} solid ${borderColor};
        font-family: ${TOOLTIP_STYLES.base.fontFamily};
        font-size: ${sizeStyles.fontSize};
        line-height: ${sizeStyles.lineHeight};
        backdrop-filter: ${TOOLTIP_STYLES.base.backdropFilter};
        box-shadow: ${'boxShadow' in sizeStyles ? sizeStyles.boxShadow : TOOLTIP_STYLES.base.boxShadow};
        max-width: ${maxWidth};
      ">
        ${content}
      </div>
    `,
    style: {
      backgroundColor: 'transparent',
      color: 'white'
    }
  };
}

/**
 * Creates a status badge with specified color and text
 */
function createStatusBadge(text: string, backgroundColor: string, fontSize: string = '10px') {
  return `
    <span style="
      background: ${backgroundColor};
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: ${fontSize};
      font-weight: 500;
    ">
      ${text}
    </span>
  `;
}

/**
 * Mountain peaks tooltip generator
 */
export function createMountainTooltip(mountain: any) {
  const elevation = mountain.elevation.toLocaleString() + 'm';
  
  const content = `
    <div style="font-weight: 600; color: ${COLORS.yellow}; margin-bottom: 4px;">
      ${mountain.name}
    </div>
    <div style="color: ${COLORS.light}; font-size: 12px;">
      ${elevation} elevation
    </div>
    <div style="color: ${COLORS.lighter}; font-size: 11px; margin-top: 2px;">
      ${mountain.range} • ${mountain.country}
    </div>
  `;
  
  return createTooltipContainer(content, `rgba(59, 130, 246, 0.3)`, 'small', '200px');
}

/**
 * UNESCO sites tooltip generator
 */
export function createUnescoTooltip(site: any) {
  const dangerStatus = site.danger === 1 ? '⚠️ Site in Danger' : '✅ Protected';
  const dangerColor = site.danger === 1 ? COLORS.danger : COLORS.success;
  
  const content = `
    <div style="font-weight: 600; color: ${COLORS.warning}; margin-bottom: 6px;">
      ${site.name_en}
    </div>
    <div style="margin-bottom: 4px;">
      ${createStatusBadge(dangerStatus, dangerColor)}
    </div>
    <div style="color: ${COLORS.light}; font-size: 12px;">
      ${site.category} • Inscribed ${site.date_inscribed}
    </div>
  `;
  
  return createTooltipContainer(content, `rgba(59, 130, 246, 0.3)`, 'small', '280px');
}

/**
 * ISS position tooltip generator
 */
export function createISSTooltip(iss: any) {
  const altitude = Math.round(iss.altitude);
  const velocity = Math.round(iss.velocity);
  const lastUpdate = new Date(iss.timestamp * 1000).toLocaleTimeString();
  
  const content = `
    <div style="font-weight: 600; color: ${COLORS.iss}; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
      🛰️ International Space Station
    </div>
    <div style="color: ${COLORS.light}; font-size: 12px; margin-bottom: 4px;">
      <div style="margin-bottom: 2px;">
        <strong>Altitude:</strong> ${altitude.toLocaleString()} km
      </div>
      <div style="margin-bottom: 2px;">
        <strong>Velocity:</strong> ${velocity.toLocaleString()} km/h
      </div>
      <div style="margin-bottom: 2px;">
        <strong>Position:</strong> ${iss.latitude.toFixed(2)}°, ${iss.longitude.toFixed(2)}°
      </div>
    </div>
    <div style="color: ${COLORS.lighter}; font-size: 11px; margin-top: 4px;">
      Updated: ${lastUpdate}
    </div>
  `;
  
  return createTooltipContainer(content, `rgba(255, 245, 140, 0.4)`, 'small', '240px');
}

/**
 * Hurricane position tooltip generator - handles different position types
 */
export function createHurricaneTooltip(hurricane: any, layerId?: string) {
  const attrs = hurricane.attributes;
  const intensity = attrs.INTENSITY || 0;
  const pressure = attrs.MSLP || 0;
  
  // Determine category based on layer type and available data
  let category = 0;
  let categoryText = 'Tropical Storm';
  
  if (layerId === 'hurricane-forecast-positions') {
    // Forecast positions: calculate category from INTENSITY (wind speed in knots)
    category = intensity > 0 ? hurricaneProcessor.windSpeedToCategory(intensity) : (attrs.SS || 0);
    categoryText = category > 0 ? `Category ${category} Hurricane` : attrs.STORMTYPE || 'Tropical Storm';
  } else if (layerId === 'hurricane-ssnum-forecast-dots') {
    // SSNUM positions: use SSNUM attribute for category
    category = attrs.SSNUM || 0;
    categoryText = category > 0 ? `Category ${category} Hurricane` : attrs.STORMTYPE || 'Tropical Storm';
  } else {
    // Current and historical positions: use SS attribute
    category = attrs.SS || 0;
    categoryText = category > 0 ? `Category ${category} Hurricane` : attrs.STORMTYPE || 'Tropical Storm';
  }
  
  const borderColor = category > 0 ? COLORS.danger : COLORS.primary;
  const badgeColor = category > 2 ? COLORS.danger : category > 0 ? COLORS.warning : COLORS.primary;
  
  // Handle different timestamp formats
  let timestampDisplay = '';
  if (attrs.DTG) {
    timestampDisplay = new Date(attrs.DTG).toLocaleString();
  } else if (attrs.VALIDTIME) {
    timestampDisplay = new Date(attrs.VALIDTIME).toLocaleString();
  } else {
    timestampDisplay = 'Unknown';
  }
  
  // Handle forecast hour for SSNUM positions
  let forecastInfo = '';
  if (layerId === 'hurricane-ssnum-forecast-dots' && attrs.TAU) {
    forecastInfo = `
      <div style="margin-bottom: 3px;">
        <strong>Forecast Hour:</strong> +${attrs.TAU}h
      </div>
    `;
  }
  
  const content = `
    <div style="font-weight: 700; color: ${COLORS.hurricane}; margin-bottom: 8px; font-size: 16px;">
      🌀 ${attrs.STORMNAME || hurricane.stormName || 'Unknown Storm'}
    </div>
    <div style="margin-bottom: 6px;">
      ${createStatusBadge(categoryText, badgeColor, '12px')}
    </div>
    <div style="color: #e5e7eb; font-size: 13px;">
      <div style="margin-bottom: 3px;">
        <strong>Max Winds:</strong> ${intensity} knots (${Math.round(intensity * 1.15)} mph)
      </div>
      <div style="margin-bottom: 3px;">
        <strong>Pressure:</strong> ${pressure} mb
      </div>
      ${forecastInfo}
      <div style="margin-bottom: 3px;">
        <strong>Basin:</strong> ${attrs.BASIN?.toUpperCase() || 'Unknown'}
      </div>
      <div style="margin-bottom: 3px;">
        <strong>Position:</strong> ${hurricane.geometry ? hurricane.geometry.y.toFixed(2) : hurricane.attributes.LAT?.toFixed(2) || '?'}°N, ${hurricane.geometry ? Math.abs(hurricane.geometry.x).toFixed(2) : Math.abs(hurricane.attributes.LON || 0).toFixed(2)}°W
      </div>
    </div>
    <div style="color: #9ca3af; font-size: 11px; margin-top: 6px; border-top: 1px solid #374151; padding-top: 6px;">
      Last updated: ${timestampDisplay}
    </div>
  `;
  
  return createTooltipContainer(content, borderColor, 'large', '280px');
}

/**
 * Hurricane track tooltip generators
 */
export function createHurricaneObservedTrackTooltip(object: any) {
  const content = `
    <div style="font-weight: 600; color: #ffffff; margin-bottom: 4px;">
      ${object.stormName} - Observed Track
    </div>
    <div style="color: ${COLORS.light}; font-size: 12px;">
      Historical storm path
    </div>
  `;
  
  return createTooltipContainer(content, `rgba(59, 130, 246, 0.3)`, 'small', '200px');
}

export function createHurricaneForecastTrackTooltip(object: any) {
  const content = `
    <div style="font-weight: 600; color: ${COLORS.primary}; margin-bottom: 4px;">
      ${object.stormName} - Forecast Track
    </div>
    <div style="color: ${COLORS.light}; font-size: 12px;">
      Predicted storm path
    </div>
  `;
  
  return createTooltipContainer(content, `rgba(59, 130, 246, 0.3)`, 'small', '200px');
}

/**
 * Hurricane cone of uncertainty tooltip generator
 */
export function createHurricaneConeTooltip(cone: any) {
  const stormName = cone.STORMNAME || cone.attributes?.STORMNAME || 'Unknown Storm';
  
  const content = `
    <div style="font-weight: 600; color: ${COLORS.hurricane}; margin-bottom: 4px;">
      🌀 ${stormName}
    </div>
    <div style="color: ${COLORS.light}; font-size: 12px;">
      Cone of uncertainty
    </div>
    <div style="color: ${COLORS.lighter}; font-size: 11px; margin-top: 2px;">
      Probable path area
    </div>
  `;
  
  return createTooltipContainer(content, `rgba(255, 68, 68, 0.4)`, 'small', '180px');
}

/**
 * Earthquake position tooltip generator
 */
export function createEarthquakeTooltip(earthquake: any) {
  const props = earthquake.properties;
  const coords = earthquake.geometry.coordinates;
  
  const magnitude = props.mag.toFixed(1);
  const depth = Math.round(coords[2]);
  const time = new Date(props.time).toLocaleString();
  const significance = props.sig;
  
  const alertColors = {
    red: COLORS.danger,
    orange: COLORS.warning,
    yellow: '#eab308',
    green: COLORS.success
  };
  const alertColor = alertColors[props.alert as keyof typeof alertColors] || COLORS.gray;
  
  const content = `
    <div style="font-weight: 700; color: ${COLORS.earthquake}; margin-bottom: 8px; font-size: 15px;">
      🌍 M${magnitude} Earthquake
    </div>
    <div style="margin-bottom: 6px;">
      ${createStatusBadge(props.alert || 'No Alert', alertColor, '11px')}
    </div>
    <div style="color: #e5e7eb; font-size: 12px;">
      <div style="margin-bottom: 3px;">
        <strong>Location:</strong> ${props.place}
      </div>
      <div style="margin-bottom: 3px;">
        <strong>Depth:</strong> ${depth} km
      </div>
      <div style="margin-bottom: 3px;">
        <strong>Significance:</strong> ${significance}
      </div>
      ${props.tsunami ? '<div style="color: #ef4444; font-weight: 600;">⚠️ Tsunami Alert</div>' : ''}
    </div>
    <div style="color: #9ca3af; font-size: 10px; margin-top: 6px; border-top: 1px solid #374151; padding-top: 6px;">
      ${time} • ${props.net.toUpperCase()}
    </div>
  `;
  
  return createTooltipContainer(content, alertColor, 'large', '280px');
}


/**
 * Aircraft position tooltip generator
 */
export function createPlaneTooltip(aircraft: any) {
  // Callsign (if available)
  let callsignDisplay = '';
  if (aircraft.callsign && aircraft.callsign.trim()) {
    callsignDisplay = `<strong>Flight:</strong> ${aircraft.callsign.trim()}`;
  } else {
    callsignDisplay = `<strong>Aircraft:</strong> ${aircraft.icao24.toUpperCase()}`;
  }
  
  // Altitude
  let altitudeDisplay = '';
  if (aircraft.baro_altitude !== null) {
    const altFeet = Math.round(aircraft.baro_altitude * 3.28084); // Convert meters to feet
    altitudeDisplay = `<strong>Altitude:</strong> ${altFeet.toLocaleString()} ft`;
  }
  
  // Speed
  let speedDisplay = '';
  if (aircraft.velocity !== null) {
    const speedKnots = Math.round(aircraft.velocity * 1.94384); // Convert m/s to knots
    const speedMph = Math.round(aircraft.velocity * 2.23694); // Convert m/s to mph
    speedDisplay = `<strong>Speed:</strong> ${speedKnots} kts (${speedMph} mph)`;
  }
  
  // Heading
  let headingDisplay = '';
  if (aircraft.true_track !== null) {
    const heading = Math.round(aircraft.true_track);
    const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(heading / 45) % 8];
    headingDisplay = `<strong>Heading:</strong> ${compass} ${heading}°`;
  }
  
  // Origin country and status
  const countryDisplay = `<strong>Country:</strong> ${aircraft.origin_country}`;
  const statusDisplay = `<strong>Status:</strong> ${aircraft.on_ground ? 'On Ground' : 'Flying'}`;

  const content = [
    callsignDisplay,
    altitudeDisplay,
    speedDisplay,
    headingDisplay,
    countryDisplay,
    statusDisplay
  ].filter(line => line).join('<br>');

  return createTooltipContainer(content, `rgba(100, 149, 237, 0.3)`, 'large', '280px');
}

/**
 * Main tooltip factory function - dispatches to appropriate tooltip generator
 */
export function createLayerTooltip(object: any, layer: any) {
  if (!object || !layer?.id) {
    return null;
  }

  switch (layer.id) {
    case 'mountain-peaks':
      return createMountainTooltip(object);
    
    case 'unesco-sites':
      return createUnescoTooltip(object);
    
    case 'iss-position':
      return createISSTooltip(object);
    
    case 'hurricane-positions':
      return createHurricaneTooltip(object, layer.id);
    
    case 'hurricane-historical-positions':
      return createHurricaneTooltip(object, layer.id);
    
    case 'hurricane-forecast-positions':
      return createHurricaneTooltip(object, layer.id);
    
    case 'hurricane-ssnum-forecast-dots':
      return createHurricaneTooltip(object, layer.id);
    
    case 'hurricane-tracks':
      return createHurricaneObservedTrackTooltip(object);
    
    case 'hurricane-ssnum-trajectories':
      return createHurricaneForecastTrackTooltip(object);
    
    case 'hurricane-cones':
      return createHurricaneConeTooltip(object);
    
    case 'hurricane-observed-tracks':
      return createHurricaneObservedTrackTooltip(object);
    
    case 'hurricane-forecast-tracks':
      return createHurricaneForecastTrackTooltip(object);
    
    case 'earthquake-positions':
      return createEarthquakeTooltip(object);
    
    case 'plane-positions':
      return createPlaneTooltip(object);
    
    default:
      return null;
  }
}
