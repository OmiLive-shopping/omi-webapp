import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Volume1, 
  Maximize, 
  Minimize, 
  Settings, 
  Radio, 
  Users, 
  WifiOff,
  PictureInPicture,
  Loader,
  AlertCircle,
  Wifi
} from 'lucide-react';
import clsx from 'clsx';

interface ViewerPlayerProps {
  streamKey: string;
  viewerCount: number;
  isLive: boolean;
  streamTitle?: string;
  streamerName?: string;
}

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export const ViewerPlayer: React.FC<ViewerPlayerProps> = ({
  streamKey,
  viewerCount,
  isLive,
  streamTitle = 'Untitled Stream',
  streamerName = 'Anonymous'
}) => {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSettings) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', () => setShowControls(true));
      container.addEventListener('mouseleave', () => {
        if (!showSettings) {
          setShowControls(false);
        }
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showSettings]);

  // Simulate connection quality monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const qualities: ConnectionQuality[] = ['excellent', 'good', 'fair', 'poor'];
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
      setConnectionQuality(randomQuality);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        setIsLoading(false);
        setIsReconnecting(false);
      };
    }
  }, [streamKey]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePictureInPicture = async () => {
    try {
      if (!isPiPActive && iframeRef.current) {
        // Note: PiP for iframes is limited in browsers
        // This is a placeholder for when browsers support it better
        setIsPiPActive(true);
        console.log('Picture-in-Picture requested');
      } else {
        setIsPiPActive(false);
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 50) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'fair':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-600" />;
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!isLive && !isReconnecting) {
    return (
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Stream Offline</h3>
          <p className="text-gray-400">The streamer is currently offline</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden group"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Video Player */}
      <div className="relative w-full h-full">
        <iframe
          ref={iframeRef}
          src={`https://vdo.ninja/?view=${streamKey}&scene&autostart&controls=0`}
          className="w-full h-full"
          allow="autoplay; camera; microphone; fullscreen; picture-in-picture"
          style={{ border: 'none' }}
        />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white">Connecting to stream...</p>
          </div>
        </div>
      )}

      {/* Reconnecting Overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-white text-lg mb-2">Connection Lost</p>
            <p className="text-gray-400">Attempting to reconnect...</p>
          </div>
        </div>
      )}

      {/* Top Overlay - Stream Info */}
      <div className={clsx(
        'absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300',
        showControls ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                <Radio className="w-3 h-3" />
                LIVE
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs rounded">
              <Users className="w-3 h-3" />
              {formatViewerCount(viewerCount)} viewers
            </span>
            {getQualityIcon()}
          </div>
        </div>
        
        <div className="mt-2">
          <h2 className="text-white text-lg font-semibold">{streamTitle}</h2>
          <p className="text-gray-300 text-sm">{streamerName}</p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={clsx(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300',
        showControls ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="p-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-4">
              {/* Volume Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-200 transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {getVolumeIcon()}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #fff ${isMuted ? 0 : volume}%, #4b5563 ${isMuted ? 0 : volume}%)`
                  }}
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Picture in Picture */}
                <button
                  onClick={togglePictureInPicture}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                  title="Picture in Picture"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-gray-900 text-white rounded-lg p-4 shadow-xl">
          <h3 className="font-semibold mb-3">Stream Settings</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm">Quality</span>
              <select className="bg-gray-800 rounded px-2 py-1 text-sm">
                <option>Auto</option>
                <option>1080p</option>
                <option>720p</option>
                <option>480p</option>
                <option>360p</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm">Connection</span>
              <span className="text-sm capitalize">{connectionQuality}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};