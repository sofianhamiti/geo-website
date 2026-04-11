/**
 * ISS Video Overlay Component
 * Shows YouTube livestream of ISS when ISS icon is clicked
 * Tabs to switch between HD Views and Live Video streams
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { CONFIG } from '../config';

const streams = CONFIG.styles.iss.streams;

const ISSVideoOverlay: React.FC = () => {
  const { issVideoVisible, hideISSVideo, map, issManager } = useMapStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [activeStream, setActiveStream] = useState(0);
  const [videoPosition, setVideoPosition] = useState<{left: number, top: number} | null>(null);

  // Reset loading state when video overlay opens
  useEffect(() => {
    if (issVideoVisible) {
      setIsVideoLoaded(false);
      setActiveStream(0);
      const timeout = setTimeout(() => {
        setIsVideoLoaded(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [issVideoVisible]);

  // Reset loading state when switching streams
  const handleStreamSwitch = (index: number) => {
    if (index === activeStream) return;
    setIsVideoLoaded(false);
    setActiveStream(index);
    setTimeout(() => setIsVideoLoaded(true), 3000);
  };

  // Track ISS position and update video window position
  useEffect(() => {
    if (!issVideoVisible || !map || !issManager) {
      return;
    }

    const updateVideoPosition = () => {
      try {
        const issData = issManager.getData();
        if (issData?.currentPosition) {
          const { latitude, longitude } = issData.currentPosition;

          const screenCoords = map.project([longitude, latitude]);

          const videoWidth = 320;
          const videoHeight = 200;

          let left = screenCoords.x - videoWidth / 2;
          let top = screenCoords.y - videoHeight / 2;

          const padding = 10;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          left = Math.max(padding, Math.min(left, viewportWidth - videoWidth - padding));
          top = Math.max(padding, Math.min(top, viewportHeight - videoHeight - padding));

          setVideoPosition({ left, top });
        }
      } catch (error) {
        // Silent error handling for video position updates
      }
    };

    updateVideoPosition();

    const handleMapMove = () => {
      updateVideoPosition();
    };

    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    const interval = setInterval(updateVideoPosition, 1000);

    return () => {
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
      map.off('moveend', handleMapMove);
      map.off('zoomend', handleMapMove);
      clearInterval(interval);
    };
  }, [issVideoVisible, map, issManager]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && issVideoVisible) {
        hideISSVideo();
      }
    };

    if (issVideoVisible) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [issVideoVisible, hideISSVideo]);

  const handleIframeLoad = () => {
    setIsVideoLoaded(true);
  };

  if (!issVideoVisible || !videoPosition) {
    return null;
  }

  const currentStream = streams[activeStream] ?? streams[0];

  return (
    <div
      ref={overlayRef}
      className="fixed border border-yellow-400/30 rounded overflow-hidden shadow-2xl z-50"
      style={{
        left: `${videoPosition.left}px`,
        top: `${videoPosition.top}px`,
        width: '320px',
        height: '200px',
        pointerEvents: 'all',
      }}
    >
      {/* Header with tabs and close button */}
      <div className="bg-black/80 backdrop-blur-sm px-1.5 py-1 flex items-center justify-between border-b border-yellow-400/20">
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 text-xs mr-1">{'\u{1F6F0}\uFE0F'}</span>
          {streams.map((stream, i) => (
            <button
              key={stream.id}
              onClick={() => handleStreamSwitch(i)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                i === activeStream
                  ? 'bg-yellow-400/20 text-yellow-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {stream.label}
            </button>
          ))}
        </div>
        <button
          onClick={hideISSVideo}
          className="text-gray-400 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-700/50"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Video area */}
      <div className="relative bg-black" style={{ height: '180px' }}>
        <iframe
          key={currentStream.id}
          src={`https://www.youtube.com/embed/${currentStream.id}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title={`ISS ${currentStream.label}`}
          className="w-full h-full"
          onLoad={handleIframeLoad}
        />

        {/* Loading indicator overlay */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-black flex items-center justify-center text-yellow-400">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent"></div>
              <span className="text-xs">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ISSVideoOverlay;
