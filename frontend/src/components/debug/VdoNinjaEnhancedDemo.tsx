import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Volume2, Settings, Users, Wifi, WifiOff, Play, Pause,
  Camera, Radio, Square, Circle, Download, RotateCw
} from 'lucide-react';
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { StreamStateManager } from '@/lib/vdo-ninja/stream-state-manager';
import { VdoCommandManager, VdoCommands } from '@/lib/vdo-ninja/commands';
import { createVdoNinjaUrl } from '@/lib/vdo-ninja/url-builder';

export default function VdoNinjaEnhancedDemo() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const eventManagerRef = useRef<VdoEventManager | null>(null);
  const stateManagerRef = useRef<StreamStateManager | null>(null);
  const commandManagerRef = useRef<VdoCommandManager | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamState, setStreamState] = useState({
    isConnected: false,
    viewerCount: 0,
    audioEnabled: true,
    videoEnabled: true,
    screenShareEnabled: false,
    isRecording: false,
    bitrate: 0,
    framerate: 0,
    connectionQuality: 'good' as 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  });
  
  const [commandQueue, setCommandQueue] = useState<{ size: number; isProcessing: boolean }>({
    size: 0,
    isProcessing: false
  });
  
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [roomId] = useState(() => `demo-${Date.now()}`);

  useEffect(() => {
    // Initialize managers
    eventManagerRef.current = new VdoEventManager();
    stateManagerRef.current = new StreamStateManager(
      { enabled: false }, // Disable persistence for demo
      { maxAttempts: 3, baseDelay: 1000 }
    );
    commandManagerRef.current = new VdoCommandManager({
      queueEnabled: true,
      validateCommands: true
    });
    
    // Setup state change listener
    const unsubscribe = stateManagerRef.current.onChange((event) => {
      const state = stateManagerRef.current!.getState();
      setStreamState({
        isConnected: state.connectionState === 'connected',
        viewerCount: state.viewerCount,
        audioEnabled: state.audioEnabled,
        videoEnabled: state.videoEnabled,
        screenShareEnabled: state.screenShareEnabled,
        isRecording: state.isRecording,
        bitrate: state.bitrate,
        framerate: state.framerate,
        connectionQuality: state.connectionQuality
      });
      
      // Log important events
      if (event.type === 'connectionState' || event.type === 'viewerCount') {
        addToEventLog(`${event.type}: ${event.newValue}`);
      }
    });
    
    // Setup event listeners for key events
    eventManagerRef.current.on('*', (event) => {
      if (['connected', 'disconnected', 'viewerJoined', 'viewerLeft'].includes(event.action)) {
        addToEventLog(`Event: ${event.action}`);
      }
    });
    
    return () => {
      unsubscribe();
      eventManagerRef.current?.clear();
      stateManagerRef.current?.cleanup();
      commandManagerRef.current?.cleanup();
    };
  }, []);
  
  const addToEventLog = (message: string) => {
    setEventLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 10));
  };
  
  const startStream = () => {
    setIsStreaming(true);
    addToEventLog('Stream started');
    
    // Initialize managers after iframe is rendered
    setTimeout(() => {
      if (iframeRef.current) {
        eventManagerRef.current?.startListening(iframeRef.current);
        stateManagerRef.current?.initialize(eventManagerRef.current!);
        commandManagerRef.current?.setIframe(iframeRef.current);
        addToEventLog('VDO.Ninja initialized');
      }
    }, 100);
  };
  
  const stopStream = () => {
    // Don't send stop command to avoid download, just hide the iframe
    setIsStreaming(false);
    addToEventLog('Stream stopped');
    
    // Clean up event listeners
    eventManagerRef.current?.stopListening();
  };
  
  const toggleAudio = async () => {
    const command = streamState.audioEnabled 
      ? VdoCommands.muteAudio() 
      : VdoCommands.unmuteAudio();
    
    await commandManagerRef.current?.sendCommand(command, { priority: 'high' });
    addToEventLog(`Audio ${streamState.audioEnabled ? 'muted' : 'unmuted'}`);
  };
  
  const toggleVideo = async () => {
    const command = streamState.videoEnabled 
      ? VdoCommands.hideVideo() 
      : VdoCommands.showVideo();
    
    await commandManagerRef.current?.sendCommand(command, { priority: 'high' });
    addToEventLog(`Video ${streamState.videoEnabled ? 'hidden' : 'shown'}`);
  };
  
  const toggleScreenShare = async () => {
    const command = streamState.screenShareEnabled 
      ? VdoCommands.stopScreenShare() 
      : VdoCommands.startScreenShare();
    
    await commandManagerRef.current?.sendCommand(command, { priority: 'high' });
    addToEventLog(`Screen share ${streamState.screenShareEnabled ? 'stopped' : 'started'}`);
  };
  
  const toggleRecording = async () => {
    const command = streamState.isRecording 
      ? VdoCommands.stopRecording() 
      : VdoCommands.startRecording();
    
    await commandManagerRef.current?.sendCommand(command);
    addToEventLog(`Recording ${streamState.isRecording ? 'stopped' : 'started'}`);
  };
  
  const setBitrate = async (value: number) => {
    await commandManagerRef.current?.sendCommand(
      VdoCommands.setBitrate(value * 1000),
      { priority: 'normal' }
    );
    addToEventLog(`Bitrate set to ${value}kbps`);
  };
  
  const setQuality = async (quality: string) => {
    let qualityValue = 50;
    switch(quality) {
      case 'low': qualityValue = 20; break;
      case 'medium': qualityValue = 50; break;
      case 'high': qualityValue = 80; break;
      case 'max': qualityValue = 100; break;
    }
    
    await commandManagerRef.current?.sendCommand(
      VdoCommands.setQuality(qualityValue)
    );
    addToEventLog(`Quality set to ${quality}`);
  };
  
  const refreshStats = async () => {
    await commandManagerRef.current?.sendCommand(VdoCommands.requestStats());
    addToEventLog('Stats requested');
  };
  
  const checkQueueStatus = () => {
    const status = commandManagerRef.current?.getQueueStatus();
    if (status) {
      setCommandQueue({ size: status.size, isProcessing: status.isProcessing });
    }
  };
  
  useEffect(() => {
    const interval = setInterval(checkQueueStatus, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const streamerUrl = useMemo(() => {
    const url = createVdoNinjaUrl({
      room: roomId,
      push: roomId,
      bitrate: 2500,
      quality: 80,
      framerate: 30,
      stereo: true,
      autostart: true,
      webcam: true,
      microphone: true
    });
    console.log('VDO.Ninja URL generated:', { url, roomId });
    return url;
  }, [roomId]);
  
  const viewerUrl = useMemo(() => 
    `https://vdo.ninja/?view=${roomId}&room=${roomId}`,
    [roomId]
  );
  
  const getQualityBadgeColor = () => {
    switch(streamState.connectionQuality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">VDO.Ninja Enhanced Integration Demo</h2>
        
        {/* Status Bar */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${streamState.isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-medium">
              {streamState.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">{streamState.viewerCount} viewers</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span className={`text-sm px-2 py-1 rounded-full text-white ${getQualityBadgeColor()}`}>
              {streamState.connectionQuality}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span className="text-sm">{Math.round(streamState.bitrate / 1000)} kbps</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-sm">{streamState.framerate} fps</span>
          </div>
          
          {commandQueue.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <RotateCw className={`w-4 h-4 ${commandQueue.isProcessing ? 'animate-spin' : ''}`} />
              <span className="text-sm text-yellow-600">{commandQueue.size} queued</span>
            </div>
          )}
        </div>
        
        {/* Video Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stream Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Stream Preview</h3>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {!isStreaming ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={startStream} className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center text-lg font-medium transition-colors">
                    <Play className="w-5 h-5 mr-2" />
                    Start Stream
                  </button>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  src={streamerUrl}
                  className="w-full h-full"
                  allow="camera; microphone; display-capture; autoplay"
                  allowFullScreen
                  title="VDO.ninja Stream"
                  onLoad={() => addToEventLog('VDO.Ninja iframe loaded')}
                  onError={(e) => addToEventLog(`Error loading iframe: ${e}`)}
                />
              )}
              
              {streamState.isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                  <Circle className="w-3 h-3 fill-current" />
                  <span className="text-sm font-medium">REC</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Stream Controls</h3>
            
            {/* Media Controls */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={toggleAudio}
                  disabled={!isStreaming}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    streamState.audioEnabled 
                      ? 'bg-primary-600 text-white hover:bg-primary-700' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } ${!isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {streamState.audioEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                  {streamState.audioEnabled ? 'Mute' : 'Unmute'}
                </button>
                
                <button 
                  onClick={toggleVideo}
                  disabled={!isStreaming}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    streamState.videoEnabled 
                      ? 'bg-primary-600 text-white hover:bg-primary-700' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } ${!isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {streamState.videoEnabled ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                  {streamState.videoEnabled ? 'Hide Video' : 'Show Video'}
                </button>
                
                <button 
                  onClick={toggleScreenShare}
                  disabled={!isStreaming}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    streamState.screenShareEnabled 
                      ? 'bg-primary-600 text-white hover:bg-primary-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  } ${!isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {streamState.screenShareEnabled ? <MonitorOff className="w-4 h-4 mr-2" /> : <Monitor className="w-4 h-4 mr-2" />}
                  {streamState.screenShareEnabled ? 'Stop Share' : 'Share Screen'}
                </button>
                
                <button 
                  onClick={toggleRecording}
                  disabled={!isStreaming}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    streamState.isRecording 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  } ${!isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {streamState.isRecording ? <Square className="w-4 h-4 mr-2" /> : <Circle className="w-4 h-4 mr-2" />}
                  {streamState.isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
              
              {/* Quality Settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quality Preset</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'max'].map(quality => (
                    <button key={quality}
                      onClick={() => setQuality(quality)}
                      
                      
                      disabled={!isStreaming}
                      className="capitalize"
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bitrate Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bitrate (kbps)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2500, 5000].map(bitrate => (
                    <button key={bitrate}
                      onClick={() => setBitrate(bitrate)}
                      
                      
                      disabled={!isStreaming}
                    >
                      {bitrate}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={refreshStats}
                  
                  disabled={!isStreaming}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Refresh Stats
                </button>
                
                {isStreaming && (
                  <button onClick={stopStream}
                    
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Stream
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Event Log */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Event Log</h3>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-40 overflow-y-auto font-mono text-sm">
            {eventLog.length === 0 ? (
              <div className="text-gray-500">No events yet...</div>
            ) : (
              eventLog.map((log, index) => (
                <div key={index} className="py-0.5">{log}</div>
              ))
            )}
          </div>
        </div>
        
        {/* Connection Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium mb-2">Test URLs</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Room ID:</span> {roomId}
            </div>
            <div>
              <span className="font-medium">Viewer URL:</span>{' '}
              <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {viewerUrl}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}