import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';

const PULSE_DURATION_MS = 5000;
const RING_COUNT = 5;
const PHI = 1.618;
const RING_LINE_WIDTHS = [2.5, 2.0, 1.5, 1.2, 1.0];

/**
 * Drives a requestAnimationFrame loop that updates earthquake shockwave rings.
 * Only updates uniform props (radiusScale, opacity, getLineWidth) — no per-point
 * accessor re-evaluation, so it stays fast at 60fps with many earthquakes.
 */
export function useAnimationLoop() {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;

      const { map, showEarthquakes, earthquakeLayers } = useMapStore.getState();
      const deckOverlay = map && (map as any)?._deckOverlay;

      if (deckOverlay && showEarthquakes && earthquakeLayers.length > 0) {
        const t = (performance.now() % PULSE_DURATION_MS) / PULSE_DURATION_MS;

        const currentProps = deckOverlay._props || {};
        const currentLayers: any[] = currentProps.layers || [];
        let changed = false;

        const updatedLayers = currentLayers.map((layer: any) => {
          const match = layer.id?.match(/^earthquake-pulse-ring-(\d)$/);
          if (!match) return layer;

          const i = parseInt(match[1]);
          const phase = (t + i / RING_COUNT) % 1;
          const ringScale = Math.pow(PHI, i * 0.4) * (1 + phase * 0.8);
          // Fade in over first 15% of cycle, then fade out over the rest
          const fadeIn = Math.min(phase / 0.15, 1);
          const fadeOut = Math.max(0, 1 - phase);
          const ringOpacity = fadeIn * fadeOut * Math.max(0.1, 0.5 - i * 0.08);

          changed = true;
          return layer.clone({
            radiusScale: ringScale,
            opacity: ringOpacity,
            getLineWidth: RING_LINE_WIDTHS[i] || 0.5,
          });
        });

        if (changed) {
          deckOverlay.setProps({ layers: updatedLayers });
        }
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
