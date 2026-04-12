import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';
import { EQ_PULSE_DURATION_MS, EQ_RING_COUNT, EQ_PHI_EXPONENT, EQ_PHASE_SPREAD, EQ_BASE_OPACITY, EQ_OPACITY_DECAY } from '../layers/EarthquakeLayer';
import { CONFIG } from '../config';

const PHI = 1.618;

// Hurricane: one full rotation in 10 seconds
const HC_ROTATION_SPEED = 360 / 10000; // degrees per ms

// Rain radar animation timing
const RR_HOLD_MS = CONFIG.rainRadar.animationIntervalMs; // hold each frame
const RR_FADE_MS = 150; // crossfade duration between frames
const RR_CYCLE_MS = RR_HOLD_MS + RR_FADE_MS;

/**
 * Drives a requestAnimationFrame loop that:
 * - Animates earthquake shockwave rings (radiusScale + opacity)
 * - Rotates hurricane cyclone icons (getAngle)
 * - Crossfades rain radar animation frames (smooth opacity transitions)
 */
export function useAnimationLoop() {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let running = true;
    let rrCycleStart = 0;
    let rrPrevFrame = -1;

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
      const hasRr = showRainRadar && rainRadarLayers.length > 1;

      if (!hasEq && !hasHc && !hasRr) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentProps = deckOverlay._props || {};
      const currentLayers: any[] = currentProps.layers || [];
      let changed = false;

      const eqT = (now % EQ_PULSE_DURATION_MS) / EQ_PULSE_DURATION_MS;
      const hcAngle = (now * HC_ROTATION_SPEED) % 360;

      // Rain radar: compute crossfade opacities
      let rrOpacities: number[] | null = null;
      if (hasRr) {
        const rrCount = rainRadarLayers.length;
        if (rrCycleStart === 0) rrCycleStart = now;
        const elapsed = now - rrCycleStart;
        const totalCycleMs = RR_CYCLE_MS * rrCount;
        const cyclePos = elapsed % totalCycleMs;
        const rawFrame = cyclePos / RR_CYCLE_MS;
        const currentFrame = Math.floor(rawFrame);
        const frameElapsed = (rawFrame - currentFrame) * RR_CYCLE_MS;

        rrOpacities = new Array(rrCount).fill(0);
        const baseOpacity = CONFIG.rainRadar.opacity;

        if (frameElapsed < RR_HOLD_MS) {
          // Holding: only current frame visible
          rrOpacities[currentFrame] = baseOpacity;
        } else {
          // Crossfading: blend current → next
          const fadeProgress = (frameElapsed - RR_HOLD_MS) / RR_FADE_MS;
          const nextFrame = (currentFrame + 1) % rrCount;
          rrOpacities[currentFrame] = baseOpacity * (1 - fadeProgress);
          rrOpacities[nextFrame] = baseOpacity * fadeProgress;
        }

        // Only update layers when frame changes or during crossfade
        if (currentFrame !== rrPrevFrame || frameElapsed >= RR_HOLD_MS) {
          rrPrevFrame = currentFrame;
        }
      }

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

        // Rain radar crossfade
        const rrMatch = layer.id?.match(/^rain-radar-tiles-(\d+)$/);
        if (rrMatch && rrOpacities) {
          const frameIdx = parseInt(rrMatch[1]);
          const targetOpacity = rrOpacities[frameIdx] ?? 0;
          // Only clone if opacity actually changed
          const currentOpacity = layer.props?.opacity ?? 0;
          if (Math.abs(targetOpacity - currentOpacity) > 0.001) {
            changed = true;
            return layer.clone({ opacity: targetOpacity });
          }
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
