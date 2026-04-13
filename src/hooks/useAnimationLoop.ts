import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';
import { EQ_PULSE_DURATION_MS, EQ_RING_COUNT, EQ_PHI_EXPONENT, EQ_PHASE_SPREAD, EQ_BASE_OPACITY, EQ_OPACITY_DECAY } from '../layers/EarthquakeLayer';

const PHI = 1.618;

// Hurricane: one full rotation in 10 seconds
const HC_ROTATION_SPEED = 360 / 10000; // degrees per ms

/**
 * Drives a requestAnimationFrame loop that:
 * - Animates earthquake shockwave rings (radiusScale + opacity)
 * - Rotates hurricane cyclone icons (getAngle)
 */
export function useAnimationLoop() {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;

      const { map, showEarthquakes, earthquakeLayers, showHurricanes, hurricaneLayers } = useMapStore.getState();
      const deckOverlay = map && (map as any)?._deckOverlay;
      if (!deckOverlay) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const hasEq = showEarthquakes && earthquakeLayers.length > 0;
      const hasHc = showHurricanes && hurricaneLayers.length > 0;

      if (!hasEq && !hasHc) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentProps = deckOverlay._props || {};
      const currentLayers: any[] = currentProps.layers || [];
      let changed = false;

      const eqT = (now % EQ_PULSE_DURATION_MS) / EQ_PULSE_DURATION_MS;
      const hcAngle = (now * HC_ROTATION_SPEED) % 360;

      const updatedLayers = currentLayers.map((layer: any) => {
        // Earthquake shockwave rings
        const eqMatch = layer.id?.match(/^earthquake-pulse-ring-(\d)$/);
        if (eqMatch && hasEq) {
          const i = parseInt(eqMatch[1]);
          const phase = (eqT + i / EQ_RING_COUNT) % 1;
          const ringScale = Math.pow(PHI, i * EQ_PHI_EXPONENT) * (1 + phase * EQ_PHASE_SPREAD);
          const fadeIn = Math.min(phase / 0.15, 1);
          const fadeOut = Math.max(0, 1 - phase);
          const ringOpacity = fadeIn * fadeOut * Math.max(0.1, EQ_BASE_OPACITY - i * EQ_OPACITY_DECAY);

          changed = true;
          return layer.clone({
            radiusScale: ringScale,
            opacity: ringOpacity,
          });
        }

        // Hurricane rotating cyclone icon
        if (layer.id === 'hurricane-positions' && hasHc) {
          changed = true;
          return layer.clone({
            getAngle: hcAngle,
          });
        }

        return layer;
      });

      if (changed) {
        deckOverlay.setProps({ layers: updatedLayers });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
