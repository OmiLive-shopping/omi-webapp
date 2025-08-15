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

// VDO.Ninja Integration
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { VdoCommandManager } from '@/lib/vdo-ninja/commands';
import { useStreamState } from '@/hooks/useStreamState';
import { useMediaControls } from '@/hooks/useMediaControls';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
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
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'chat' | 'settings' | 'stats'>('products');
  const [showStatsOverlay, setShowStatsOverlay] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const eventManagerRef = useRef<VdoEventManager | null>(null);
  const commandManagerRef = useRef<VdoCommandManager | null>(null);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const navigate = useNavigate();
  const canStream = isStreamer(user);

  // Initialize VDO.Ninja managers
  useEffect(() => {
    if (iframeRef.current && !eventManagerRef.current) {
      // Create event manager
      eventManagerRef.current = new VdoEventManager();
      eventManagerRef.current.startListening(iframeRef.current);
      
      // Create command manager
      commandManagerRef.current = new VdoCommandManager();
      commandManagerRef.current.setIframe(iframeRef.current);
      
      // Configure event throttling for high-frequency events
      eventManagerRef.current.configureThrottle('getStats', { interval: 1000 });
      eventManagerRef.current.configureThrottle('audioLevels', { interval: 100 });
    }
    
    return () => {
      if (eventManagerRef.current) {
        eventManagerRef.current.stopListening();
      }
    };
  }, [iframeRef.current]);

  // VDO.Ninja hooks
  const { 
    state: streamState, 
    startStream: vdoStartStream,
    stopStream: vdoStopStream,
    togglePause,
    isConnected,
    connectionHealth,
    streamDuration,
    metrics
  } = useStreamState({ 
    streamId: currentStreamId || undefined,
    eventManager: eventManagerRef.current || undefined
  });

  const {
    devices,
    permissions,
    controls,
    actions: mediaActions,
    commandQueue
  } = useMediaControls({
    streamId: currentStreamId || undefined,
    commandManager: commandManagerRef.current || undefined
  });

  const {
    stats,
    history,
    trends,
    aggregatedStats,
    qualityMetrics,
    networkHealth,
    actions: statsActions
  } = useRealTimeStats({
    eventManager: eventManagerRef.current || undefined,
    refreshInterval: 1000,
    enableHistory: true,
    historyLimit: 300, // 5 minutes at 1s intervals
    aggregateWindows: [60, 300] // 1min, 5min
  });

  // Stream key management
  const streamKeyData = user?.streamKey ? {
    streamKey: user.streamKey,
    vdoRoomName: `room-${user.email?.replace('@', '-').replace('.', '-')}` // Generate safe room name
  } : null;

  // Enhanced stream start handler
  const handleStreamStart = useCallback(async () => {
    setIsStreaming(true);
    onStreamStart();
    
    // Start VDO.Ninja stream
    if (vdoStartStream) {
      await vdoStartStream();
    }
    
    // Log stream start event
    eventManagerRef.current?.emit('custom:streamStarted', {
      streamId: currentStreamId,
      timestamp: Date.now(),
      user: user?.email
    });
  }, [currentStreamId, onStreamStart, vdoStartStream, user]);

  // Enhanced stream end handler
  const handleStreamEnd = useCallback(async () => {
    setIsStreaming(false);
    onStreamEnd();
    
    // Stop VDO.Ninja stream
    if (vdoStopStream) {
      await vdoStopStream();
    }
    
    // Export stats before ending
    if (statsActions) {
      const exportData = statsActions.exportStats('json');
      console.log('Stream stats:', exportData);
    }
    
    // Log stream end event
    eventManagerRef.current?.emit('custom:streamEnded', {
      streamId: currentStreamId,
      timestamp: Date.now(),
      duration: streamDuration,
      stats: aggregatedStats
    });
  }, [currentStreamId, onStreamEnd, vdoStopStream, streamDuration, aggregatedStats, statsActions]);

  // Handle authentication and authorization
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    } else if (!authLoading && isAuthenticated && !canStream) {
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
    <div className="h-full p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Main Video Area */}
        <div className="col-span-8 h-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      VDO.ninja Streaming Interface
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Professional streaming with real-time analytics
                    </p>
                  </div>
                  {/* Connection Status */}
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
            
            <div className="flex-1 relative bg-black">
              {streamKeyData ? (
                <>
                  <iframe
                    ref={iframeRef}
                    src={`https://vdo.ninja/?room=${streamKeyData.vdoRoomName}&push=${streamKeyData.streamKey}&webcam&quality=2&stats`}
                    className="w-full h-full"
                    allow="camera; microphone; autoplay; display-capture"
                    style={{ border: 'none' }}
                  />
                  
                  {/* Enhanced Stats Overlay */}
                  {showStatsOverlay && streamState.isStreaming && (
                    <div className="absolute top-4 left-4 right-4">
                      <MiniStatsBar
                        stats={{
                          fps: stats?.fps?.current || 0,
                          bitrate: stats?.bitrate || 0,
                          latency: stats?.latency || 0,
                          packetLoss: stats?.packetLoss || 0,
                          viewers: streamState.viewerCount || 0,
                          duration: streamDuration || 0
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
                  {qualityMetrics?.issues && qualityMetrics.issues.length > 0 && (
                    <div className="absolute top-20 left-4 bg-yellow-900/90 text-yellow-200 px-3 py-2 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{qualityMetrics.issues[0]}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p>Unable to load stream configuration</p>
                  <p className="text-sm text-gray-400 mt-2">Make sure you have streamer permissions</p>
                </div>
              )}
            </div>
            
            {/* Bottom Control Bar */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Quick Media Controls */}
                  <button
                    onClick={() => mediaActions?.toggleAudio()}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      controls.isAudioMuted 
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {controls.isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => mediaActions?.toggleVideo()}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      controls.isVideoHidden 
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {controls.isVideoHidden ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => mediaActions?.toggleScreenShare()}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      controls.isScreenSharing 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <MonitorUp className="w-4 h-4" />
                  </button>
                  
                  {streamState.isStreaming && (
                    <button
                      onClick={togglePause}
                      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {streamState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}
                  
                  {controls.isRecording && (
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
        <div className="col-span-4 h-full flex flex-col gap-4">
          {/* Stream Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6">
              <SimpleStreamControls
                streamKey={streamKeyData?.streamKey || ''}
                vdoRoomName={streamKeyData?.vdoRoomName || ''}
                isStreaming={isStreaming}
                currentStreamId={currentStreamId || undefined}
                onStreamStart={handleStreamStart}
                onStreamEnd={handleStreamEnd}
                onStreamCreated={(streamId) => setCurrentStreamId(streamId)}
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
                    {streamState.viewerCount || 0}
                  </span>
                  {trends?.viewerCount && (
                    <span className={clsx(
                      "text-xs",
                      trends.viewerCount > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {trends.viewerCount > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Duration */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Duration</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatDuration(streamDuration || 0)}
                  </span>
                </div>
              </div>
              
              {/* FPS with trend */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">FPS</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats?.fps?.current || 0}
                  </span>
                  {stats?.fps?.average && (
                    <span className="text-xs text-gray-500">
                      (avg: {stats.fps.average.toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
              
              {/* Bitrate */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Bitrate</span>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round((stats?.bitrate || 0) / 1000)} kbps
                  </span>
                </div>
              </div>
              
              {/* Latency */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Latency</span>
                <span className={clsx(
                  "font-semibold",
                  (stats?.latency || 0) < 50 ? "text-green-600" :
                  (stats?.latency || 0) < 150 ? "text-yellow-600" : "text-red-600"
                )}>
                  {stats?.latency || 0} ms
                </span>
              </div>
              
              {/* Packet Loss */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Packet Loss</span>
                <span className={clsx(
                  "font-semibold",
                  (stats?.packetLoss || 0) < 1 ? "text-green-600" :
                  (stats?.packetLoss || 0) < 5 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(stats?.packetLoss || 0).toFixed(1)}%
                </span>
              </div>
              
              {/* Data Usage */}
              {stats?.bytesSent && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Data Sent</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(stats.bytesSent / 1024 / 1024).toFixed(1)} MB
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
                    {streamState.viewerCount > 0 ? `${streamState.viewerCount} viewers connected` : 'No viewers yet'}
                  </p>
                </div>
              )}
              
              {activeTab === 'stats' && (
                <div>
                  <StatsDashboard
                    stats={stats}
                    history={history}
                    aggregatedStats={aggregatedStats}
                    qualityMetrics={qualityMetrics}
                    layout="grid"
                    showHeader={false}
                    showExport={true}
                    size="sm"
                    onExport={(format) => {
                      if (statsActions) {
                        const data = statsActions.exportStats(format);
                        console.log('Exported stats:', data);
                      }
                    }}
                  />
                </div>
              )}
              
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Stream Quality</h4>
                    <select
                      value={controls.qualityPreset || 'medium'}
                      onChange={(e) => mediaActions?.setQualityPreset(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <option value="low">Low (480p)</option>
                      <option value="medium">Medium (720p)</option>
                      <option value="high">High (1080p)</option>
                      <option value="ultra">Ultra (4K)</option>
                    </select>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Audio Device</h4>
                    <select
                      value={devices.selectedAudioInput || ''}
                      onChange={(e) => mediaActions?.selectAudioDevice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      {devices.audioInputs.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Video Device</h4>
                    <select
                      value={devices.selectedVideoInput || ''}
                      onChange={(e) => mediaActions?.selectVideoDevice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      {devices.videoInputs.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Command Queue Status */}
                  {commandQueue && commandQueue.size > 0 && (
                    <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {commandQueue.size} commands queued
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};