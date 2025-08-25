import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Radio,
  Users,
  Clock,
  Wifi,
  Package,
  MessageSquare,
  Settings,
  AlertCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  HardDrive,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Square,
  Play,
  Pause,
  Circle
} from 'lucide-react';
import clsx from 'clsx';
import { SimpleStreamControls } from './SimpleStreamControls';
import { useAuthState, isStreamer } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { useStreamSocket } from '@/hooks/useAuthenticatedSocket';

// VDO.Ninja Integration
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { VdoCommandManager } from '@/lib/vdo-ninja/commands';
import { useVdoStreamStore, useVdoStream, useVdoMediaControls, useVdoStats } from '@/stores/vdo-stream-store';
import { MediaControlPanel } from './MediaControlPanel';
import { StatsDashboard } from './stats/StatsDashboard';
import { MiniStatsBar } from './stats/MiniStatsBar';
import { NetworkQualityIndicator } from './stats/NetworkQualityIndicator';
import { StreamStatusIndicator } from './StreamStatusIndicator';

interface StreamerStudioProps {
  onStreamStart: () => void;
  onStreamEnd: () => void;
}

export const StreamerStudio: React.FC<StreamerStudioProps> = ({
  onStreamStart,
  onStreamEnd
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Don't auto-start preview
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'chat' | 'settings' | 'stats'>('products');
  const [showStatsOverlay, setShowStatsOverlay] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  
  // Generate a unique VDO room ID once and use it everywhere
  const [vdoRoomId] = useState(() => {
    // Generate alphanumeric room ID that's VDO.ninja compatible
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `room${timestamp}${random}`.replace(/[^a-zA-Z0-9]/g, '');
  });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const eventManagerRef = useRef<VdoEventManager | null>(null);
  const commandManagerRef = useRef<VdoCommandManager | null>(null);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const navigate = useNavigate();
  const canStream = isStreamer(user);
  
  // Initialize authenticated WebSocket connection
  const { isConnected: isSocketConnected, connectWithAuth } = useStreamSocket();

  // VDO Stream Store
  const { streamState, isStreaming: isVdoStreaming, viewerCount, connectionQuality } = useVdoStream();
  const { 
    isAudioMuted,
    isVideoHidden,
    isScreenSharing,
    volume,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    setVolume
  } = useVdoMediaControls();
  const { currentStats, aggregatedStats, latency, packetLoss } = useVdoStats();
  
  // Store actions
  const {
    initializeStream,
    setManagers,
    startStream: storeStartStream,
    stopStream: storeStopStream,
    pauseStream,
    resumeStream,
    updateStreamInfo,
    setQualityPreset,
    startRecording,
    stopRecording
  } = useVdoStreamStore();

  // Initialize VDO.Ninja managers and connect to store
  useEffect(() => {
    if (iframeRef.current && !eventManagerRef.current) {
      // Create event manager
      eventManagerRef.current = new VdoEventManager();
      eventManagerRef.current.startListening(iframeRef.current);
      
      // Create command manager
      commandManagerRef.current = new VdoCommandManager();
      commandManagerRef.current.setIframe(iframeRef.current);
      
      // Configure event throttling for high-frequency events
      eventManagerRef.current.setThrottle('getStats', { interval: 1000 });
      eventManagerRef.current.setThrottle('audioLevels', { interval: 100 });
      
      // Connect managers to store
      setManagers(eventManagerRef.current, commandManagerRef.current);
    }
    
    return () => {
      if (eventManagerRef.current) {
        eventManagerRef.current.stopListening();
      }
    };
  }, [iframeRef.current, setManagers]);

  // Stream key management (not used with VDO.Ninja)
  const streamKeyData = user?.streamKey ? {
    streamKey: user.streamKey,
    vdoRoomName: `room-${user.email?.replace('@', '-').replace('.', '-')}` // Generate safe room name
  } : null;

  // Enhanced stream start handler - transition from preview to live
  const handleStreamStart = useCallback(async () => {
    // Ensure WebSocket is connected with authentication
    if (!isSocketConnected) {
      const connected = await connectWithAuth();
      if (!connected) {
        console.error('Failed to establish authenticated WebSocket connection');
        // Could show an error toast here
        return;
      }
    }
    
    // Exit preview mode and enter live mode
    setIsPreviewMode(false);
    
    // Initialize stream in store
    initializeStream(vdoRoomId, vdoRoomId, vdoRoomId);
    
    // Update stream info
    updateStreamInfo({
      title: 'Live Stream',
      description: 'Streaming live with VDO.Ninja',
      category: 'General',
      tags: ['live', 'streaming']
    });
    
    setIsStreaming(true);
    onStreamStart();
    
    // Reload iframe with room URL
    if (iframeRef.current) {
      const vdoUrl = `https://vdo.ninja/?room=${vdoRoomId}&push=host&webcam&microphone&quality=2&autostart&bitrate=2500`;
      console.log('Streamer VDO URL:', vdoUrl);
      console.log('Streamer Room ID:', vdoRoomId);
      iframeRef.current.src = vdoUrl;
    }
    
    // Start VDO.Ninja stream through store
    await storeStartStream();
    
    // Log stream start event
    eventManagerRef.current?.emit('custom:streamStarted', {
      streamId: currentStreamId || vdoRoomId,
      timestamp: Date.now(),
      user: user?.email
    });
  }, [vdoRoomId, currentStreamId, onStreamStart, initializeStream, updateStreamInfo, storeStartStream, user, isSocketConnected, connectWithAuth]);

  // Enhanced stream end handler
  const handleStreamEnd = useCallback(async () => {
    setIsStreaming(false);
    onStreamEnd();
    
    // Stop VDO.Ninja stream through store
    await storeStopStream();
    
    // Export stats before ending
    console.log('Stream stats:', {
      aggregated: aggregatedStats,
      current: currentStats
    });
    
    // Log stream end event
    eventManagerRef.current?.emit('custom:streamEnded', {
      streamId: currentStreamId || vdoRoomId,
      timestamp: Date.now(),
      stats: aggregatedStats
    });
  }, [vdoRoomId, currentStreamId, onStreamEnd, storeStopStream, aggregatedStats, currentStats]);

  // Handle authentication and authorization
  useEffect(() => {
    // Only redirect if we're definitely not authenticated and loading is complete
    if (authLoading === false && isAuthenticated === false) {
      console.log('User not authenticated, redirecting to auth page');
      // Use replace to avoid the "leave site" warning
      navigate('/auth', { replace: true });
    } else if (authLoading === false && isAuthenticated === true && !canStream) {
      console.log('User is not authorized to stream');
    }
  }, [authLoading, isAuthenticated, canStream, navigate]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user can't stream
  if (!canStream) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Streaming Access Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need streamer permissions to access this feature.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Contact an administrator to upgrade your account.
          </p>
        </div>
      </div>
    );
  }

  // Format duration for display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full p-2 lg:p-4 overflow-y-auto">
      <div className="grid grid-cols-12 gap-2 lg:gap-4 lg:h-full">
        {/* Main Video Area */}
        <div className="col-span-12 lg:col-span-8 lg:h-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg lg:h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      VDO.ninja Streaming Interface
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isPreviewMode && !isStreaming ? 'Preview Mode - Adjust your settings before going live' : 
                       isStreaming ? 'Live Streaming' : 'Professional streaming with real-time analytics'}
                    </p>
                  </div>
                  {/* Connection Status */}
                  <NetworkQualityIndicator
                    quality={connectionQuality || 'offline'}
                    score={0}
                    latency={latency}
                    packetLoss={packetLoss}
                    showBars={true}
                    showLabel={false}
                    size="sm"
                    layout="compact"
                  />
                </div>
                
                {/* Stream Status Indicator */}
                <StreamStatusIndicator
                  streamId={currentStreamId || undefined}
                  showViewerCount={true}
                  showDuration={true}
                  showRecordingStatus={true}
                  layout="horizontal"
                  size="sm"
                  variant="glass"
                />
              </div>
            </div>
            
            <div className="flex-1 min-h-[400px] max-h-[600px] flex items-center justify-center bg-black">
              <div className="relative w-full h-full flex items-center justify-center">
                  {isStreaming || isPreviewMode ? (
                    <>
                      <iframe
                        ref={iframeRef}
                        src={
                          isPreviewMode 
                            ? `https://vdo.ninja/?push&webcam&microphone&quality=2&autostart&bitrate=2500&fullscreen&noroom&scale=100&cover&noborder&noheader` // Preview mode - no room
                            : `https://vdo.ninja/?room=${vdoRoomId}&push=host&webcam&microphone&quality=2&autostart&bitrate=2500&scale=100&cover&noborder&noheader` // Live mode - with room
                        }
                        className="w-full h-full"
                        allow="camera; microphone; autoplay; display-capture"
                        style={{ border: 'none', backgroundColor: '#000' }}
                      />
                  
                  {/* Enhanced Stats Overlay */}
                  {showStatsOverlay && isVdoStreaming && (
                    <div className="absolute top-4 left-4 right-4">
                      <MiniStatsBar
                        stats={{
                          fps: currentStats?.fps || 0,
                          bitrate: currentStats?.bitrate || 0,
                          latency: latency || 0,
                          packetLoss: packetLoss || 0,
                          viewers: viewerCount || 0,
                          duration: 0
                        }}
                        layout="horizontal"
                        showTrends={true}
                        variant="glass"
                        size="sm"
                      />
                    </div>
                  )}
                  
                  {/* Media Controls Overlay */}
                  {showAdvancedControls && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <MediaControlPanel
                        streamId={currentStreamId || undefined}
                        showAdvancedControls={false}
                        showDeviceSelection={false}
                        layout="horizontal"
                        size="md"
                      />
                    </div>
                  )}
                  
                  {/* Quality Issues Alert */}
                  {connectionQuality === 'poor' || connectionQuality === 'critical' ? (
                    <div className="absolute top-20 left-4 bg-yellow-900/90 text-yellow-200 px-3 py-2 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Poor connection quality</span>
                      </div>
                    </div>
                  ) : null}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-900/50">
                      <div className="text-center max-w-md">
                        <Video className="w-20 h-20 mb-4 text-gray-400 mx-auto" />
                        <h3 className="text-2xl font-semibold mb-2">Ready to Set Up Your Stream?</h3>
                        <p className="text-gray-400 mb-8">Click below to enable your camera and microphone for preview. You can adjust settings before going live.</p>
                        <button
                          onClick={() => setIsPreviewMode(true)}
                          className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
                        >
                          <Video className="w-6 h-6" />
                          Enable Camera Preview
                        </button>
                        <p className="text-xs text-gray-500 mt-4">
                          Your camera won't be live until you click "Go Live"
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
            
            {/* Bottom Control Bar */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Show Stop Preview button in preview mode */}
                  {isPreviewMode && !isStreaming && (
                    <button
                      onClick={() => {
                        setIsPreviewMode(false);
                        // Clear iframe src to stop camera
                        if (iframeRef.current) {
                          iframeRef.current.src = 'about:blank';
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <VideoOff className="w-4 h-4" />
                      Stop Preview
                    </button>
                  )}
                  
                  {/* Quick Media Controls */}
                  <button
                    onClick={toggleAudio}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      isAudioMuted 
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={toggleVideo}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      isVideoHidden 
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {isVideoHidden ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={toggleScreenShare}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      isScreenSharing 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <MonitorUp className="w-4 h-4" />
                  </button>
                  
                  {isVdoStreaming && (
                    <button
                      onClick={() => streamState === 'paused' ? resumeStream() : pauseStream()}
                      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {streamState === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}
                  
                  {false && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm">
                      <Circle className="w-3 h-3 fill-current animate-pulse" />
                      <span>REC</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStatsOverlay(!showStatsOverlay)}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      showStatsOverlay 
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                    title="Toggle stats overlay"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      showAdvancedControls 
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                    title="Toggle advanced controls"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls Sidebar */}
        <div className="col-span-12 lg:col-span-4 lg:h-full flex flex-col gap-4">
          {/* Stream Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6">
              <SimpleStreamControls
                vdoRoomId={vdoRoomId}  // Use the locally generated vdoRoomId
                isStreaming={isStreaming}
                currentStreamId={currentStreamId || undefined}
                onStreamStart={handleStreamStart}
                onStreamEnd={handleStreamEnd}
                onStreamCreated={(streamId, actualVdoRoomId) => {
                  setCurrentStreamId(streamId);
                  // If we got an actual room ID from the backend, update the iframe
                  if (actualVdoRoomId && iframeRef.current) {
                    const newUrl = `https://vdo.ninja/?room=${actualVdoRoomId}&push=host&webcam&microphone&quality=2&autostart&bitrate=2500`;
                    console.log('Updating streamer to use actual room ID:', actualVdoRoomId);
                    console.log('New streamer URL:', newUrl);
                    iframeRef.current.src = newUrl;
                  }
                }}
                isPreviewMode={isPreviewMode}
              />
            </div>
          </div>

          {/* Enhanced Stream Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Live Statistics</h3>
            <div className="space-y-3">
              {/* Viewers */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Viewers</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {viewerCount || 0}
                  </span>
                </div>
              </div>
              
              {/* Duration */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Duration</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatDuration(0)}
                  </span>
                </div>
              </div>
              
              {/* FPS */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">FPS</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currentStats?.fps || 0}
                  </span>
                </div>
              </div>
              
              {/* Bitrate */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Bitrate</span>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round((currentStats?.bitrate || 0) / 1000)} kbps
                  </span>
                </div>
              </div>
              
              {/* Latency */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Latency</span>
                <span className={clsx(
                  "font-semibold",
                  latency < 50 ? "text-green-600" :
                  latency < 150 ? "text-yellow-600" : "text-red-600"
                )}>
                  {latency || 0} ms
                </span>
              </div>
              
              {/* Packet Loss */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Packet Loss</span>
                <span className={clsx(
                  "font-semibold",
                  packetLoss < 1 ? "text-green-600" :
                  packetLoss < 5 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(packetLoss || 0).toFixed(1)}%
                </span>
              </div>
              
              {/* Data Usage */}
              {currentStats?.bytesSent && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Data Sent</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(currentStats.bytesSent / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Tabs with Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('products')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'products' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <Package className="w-4 h-4" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'chat' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'stats' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <Activity className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'settings' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'products' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Product management panel coming soon
                </div>
              )}
              
              {activeTab === 'chat' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chat moderation tools coming soon</p>
                  <p className="text-sm mt-2">
                    {viewerCount > 0 ? `${viewerCount} viewers connected` : 'No viewers yet'}
                  </p>
                </div>
              )}
              
              {activeTab === 'stats' && (
                <div>
                  <StatsDashboard
                    stats={currentStats}
                    history={[]}
                    aggregatedStats={aggregatedStats}
                    qualityMetrics={null}
                    layout="grid"
                    showHeader={false}
                    showExport={true}
                    size="sm"
                    onExport={(format) => {
                      console.log('Export format:', format);
                      console.log('Current stats:', currentStats);
                      console.log('Aggregated stats:', aggregatedStats);
                    }}
                  />
                </div>
              )}
              
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Stream Quality</h4>
                    <select
                      value={'medium'}
                      onChange={(e) => setQualityPreset(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <option value="low">Low (480p)</option>
                      <option value="medium">Medium (720p)</option>
                      <option value="high">High (1080p)</option>
                      <option value="ultra">Ultra (4K)</option>
                    </select>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Volume</h4>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      {volume}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};