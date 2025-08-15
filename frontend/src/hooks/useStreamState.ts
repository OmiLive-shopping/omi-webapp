import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { StreamStateManager, StreamState } from '@/lib/vdo-ninja/stream-state-manager';
import { VdoCommandManager, VdoCommands, CommandResponse } from '@/lib/vdo-ninja/commands';
import type { VdoCommand } from '@/lib/vdo-ninja/types';

export interface UseStreamStateOptions {
  // State persistence
  persistState?: boolean;
  storageKey?: string;
  
  // Retry configuration
  maxRetryAttempts?: number;
  retryDelay?: number;
  
  // Command configuration
  enableCommandQueue?: boolean;
  commandTimeout?: number;
  
  // Optimistic updates
  optimisticUpdates?: boolean;
  optimisticDelay?: number;
  
  // Event throttling
  throttleStats?: boolean;
  statsInterval?: number;
  
  // Auto-initialization
  autoInitialize?: boolean;
}

export interface StreamActions {
  // Stream lifecycle
  startStream: () => Promise<void>;
  stopStream: () => Promise<void>;
  pauseStream: () => Promise<void>;
  resumeStream: () => Promise<void>;
  
  // Media controls
  toggleAudio: () => Promise<boolean>;
  toggleVideo: () => Promise<boolean>;
  toggleScreenShare: () => Promise<boolean>;
  setVolume: (volume: number) => Promise<void>;
  
  // Quality controls
  setBitrate: (bitrate: number) => Promise<void>;
  setQuality: (quality: number) => Promise<void>;
  setFramerate: (framerate: number) => Promise<void>;
  
  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleRecording: () => Promise<boolean>;
  
  // Device controls
  switchCamera: () => Promise<void>;
  switchMicrophone: () => Promise<void>;
  setCamera: (deviceId: string) => Promise<void>;
  setMicrophone: (deviceId: string) => Promise<void>;
  
  // Effects
  toggleMirror: () => Promise<boolean>;
  setBlur: (enabled: boolean, strength?: number) => Promise<void>;
  
  // Connection
  reconnect: () => Promise<void>;
  forceRetry: () => void;
  cancelRetry: () => void;
  
  // Stats
  refreshStats: () => Promise<void>;
  
  // Custom command
  sendCommand: (command: VdoCommand, priority?: 'low' | 'normal' | 'high' | 'critical') => Promise<CommandResponse | void>;
}

export interface StreamMetrics {
  // Performance metrics
  bitrate: number;
  framerate: number;
  resolution: { width: number; height: number } | null;
  packetLoss: number;
  latency: number;
  
  // Connection metrics
  connectionDuration: number;
  reconnectAttempts: number;
  lastReconnect: number | null;
  
  // Viewer metrics
  viewerCount: number;
  peakViewerCount: number;
  averageViewTime: number;
  
  // Quality score (0-100)
  qualityScore: number;
}

export interface UseStreamStateReturn {
  // Stream state
  state: StreamState;
  
  // Derived states
  isConnected: boolean;
  isStreaming: boolean;
  isPaused: boolean;
  isRecording: boolean;
  isReconnecting: boolean;
  hasError: boolean;
  
  // Media states
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  
  // Metrics
  metrics: StreamMetrics;
  
  // Actions
  actions: StreamActions;
  
  // Managers (for advanced usage)
  managers: {
    event: VdoEventManager | null;
    state: StreamStateManager | null;
    command: VdoCommandManager | null;
  };
  
  // Initialize with iframe
  initialize: (iframe: HTMLIFrameElement) => void;
  
  // Cleanup
  cleanup: () => void;
}

/**
 * React hook for managing VDO.Ninja stream state
 */
export function useStreamState(options: UseStreamStateOptions = {}): UseStreamStateReturn {
  const {
    persistState = true,
    storageKey = 'vdo-stream-state',
    maxRetryAttempts = 5,
    retryDelay = 1000,
    enableCommandQueue = true,
    commandTimeout = 5000,
    optimisticUpdates = true,
    optimisticDelay = 100,
    throttleStats = true,
    statsInterval = 1000,
    autoInitialize = false
  } = options;
  
  // Managers
  const eventManagerRef = useRef<VdoEventManager | null>(null);
  const stateManagerRef = useRef<StreamStateManager | null>(null);
  const commandManagerRef = useRef<VdoCommandManager | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // State
  const [streamState, setStreamState] = useState<StreamState>({
    streamId: null,
    isStreaming: false,
    isPaused: false,
    startTime: null,
    duration: 0,
    viewerCount: 0,
    activeViewers: new Map(),
    peakViewerCount: 0,
    audioEnabled: true,
    videoEnabled: true,
    screenShareEnabled: false,
    currentAudioDevice: null,
    currentVideoDevice: null,
    connectionState: 'idle',
    connectionQuality: 'good',
    lastConnectionUpdate: Date.now(),
    bitrate: 0,
    resolution: null,
    framerate: 0,
    packetLoss: 0,
    latency: 0,
    isRecording: false,
    recordingStartTime: null
  });
  
  const [metrics, setMetrics] = useState<StreamMetrics>({
    bitrate: 0,
    framerate: 0,
    resolution: null,
    packetLoss: 0,
    latency: 0,
    connectionDuration: 0,
    reconnectAttempts: 0,
    lastReconnect: null,
    viewerCount: 0,
    peakViewerCount: 0,
    averageViewTime: 0,
    qualityScore: 100
  });
  
  // Optimistic update tracking
  const optimisticTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [optimisticState, setOptimisticState] = useState<Partial<StreamState>>({});
  
  // Initialize managers
  useEffect(() => {
    // Create managers
    eventManagerRef.current = new VdoEventManager();
    stateManagerRef.current = new StreamStateManager(
      {
        enabled: persistState,
        storageKey,
        persistInterval: 1000
      },
      {
        maxAttempts: maxRetryAttempts,
        baseDelay: retryDelay
      }
    );
    commandManagerRef.current = new VdoCommandManager({
      queueEnabled: enableCommandQueue,
      responseTimeout: commandTimeout,
      validateCommands: true
    });
    
    // Set up throttling for stats if enabled
    if (throttleStats) {
      eventManagerRef.current.setThrottle('stats', {
        interval: statsInterval,
        trailing: true
      });
    }
    
    // Subscribe to state changes
    const unsubscribe = stateManagerRef.current.onChange((event) => {
      const newState = stateManagerRef.current!.getState();
      setStreamState(newState);
      updateMetrics(newState);
      
      // Clear optimistic state on actual update
      if (optimisticState[event.type as keyof StreamState] !== undefined) {
        setOptimisticState(prev => {
          const updated = { ...prev };
          delete updated[event.type as keyof StreamState];
          return updated;
        });
      }
    });
    
    // Auto-initialize if requested
    if (autoInitialize && iframeRef.current) {
      initialize(iframeRef.current);
    }
    
    return () => {
      unsubscribe();
      cleanup();
    };
  }, []); // Only run once on mount
  
  // Update metrics based on state
  const updateMetrics = useCallback((state: StreamState) => {
    setMetrics(prev => {
      const connectionDuration = state.isStreaming && state.startTime 
        ? Date.now() - state.startTime 
        : prev.connectionDuration;
      
      const averageViewTime = state.viewerCount > 0 
        ? connectionDuration / state.viewerCount 
        : 0;
      
      // Calculate quality score (0-100)
      let qualityScore = 100;
      if (state.packetLoss > 5) qualityScore -= 20;
      if (state.packetLoss > 10) qualityScore -= 20;
      if (state.latency > 100) qualityScore -= 10;
      if (state.latency > 200) qualityScore -= 10;
      if (state.bitrate < 1000000) qualityScore -= 10;
      if (state.framerate < 24) qualityScore -= 10;
      if (state.connectionQuality === 'poor') qualityScore -= 20;
      if (state.connectionQuality === 'critical') qualityScore -= 30;
      qualityScore = Math.max(0, qualityScore);
      
      return {
        bitrate: state.bitrate,
        framerate: state.framerate,
        resolution: state.resolution,
        packetLoss: state.packetLoss,
        latency: state.latency,
        connectionDuration,
        reconnectAttempts: stateManagerRef.current?.getRetryStatus().attempts || 0,
        lastReconnect: null, // TODO: Track this
        viewerCount: state.viewerCount,
        peakViewerCount: state.peakViewerCount,
        averageViewTime,
        qualityScore
      };
    });
  }, []);
  
  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((updates: Partial<StreamState>) => {
    if (!optimisticUpdates) return;
    
    setOptimisticState(prev => ({ ...prev, ...updates }));
    
    // Clear after delay if not confirmed
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }
    
    optimisticTimeoutRef.current = setTimeout(() => {
      setOptimisticState({});
    }, optimisticDelay);
  }, [optimisticUpdates, optimisticDelay]);
  
  // Initialize with iframe
  const initialize = useCallback((iframe: HTMLIFrameElement) => {
    if (!eventManagerRef.current || !stateManagerRef.current || !commandManagerRef.current) {
      console.error('useStreamState: Managers not initialized');
      return;
    }
    
    iframeRef.current = iframe;
    eventManagerRef.current.startListening(iframe);
    stateManagerRef.current.initialize(eventManagerRef.current);
    commandManagerRef.current.setIframe(iframe);
  }, []);
  
  // Cleanup
  const cleanup = useCallback(() => {
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }
    
    eventManagerRef.current?.stopListening();
    eventManagerRef.current?.clear();
    stateManagerRef.current?.cleanup();
    commandManagerRef.current?.cleanup();
    
    eventManagerRef.current = null;
    stateManagerRef.current = null;
    commandManagerRef.current = null;
    iframeRef.current = null;
  }, []);
  
  // Send command helper
  const sendCommandWithOptimistic = useCallback(async (
    command: VdoCommand,
    optimisticUpdates?: Partial<StreamState>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<CommandResponse | void> => {
    if (!commandManagerRef.current) {
      throw new Error('Command manager not initialized');
    }
    
    // Apply optimistic update
    if (optimisticUpdates) {
      applyOptimisticUpdate(optimisticUpdates);
    }
    
    // Send command
    const response = await commandManagerRef.current.sendCommand(command, {
      priority,
      waitForResponse: true
    });
    
    // Revert optimistic update on error
    if (response && !response.success && optimisticUpdates) {
      setOptimisticState({});
    }
    
    return response;
  }, [applyOptimisticUpdate]);
  
  // Stream lifecycle actions
  const startStream = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.startStream(),
      { isStreaming: true, connectionState: 'connecting' },
      'high'
    );
  }, [sendCommandWithOptimistic]);
  
  const stopStream = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.stopStream(),
      { isStreaming: false, connectionState: 'disconnected' },
      'high'
    );
  }, [sendCommandWithOptimistic]);
  
  const pauseStream = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.pauseStream(),
      { isPaused: true }
    );
  }, [sendCommandWithOptimistic]);
  
  const resumeStream = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.resumeStream(),
      { isPaused: false }
    );
  }, [sendCommandWithOptimistic]);
  
  // Media control actions
  const toggleAudio = useCallback(async () => {
    const newState = !streamState.audioEnabled;
    await sendCommandWithOptimistic(
      newState ? VdoCommands.unmuteAudio() : VdoCommands.muteAudio(),
      { audioEnabled: newState },
      'high'
    );
    return newState;
  }, [streamState.audioEnabled, sendCommandWithOptimistic]);
  
  const toggleVideo = useCallback(async () => {
    const newState = !streamState.videoEnabled;
    await sendCommandWithOptimistic(
      newState ? VdoCommands.showVideo() : VdoCommands.hideVideo(),
      { videoEnabled: newState },
      'high'
    );
    return newState;
  }, [streamState.videoEnabled, sendCommandWithOptimistic]);
  
  const toggleScreenShare = useCallback(async () => {
    const newState = !streamState.screenShareEnabled;
    await sendCommandWithOptimistic(
      newState ? VdoCommands.startScreenShare() : VdoCommands.stopScreenShare(),
      { screenShareEnabled: newState },
      'high'
    );
    return newState;
  }, [streamState.screenShareEnabled, sendCommandWithOptimistic]);
  
  const setVolume = useCallback(async (volume: number) => {
    await sendCommandWithOptimistic(VdoCommands.setVolume(volume));
  }, [sendCommandWithOptimistic]);
  
  // Quality control actions
  const setBitrate = useCallback(async (bitrate: number) => {
    await sendCommandWithOptimistic(
      VdoCommands.setBitrate(bitrate),
      { bitrate }
    );
  }, [sendCommandWithOptimistic]);
  
  const setQuality = useCallback(async (quality: number) => {
    await sendCommandWithOptimistic(VdoCommands.setQuality(quality));
  }, [sendCommandWithOptimistic]);
  
  const setFramerate = useCallback(async (framerate: number) => {
    await sendCommandWithOptimistic(
      VdoCommands.setFramerate(framerate),
      { framerate }
    );
  }, [sendCommandWithOptimistic]);
  
  // Recording actions
  const startRecording = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.startRecording(),
      { isRecording: true, recordingStartTime: Date.now() },
      'high'
    );
  }, [sendCommandWithOptimistic]);
  
  const stopRecording = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.stopRecording(),
      { isRecording: false, recordingStartTime: null },
      'high'
    );
  }, [sendCommandWithOptimistic]);
  
  const toggleRecording = useCallback(async () => {
    const newState = !streamState.isRecording;
    if (newState) {
      await startRecording();
    } else {
      await stopRecording();
    }
    return newState;
  }, [streamState.isRecording, startRecording, stopRecording]);
  
  // Device control actions
  const switchCamera = useCallback(async () => {
    await sendCommandWithOptimistic(VdoCommands.switchCamera());
  }, [sendCommandWithOptimistic]);
  
  const switchMicrophone = useCallback(async () => {
    await sendCommandWithOptimistic(VdoCommands.switchMicrophone());
  }, [sendCommandWithOptimistic]);
  
  const setCamera = useCallback(async (deviceId: string) => {
    await sendCommandWithOptimistic(
      VdoCommands.setCamera(deviceId),
      { currentVideoDevice: deviceId }
    );
  }, [sendCommandWithOptimistic]);
  
  const setMicrophone = useCallback(async (deviceId: string) => {
    await sendCommandWithOptimistic(
      VdoCommands.setMicrophone(deviceId),
      { currentAudioDevice: deviceId }
    );
  }, [sendCommandWithOptimistic]);
  
  // Effects actions
  const toggleMirror = useCallback(async () => {
    // Note: Mirror state is not tracked in StreamState
    // This would need to be added if required
    const command = VdoCommands.setMirror(true); // Toggle logic would go here
    await sendCommandWithOptimistic(command);
    return true;
  }, [sendCommandWithOptimistic]);
  
  const setBlur = useCallback(async (enabled: boolean, strength?: number) => {
    await sendCommandWithOptimistic(VdoCommands.setBlur(enabled, strength));
  }, [sendCommandWithOptimistic]);
  
  // Connection actions
  const reconnect = useCallback(async () => {
    await sendCommandWithOptimistic(
      VdoCommands.reconnect(),
      { connectionState: 'reconnecting' },
      'critical'
    );
  }, [sendCommandWithOptimistic]);
  
  const forceRetry = useCallback(() => {
    stateManagerRef.current?.forceRetry();
  }, []);
  
  const cancelRetry = useCallback(() => {
    stateManagerRef.current?.cancelRetry();
  }, []);
  
  // Stats action
  const refreshStats = useCallback(async () => {
    await sendCommandWithOptimistic(VdoCommands.requestStats());
  }, [sendCommandWithOptimistic]);
  
  // Custom command
  const sendCommand = useCallback(async (
    command: VdoCommand,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ) => {
    if (!commandManagerRef.current) {
      throw new Error('Command manager not initialized');
    }
    
    return commandManagerRef.current.sendCommand(command, {
      priority,
      waitForResponse: true
    });
  }, []);
  
  // Merge optimistic state with actual state
  const mergedState = useMemo(() => ({
    ...streamState,
    ...optimisticState
  }), [streamState, optimisticState]);
  
  // Derived states
  const isConnected = mergedState.connectionState === 'connected';
  const isStreaming = mergedState.isStreaming;
  const isPaused = mergedState.isPaused;
  const isRecording = mergedState.isRecording;
  const isReconnecting = mergedState.connectionState === 'reconnecting';
  const hasError = mergedState.connectionState === 'failed';
  const audioEnabled = mergedState.audioEnabled;
  const videoEnabled = mergedState.videoEnabled;
  const screenShareEnabled = mergedState.screenShareEnabled;
  
  // Actions object
  const actions: StreamActions = {
    startStream,
    stopStream,
    pauseStream,
    resumeStream,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    setVolume,
    setBitrate,
    setQuality,
    setFramerate,
    startRecording,
    stopRecording,
    toggleRecording,
    switchCamera,
    switchMicrophone,
    setCamera,
    setMicrophone,
    toggleMirror,
    setBlur,
    reconnect,
    forceRetry,
    cancelRetry,
    refreshStats,
    sendCommand
  };
  
  return {
    state: mergedState,
    isConnected,
    isStreaming,
    isPaused,
    isRecording,
    isReconnecting,
    hasError,
    audioEnabled,
    videoEnabled,
    screenShareEnabled,
    metrics,
    actions,
    managers: {
      event: eventManagerRef.current,
      state: stateManagerRef.current,
      command: commandManagerRef.current
    },
    initialize,
    cleanup
  };
}