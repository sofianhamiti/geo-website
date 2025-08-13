/**
 * ISS Video Overlay Component
 * Shows YouTube livestream of ISS when ISS icon is clicked
 * Click outside to close, smart positioning to stay in viewport
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../store/mapStore';

interface ISSVideoOverlayProps {}

const ISSVideoOverlay: React.FC<ISSVideoOverlayProps> = () => {
  const { issVideoVisible, hideISSVideo, map, issManager } = useMapStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoPosition, setVideoPosition] = useState<{left: number, top: number} | null>(null);

  // Reset loading state when video overlay opens
  useEffect(() => {
    if (issVideoVisible) {
      setIsVideoLoaded(false);
      // Auto-hide loading after a reasonable timeout even if onLoad doesn't fire
      const timeout = setTimeout(() => {
        setIsVideoLoaded(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [issVideoVisible]);

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
          
          // Convert ISS lat/lng to screen coordinates
          const deckOverlay = (map as any)._deckOverlay;
          if (deckOverlay) {
            // Use MapLibre's project method to get screen coordinates
            const screenCoords = map.project([longitude, latitude]);
            
            // Center video directly on ISS icon position (16:9 aspect ratio)
            const videoWidth = 320;
            const videoHeight = 180;
            
            let left = screenCoords.x - videoWidth / 2; // Center horizontally on ISS
            let top = screenCoords.y - videoHeight / 2; // Center vertically on ISS
            
            // Keep video in viewport with minimal adjustment
            const padding = 10;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            if (left < padding) {
              left = padding;
            } else if (left + videoWidth > viewportWidth - padding) {
              left = viewportWidth - videoWidth - padding;
            }
            
            if (top < padding) {
              top = padding;
            } else if (top + videoHeight > viewportHeight - padding) {
              top = viewportHeight - videoHeight - padding;
            }
            
            setVideoPosition({ left, top });
          }
        }
      } catch (error) {
        console.log('Could not update video position:', error);
      }
    };

    // Initial position
    updateVideoPosition();

    // Update position immediately on map movement (pan/zoom)
    const handleMapMove = () => {
      updateVideoPosition();
    };

    // Add map event listeners for immediate updates
    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    // Update position periodically as ISS moves in orbit
    const interval = setInterval(updateVideoPosition, 1000); // Update every second for orbital movement
    
    return () => {
      // Clean up event listeners and interval
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

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log('🛰️ ISS video iframe loaded');
    setIsVideoLoaded(true);
  };

  if (!issVideoVisible || !videoPosition) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className="fixed border border-yellow-400/30 rounded overflow-hidden shadow-2xl z-50"
      style={{
        left: `${videoPosition.left}px`,
        top: `${videoPosition.top}px`,
        width: '320px',
        height: '200px', // Slightly taller to accommodate thin header
        pointerEvents: 'all',
      }}
    >
      {/* Minimal sleek header */}
      <div className="bg-black/80 backdrop-blur-sm px-2 py-1 flex items-center justify-between border-b border-yellow-400/20">
        <span className="text-yellow-400 text-xs font-medium">🛰️ ISS Live</span>
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
          src="https://www.youtube.com/embed/H999s0P1Er0?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0"
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title="ISS Live Stream"
          className="w-full h-full"
          onLoad={handleIframeLoad}
        />
        
        {/* Loading indicator overlay (only shown while loading) */}
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
