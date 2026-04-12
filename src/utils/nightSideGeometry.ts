/**
 * Night-side geometry — fully analytical for Mercator rendering.
 *
 * Solar position from astronomy-engine (arcsecond precision).
 * Boundary latitudes computed analytically at each longitude.
 *
 * For a spherical circle of radius r centered at (λ₀, φ₀), the boundary
 * latitude at longitude λ satisfies:
 *   sin(φ₀)·sin(φ) + cos(φ₀)·cos(φ)·cos(λ−λ₀) = cos(r)
 *
 * Solved via half-angle tangent substitution (t = tan(φ/2)), which
 * reduces to a quadratic with solutions directly in the valid range.
 */
import { Body, Equator, Observer, SiderealTime } from 'astronomy-engine';
import type { Feature, Position } from 'geojson';

const MERCATOR_LIMIT = 85;
const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

/**
 * Compute the subsolar point (where the sun is directly overhead).
 */
export function getSubsolarPoint(date: Date): [number, number] {
  const equator = Equator(Body.Sun, date, new Observer(0, 0, 0), true, true);
  const gst = SiderealTime(date);

  let lon = (equator.ra - gst) * 15;
  lon = ((lon % 360) + 540) % 360 - 180;

  return [lon, equator.dec];
}

/**
 * Get the antisolar point (center of the night hemisphere).
 */
function getAntisolarPoint(date: Date): [number, number] {
  const [lon, lat] = getSubsolarPoint(date);
  const antiLon = lon > 0 ? lon - 180 : lon + 180;
  return [antiLon, -lat];
}

/**
 * Solve for boundary latitude(s) of a spherical circle at a given longitude.
 *
 * Uses half-angle tangent substitution: t = tan(φ/2) reduces the
 * trig equation to a quadratic, giving solutions directly in (-180°, 180°).
 * Returns 0, 1, or 2 valid latitudes in [-90°, 90°].
 */
function circleBoundaryLats(
  cLon: number, cLat: number, rDeg: number, lon: number
): number[] {
  const φ0 = cLat * TO_RAD;
  const r = rDeg * TO_RAD;
  const dλ = (lon - cLon) * TO_RAD;

  const A = Math.sin(φ0);
  const B = Math.cos(φ0) * Math.cos(dλ);
  const C = Math.cos(r);

  const qa = -(B + C);
  const qb = 2 * A;
  const qc = B - C;

  const candidates: number[] = [];

  if (Math.abs(qa) < 1e-12) {
    if (Math.abs(qb) > 1e-12) {
      candidates.push(2 * Math.atan(-qc / qb) * TO_DEG);
    }
  } else {
    const disc = qb * qb - 4 * qa * qc;
    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      candidates.push(2 * Math.atan((-qb + sqrtDisc) / (2 * qa)) * TO_DEG);
      candidates.push(2 * Math.atan((-qb - sqrtDisc) / (2 * qa)) * TO_DEG);
    }
  }

  return candidates.filter(l => l >= -90 && l <= 90);
}

/**
 * Build a Mercator-compatible night polygon — fully analytical.
 *
 * Pole-including circles: boundary (west→east) + polar cap (east→west).
 * Non-pole circles: upper boundary (west→east) + lower boundary (east→west).
 *
 * All coordinates go smoothly from -180° to +180° — no antimeridian jumps.
 */
function toMercatorPolygon(
  center: [number, number],
  radiusDegrees: number,
  precision: number
): Feature {
  const distToNorthPole = 90 - center[1];
  const distToSouthPole = 90 + center[1];
  const includesNorthPole = distToNorthPole < radiusDegrees;
  const includesSouthPole = distToSouthPole < radiusDegrees;

  if (includesNorthPole || includesSouthPole) {
    // Pole-including: one boundary + polar cap
    const boundary: Position[] = [];
    for (let lon = -180; lon <= 180; lon += precision) {
      const lats = circleBoundaryLats(center[0], center[1], radiusDegrees, lon);
      const lat = lats.length === 2
        ? (includesSouthPole ? Math.max(lats[0], lats[1]) : Math.min(lats[0], lats[1]))
        : (lats[0] ?? 0);
      boundary.push([lon, Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, lat))]);
    }

    const capLat = includesSouthPole ? -MERCATOR_LIMIT : MERCATOR_LIMIT;
    const cap: Position[] = [];
    for (let lon = 180; lon >= -180; lon -= precision) {
      cap.push([lon, capLat]);
    }

    const ring: Position[] = [...boundary, ...cap, boundary[0]];
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {},
    };
  }

  // Non-pole: upper boundary (west→east) + lower boundary (east→west)
  const upper: Position[] = [];
  const lower: Position[] = [];

  for (let lon = -180; lon <= 180; lon += precision) {
    const lats = circleBoundaryLats(center[0], center[1], radiusDegrees, lon);
    if (lats.length === 2) {
      const hi = Math.max(lats[0], lats[1]);
      const lo = Math.min(lats[0], lats[1]);
      upper.push([lon, Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, hi))]);
      lower.push([lon, Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, lo))]);
    } else if (lats.length === 1) {
      // Boundary just touches this longitude (edge of circle)
      upper.push([lon, lats[0]]);
      lower.push([lon, lats[0]]);
    }
  }

  if (upper.length === 0) {
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} };
  }

  const ring: Position[] = [...upper, ...lower.reverse(), upper[0]];
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {},
  };
}

/**
 * Generate the night-side polygon as Mercator-compatible GeoJSON.
 */
export function getNightPolygon(
  date: Date,
  radiusDegrees: number = 90,
  precision: number = 1
): Feature {
  const center = getAntisolarPoint(date);
  return toMercatorPolygon(center, radiusDegrees, precision);
}

/**
 * Generate the terminator line as a smooth GeoJSON LineString.
 * Analytically computed at each longitude — no antimeridian jumps.
 */
export function getTerminatorLine(
  date: Date,
  precision: number = 1
): Feature {
  const center = getAntisolarPoint(date);
  const coords: Position[] = [];

  for (let lon = -180; lon <= 180; lon += precision) {
    const lats = circleBoundaryLats(center[0], center[1], 90, lon);
    // For the terminator (r=90°), there's exactly one valid solution per longitude
    coords.push([lon, lats[0] ?? 0]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}

/**
 * Generate concentric shadow polygons for gradient rendering.
 * All centered on the antisolar point with radii ≤ 90°.
 * Each is converted to Mercator-compatible geometry.
 */
export function getNightGradientZones(date: Date): Feature[] {
  return [
    getNightPolygon(date, 90, 1),
    getNightPolygon(date, 80, 1),
    getNightPolygon(date, 70, 1),
    getNightPolygon(date, 60, 1),
  ];
}

