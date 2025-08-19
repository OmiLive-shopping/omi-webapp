import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Users,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  Settings,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Share2,
  MessageSquare,
  Heart,
  PictureInPicture,
  Info,
  Radio,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// VDO.Ninja Integration
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { useStreamState } from '@/hooks/useStreamState';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';

// Components
import ViewerCount from './ViewerCount';
import { NetworkQualityIndicator } from './stats/NetworkQualityIndicator';
import { MiniStatsBar } from './stats/MiniStatsBar';
import { StreamStatusIndicator } from './StreamStatusIndicator';

// Socket.IO
import { useSocket } from '@/hooks/useSocket';

interface ViewerPlayerProps {
  streamId: string;
  viewerCount: number;
  isLive: boolean;
  streamTitle?: string;
  streamerName?: string;
  
  // Display options
  showStats?: boolean;
  showChat?: boolean;
  autoplay?: boolean;
  
  // Callbacks
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export const ViewerPlayer: React.FC<ViewerPlayerProps> = ({
  streamId,
  viewerCount: initialViewerCount,
  isLive: initialIsLive,
  streamTitle = 'Untitled Stream',
  streamerName = 'Anonymous',
  showStats = true,
  showChat = false,
  autoplay = true,
  onStreamEnd,
  onError
}) => {
  // State
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState(false);
  const [quality, setQuality] = useState<'auto' | '360p' | '480p' | '720p' | '1080p'>('auto');
  const [isLiked, setIsLiked] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const eventManagerRef = useRef<VdoEventManager | null>(null);
  
  // Socket.IO
  const { socket, isConnected } = useSocket();

  // Fetch viewer URL from backend
  const { data: viewerData, isLoading: loadingUrl, refetch: refetchUrl } = useQuery({
    queryKey: ['viewer-url', streamId],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/streams/${streamId}/viewer-url`);
      return response.data;
    },
    enabled: !!streamId && initialIsLive,
  });
  
  // Initialize VDO.Ninja event manager
  useEffect(() => {
    if (iframeRef.current && !eventManagerRef.current) {
      eventManagerRef.current = new VdoEventManager();
      eventManagerRef.current.startListening(iframeRef.current);
      
      // Configure throttling for high-frequency events
      eventManagerRef.current.configureThrottle('getStats', { interval: 2000 });
      eventManagerRef.current.configureThrottle('audioLevels', { interval: 100 });
      
      // Listen for stream events
      eventManagerRef.current.on('streamEnded', () => {
        onStreamEnd?.();
      });
      
      eventManagerRef.current.on('error', (event) => {
        handleError(new Error(event.data?.message || 'Stream error'));
      });
      
      eventManagerRef.current.on('connected', () => {
        setIsLoading(false);
        setIsReconnecting(false);
        setReconnectAttempts(0);
      });
      
      eventManagerRef.current.on('disconnected', () => {
        handleReconnect();
      });
      
      eventManagerRef.current.on('viewerJoined', (event) => {
        console.log('Viewer joined:', event.data);
      });
      
      eventManagerRef.current.on('viewerLeft', (event) => {
        console.log('Viewer left:', event.data);
      });
    }
    
    return () => {
      if (eventManagerRef.current) {
        eventManagerRef.current.stopListening();
        eventManagerRef.current = null;
      }
    };
  }, [iframeRef.current]);
  
  // VDO.Ninja hooks
  const {
    state: streamState,
    isConnected: isStreamConnected,
    connectionHealth,
    streamDuration
  } = useStreamState({
    eventManager: eventManagerRef.current || undefined
  });
  
  const {
    stats,
    trends,
    qualityMetrics,
    networkHealth
  } = useRealTimeStats({
    eventManager: eventManagerRef.current || undefined,
    refreshInterval: 2000,
    enableHistory: false,
    isViewer: true
  });
  
  // Socket.IO viewer tracking
  useEffect(() => {
    if (socket && isConnected && streamId) {
      // Join stream room
      socket.emit('stream:join', { streamId });
      
      // Listen for stream events
      socket.on('stream:ended', () => {
        onStreamEnd?.();
      });
      
      socket.on('stream:updated', (data) => {
        console.log('Stream updated:', data);
      });
      
      socket.on('stream:product:featured', (data) => {
        console.log('Featured product:', data);
      });
      
      // Send viewer events to VDO.Ninja handler
      if (eventManagerRef.current) {
        socket.emit('vdo:viewer:event', {
          streamId,
          action: 'joined',
          viewer: {
            id: socket.id,
            connectionQuality: connectionHealth?.quality
          },
          timestamp: new Date().toISOString()
        });
      }
      
      return () => {
        socket.emit('stream:leave', { streamId });
        
        if (eventManagerRef.current) {
          socket.emit('vdo:viewer:event', {
            streamId,
            action: 'left',
            viewer: {
              id: socket.id
            },
            timestamp: new Date().toISOString()
          });
        }
        
        socket.off('stream:ended');
        socket.off('stream:updated');
        socket.off('stream:product:featured');
      };
    }
  }, [socket, isConnected, streamId]);
  
  // Update connection quality based on network health
  useEffect(() => {
    if (connectionHealth?.quality) {
      setConnectionQuality(connectionHealth.quality as ConnectionQuality);
    }
  }, [connectionHealth]);
  
  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSettings && !showInfo) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', () => setShowControls(true));
      container.addEventListener('mouseleave', () => {
        if (!showSettings && !showInfo) {
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
  }, [showSettings, showInfo]);

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        setIsLoading(false);
        setIsReconnecting(false);
      };
    }
  }, [streamId]);

  // Error handling
  const handleError = (error: Error) => {
    console.error('ViewerPlayer error:', error);
    onError?.(error);
  };
  
  // Reconnect logic
  const handleReconnect = () => {
    if (reconnectAttempts < 5) {
      setIsReconnecting(true);
      setReconnectAttempts(prev => prev + 1);
      setTimeout(() => {
        refetchUrl();
      }, Math.min(1000 * Math.pow(2, reconnectAttempts), 10000));
    } else {
      handleError(new Error('Failed to connect to stream'));
    }
  };

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
        setIsPiPActive(true);
        console.log('Picture-in-Picture requested');
      } else {
        setIsPiPActive(false);
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: streamTitle,
        text: `Watch ${streamerName}'s stream`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };
  
  const handleQualityChange = (newQuality: typeof quality) => {
    setQuality(newQuality);
    if (iframeRef.current && viewerData) {
      refetchUrl();
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
  
  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if stream is actually live
  const isLive = initialIsLive || streamState.isStreaming;

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
        {isLive ? (
          <iframe
            ref={iframeRef}
            src={`https://vdo.ninja/?room=${streamId}&view=${streamId}&autostart`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            style={{ border: 'none' }}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-white text-xl mb-2">Stream Offline</p>
              <p className="text-gray-400">The stream is not currently live</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
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
            {reconnectAttempts > 0 && (
              <p className="text-gray-500 text-sm mt-2">
                Attempt {reconnectAttempts}/5
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Stats Overlay */}
      {showStats && showStatsOverlay && streamState.isStreaming && (
        <div className="absolute top-20 left-4 right-4 pointer-events-none">
          <MiniStatsBar
            stats={{
              fps: stats?.fps || 0,
              bitrate: stats?.bitrate || 0,
              latency: stats?.latency || 0,
              packetLoss: stats?.packetLoss || 0,
              viewers: streamState.viewerCount || initialViewerCount
            }}
            layout="horizontal"
            variant="glass"
            size="sm"
            showTrends={false}
          />
        </div>
      )}
      
      {/* Quality Issues Alert */}
      {qualityMetrics?.issues && qualityMetrics.issues.length > 0 && (
        <div className="absolute top-20 right-4 bg-yellow-900/90 text-yellow-200 px-3 py-2 rounded-lg text-sm pointer-events-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Poor connection quality</span>
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
            <ViewerCount
              count={streamState.viewerCount || initialViewerCount}
              variant="compact"
              showTrend={true}
              showAnimation={true}
              className="bg-black/50 text-white"
            />
            <NetworkQualityIndicator
              quality={connectionHealth?.quality || 'offline'}
              score={connectionHealth?.score}
              latency={stats?.latency}
              packetLoss={stats?.packetLoss}
              showBars={true}
              showLabel={false}
              size="sm"
              layout="compact"
            />
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                isLiked 
                  ? "bg-red-600 text-white" 
                  : "bg-black/50 hover:bg-black/70 text-white"
              )}
            >
              <Heart className={clsx("w-5 h-5", isLiked && "fill-current")} />
            </button>
            
            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            {/* Chat Toggle */}
            {showChat && (
              <button
                className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
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
              
              {/* Duration */}
              <span className="text-white text-sm">
                {formatDuration(streamDuration || 0)}
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Stats Toggle */}
                <button
                  onClick={() => setShowStatsOverlay(!showStatsOverlay)}
                  className={clsx(
                    "p-2 rounded transition-colors",
                    showStatsOverlay 
                      ? "bg-primary-600 text-white" 
                      : "text-white hover:text-gray-200"
                  )}
                  title="Toggle Stats"
                >
                  <Activity className="w-5 h-5" />
                </button>
                
                {/* Info */}
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                  title="Stream Info"
                >
                  <Info className="w-5 h-5" />
                </button>
                
                {/* Picture in Picture */}
                <button
                  onClick={togglePictureInPicture}
                  className={clsx(
                    "p-2 rounded transition-colors",
                    isPiPActive 
                      ? "bg-primary-600 text-white" 
                      : "text-white hover:text-gray-200"
                  )}
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
      
      {/* Stream Info Panel */}
      {showInfo && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/90 rounded-lg p-4 min-w-[300px]">
          <h4 className="text-white font-semibold mb-3">Stream Information</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Quality:</span>
              <span className="text-white">{quality}</span>
            </div>
            <div className="flex justify-between">
              <span>Bitrate:</span>
              <span className="text-white">{Math.round((stats?.bitrate || 0) / 1000)} kbps</span>
            </div>
            <div className="flex justify-between">
              <span>FPS:</span>
              <span className="text-white">{stats?.fps || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="text-white">{stats?.latency || 0} ms</span>
            </div>
            <div className="flex justify-between">
              <span>Packet Loss:</span>
              <span className="text-white">{(stats?.packetLoss || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Viewers:</span>
              <span className="text-white">{streamState.viewerCount || initialViewerCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute bottom-24 right-4 bg-gray-900 text-white rounded-lg p-4 shadow-xl min-w-[200px]">
          <h3 className="font-semibold mb-3">Stream Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Quality</label>
              <select 
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value as typeof quality)}
                className="w-full bg-gray-800 rounded px-3 py-2 text-sm"
              >
                <option value="auto">Auto</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span>Connection</span>
                <span className="capitalize flex items-center gap-2">
                  {getQualityIcon()}
                  {connectionQuality}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};