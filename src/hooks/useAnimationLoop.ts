import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';

const EQ_PULSE_DURATION_MS = 5000;
const PHI = 1.618;

// Earthquake: 5 shockwave rings
const EQ_RING_COUNT = 5;
const EQ_LINE_WIDTHS = [2.5, 2.0, 1.5, 1.2, 1.0];

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
          const ringScale = Math.pow(PHI, i * 0.4) * (1 + phase * 0.8);
          const fadeIn = Math.min(phase / 0.15, 1);
          const fadeOut = Math.max(0, 1 - phase);
          const ringOpacity = fadeIn * fadeOut * Math.max(0.1, 0.5 - i * 0.08);

          changed = true;
          return layer.clone({
            radiusScale: ringScale,
            opacity: ringOpacity,
            getLineWidth: EQ_LINE_WIDTHS[i] || 1.0,
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
