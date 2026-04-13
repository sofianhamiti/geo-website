import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';
import { EQ_PULSE_DURATION_MS, EQ_RING_COUNT, EQ_PHI_EXPONENT, EQ_PHASE_SPREAD, EQ_BASE_OPACITY, EQ_OPACITY_DECAY } from '../layers/EarthquakeLayer';
import { CONFIG } from '../config';
import {
  setRainRadarOpacities,
  getRainRadarFrameCount,
  createRainRadarLayers,
} from '../layers/RainRadarLayer';

const PHI = 1.618;

// Hurricane: one full rotation in 10 seconds
const HC_ROTATION_SPEED = 360 / 10000; // degrees per ms

// Rain radar animation timing
const RR_HOLD_MS = CONFIG.rainRadar.animationIntervalMs;
const RR_FADE_MS = 200;
const RR_CYCLE_MS = RR_HOLD_MS + RR_FADE_MS;

/**
 * Drives a requestAnimationFrame loop that:
 * - Animates earthquake shockwave rings (radiusScale + opacity)
 * - Rotates hurricane cyclone icons (getAngle)
 * - Crossfades rain radar animation frames (opacity via module state + store rebuild)
 */
export function useAnimationLoop() {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let running = true;
    let rrCycleStart = 0;
    let rrLastActiveFrame = -1;
    let rrLastRebuild = 0;

    const animate = () => {
      if (!running) return;

      const { map, showEarthquakes, earthquakeLayers, showHurricanes, hurricaneLayers, showRainRadar, rainRadarLayers } = useMapStore.getState();
      const deckOverlay = map && (map as any)?._deckOverlay;
      if (!deckOverlay) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const hasEq = showEarthquakes && earthquakeLayers.length > 0;
      const hasHc = showHurricanes && hurricaneLayers.length > 0;
      const rrFrameCount = getRainRadarFrameCount();
      const hasRr = showRainRadar && rainRadarLayers.length > 0 && rrFrameCount > 1;

      if (!hasEq && !hasHc && !hasRr) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentProps = deckOverlay._props || {};
      const currentLayers: any[] = currentProps.layers || [];
      let changed = false;

      const eqT = (now % EQ_PULSE_DURATION_MS) / EQ_PULSE_DURATION_MS;
      const hcAngle = (now * HC_ROTATION_SPEED) % 360;

      // Rain radar: compute per-frame opacities and push to module + store
      if (hasRr) {
        if (rrCycleStart === 0) rrCycleStart = now;
        const elapsed = now - rrCycleStart;
        const totalCycleMs = RR_CYCLE_MS * rrFrameCount;
        const cyclePos = elapsed % totalCycleMs;
        const rawFrame = cyclePos / RR_CYCLE_MS;
        const activeFrame = Math.floor(rawFrame);
        const frameElapsed = (rawFrame - activeFrame) * RR_CYCLE_MS;

        const opacities = new Array(rrFrameCount).fill(0);
        const base = CONFIG.rainRadar.opacity;

        if (frameElapsed < RR_HOLD_MS) {
          opacities[activeFrame] = base;
        } else {
          const t = (frameElapsed - RR_HOLD_MS) / RR_FADE_MS;
          const nextFrame = (activeFrame + 1) % rrFrameCount;
          opacities[activeFrame] = base * (1 - t);
          opacities[nextFrame] = base * t;
        }

        // Write opacities to module state
        setRainRadarOpacities(opacities);

        // Rebuild layers on frame change, or at ~15fps during crossfade
        const isFading = frameElapsed >= RR_HOLD_MS;
        const frameChanged = activeFrame !== rrLastActiveFrame;
        const rebuildDue = now - rrLastRebuild > 65; // ~15fps
        if (frameChanged || (isFading && rebuildDue)) {
          rrLastActiveFrame = activeFrame;
          rrLastRebuild = now;
          const newLayers = createRainRadarLayers();
          useMapStore.getState().setRainRadarLayers(newLayers);
        }
      }

      // Earthquake + hurricane animation (top-level layer cloning)
      const updatedLayers = currentLayers.map((layer: any) => {
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
