import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { VdoCommandManager } from '@/lib/vdo-ninja/commands';
import type { StreamState } from '@/lib/vdo-ninja/stream-state-manager';
import type { StreamStatistics } from '@/lib/vdo-ninja/real-time-stats';

/**
 * VDO.Ninja Stream Store
 * Centralized state management for VDO.Ninja streaming features
 */

// Types
export interface VdoStreamState {
  streamId: string | null;
  roomName: string | null;
  streamKey: string | null;
  
  // Stream State
  streamState: 'idle' | 'initializing' | 'connecting' | 'connected' | 'streaming' | 'paused' | 'reconnecting' | 'error' | 'ended';
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
  isStreaming: boolean;
  isPaused: boolean;
  isRecording: boolean;
  isReconnecting: boolean;
  
  // Media Controls
  isAudioMuted: boolean;
  isVideoHidden: boolean;
  isScreenSharing: boolean;
  audioLevel: number;
  volume: number;
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
  qualityPreset: 'low' | 'medium' | 'high' | 'ultra';
  
  // Viewers
  viewerCount: number;
  peakViewerCount: number;
  totalViewers: number;
  activeViewers: Map<string, ViewerInfo>;
  
  // Statistics
  currentStats: StreamStatistics | null;
  statsHistory: StreamStatistics[];
  aggregatedStats: {
    lastMinute: Partial<StreamStatistics>;
    last5Minutes: Partial<StreamStatistics>;
    last15Minutes: Partial<StreamStatistics>;
  };
  
  // Connection Health
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | null;
  connectionScore: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  
  // Stream Info
  streamTitle: string;
  streamDescription: string;
  streamCategory: string;
  streamTags: string[];
  streamThumbnail: string | null;
  
  // Timestamps
  streamStartTime: Date | null;
  streamEndTime: Date | null;
  recordingStartTime: Date | null;
  recordingEndTime: Date | null;
  lastStateChange: Date;
  
  // Error State
  lastError: Error | null;
  errorCount: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Managers (not persisted)
  eventManager: VdoEventManager | null;
  commandManager: VdoCommandManager | null;
}

export interface ViewerInfo {
  id: string;
  username?: string;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  joinTime: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
}

export interface VdoStreamActions {
  // Initialization
  initializeStream: (streamId: string, roomName: string, streamKey: string) => void;
  setManagers: (eventManager: VdoEventManager, commandManager: VdoCommandManager) => void;
  
  // Stream Control
  startStream: () => Promise<void>;
  stopStream: () => Promise<void>;
  pauseStream: () => Promise<void>;
  resumeStream: () => Promise<void>;
  
  // Media Controls
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  setVolume: (volume: number) => void;
  setAudioDevice: (deviceId: string) => void;
  setVideoDevice: (deviceId: string) => void;
  setQualityPreset: (preset: 'low' | 'medium' | 'high' | 'ultra') => void;
  
  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  
  // Viewer Management
  addViewer: (viewer: ViewerInfo) => void;
  removeViewer: (viewerId: string) => void;
  updateViewer: (viewerId: string, updates: Partial<ViewerInfo>) => void;
  
  // Statistics
  updateStats: (stats: StreamStatistics) => void;
  aggregateStats: () => void;
  clearStatsHistory: () => void;
  
  // Connection Health
  updateConnectionHealth: (quality: VdoStreamState['connectionQuality'], score: number) => void;
  updateNetworkMetrics: (latency: number, packetLoss: number, jitter: number) => void;
  
  // Stream Info
  updateStreamInfo: (info: Partial<{
    title: string;
    description: string;
    category: string;
    tags: string[];
    thumbnail: string | null;
  }>) => void;
  
  // State Updates
  updateStreamState: (state: VdoStreamState['streamState']) => void;
  updateConnectionState: (state: VdoStreamState['connectionState']) => void;
  
  // Error Handling
  handleError: (error: Error) => void;
  clearError: () => void;
  incrementReconnectAttempt: () => void;
  resetReconnectAttempts: () => void;
  
  // Cleanup
  reset: () => void;
  cleanup: () => void;
}

type VdoStreamStore = VdoStreamState & VdoStreamActions;

// Initial state
const initialState: VdoStreamState = {
  streamId: null,
  roomName: null,
  streamKey: null,
  
  streamState: 'idle',
  connectionState: 'disconnected',
  isStreaming: false,
  isPaused: false,
  isRecording: false,
  isReconnecting: false,
  
  isAudioMuted: false,
  isVideoHidden: false,
  isScreenSharing: false,
  audioLevel: 0,
  volume: 100,
  selectedAudioDevice: null,
  selectedVideoDevice: null,
  qualityPreset: 'medium',
  
  viewerCount: 0,
  peakViewerCount: 0,
  totalViewers: 0,
  activeViewers: new Map(),
  
  currentStats: null,
  statsHistory: [],
  aggregatedStats: {
    lastMinute: {},
    last5Minutes: {},
    last15Minutes: {}
  },
  
  connectionQuality: null,
  connectionScore: 0,
  latency: 0,
  packetLoss: 0,
  jitter: 0,
  
  streamTitle: '',
  streamDescription: '',
  streamCategory: '',
  streamTags: [],
  streamThumbnail: null,
  
  streamStartTime: null,
  streamEndTime: null,
  recordingStartTime: null,
  recordingEndTime: null,
  lastStateChange: new Date(),
  
  lastError: null,
  errorCount: 0,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  
  eventManager: null,
  commandManager: null
};

// Create store
export const useVdoStreamStore = create<VdoStreamStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        // Initialization
        initializeStream: (streamId, roomName, streamKey) => {
          set({
            streamId,
            roomName,
            streamKey,
            streamState: 'initializing',
            lastStateChange: new Date()
          });
        },
        
        setManagers: (eventManager, commandManager) => {
          set({ eventManager, commandManager });
          
          // Setup event listeners
          if (eventManager) {
            // Stream events
            eventManager.on('streamStarted', () => {
              const state = get();
              set({
                streamState: 'streaming',
                isStreaming: true,
                streamStartTime: new Date(),
                lastStateChange: new Date(),
                errorCount: 0,
                reconnectAttempts: 0
              });
            });
            
            eventManager.on('streamEnded', () => {
              set({
                streamState: 'ended',
                isStreaming: false,
                streamEndTime: new Date(),
                lastStateChange: new Date()
              });
            });
            
            eventManager.on('streamPaused', () => {
              set({
                streamState: 'paused',
                isPaused: true,
                lastStateChange: new Date()
              });
            });
            
            eventManager.on('streamResumed', () => {
              set({
                streamState: 'streaming',
                isPaused: false,
                lastStateChange: new Date()
              });
            });
            
            eventManager.on('connected', () => {
              set({
                connectionState: 'connected',
                streamState: 'connected',
                isReconnecting: false,
                reconnectAttempts: 0,
                lastStateChange: new Date()
              });
            });
            
            eventManager.on('disconnected', () => {
              set({
                connectionState: 'disconnected',
                isReconnecting: true,
                lastStateChange: new Date()
              });
            });
            
            eventManager.on('reconnecting', () => {
              const state = get();
              set({
                streamState: 'reconnecting',
                isReconnecting: true,
                reconnectAttempts: state.reconnectAttempts + 1,
                lastStateChange: new Date()
              });
            });
            
            eventManager.on('error', (event) => {
              const state = get();
              set({
                streamState: 'error',
                lastError: new Error(event.error || 'Stream error'),
                errorCount: state.errorCount + 1,
                lastStateChange: new Date()
              });
            });
            
            // Media events
            eventManager.on('audioMuted', () => {
              set({ isAudioMuted: true });
            });
            
            eventManager.on('audioUnmuted', () => {
              set({ isAudioMuted: false });
            });
            
            eventManager.on('videoHidden', () => {
              set({ isVideoHidden: true });
            });
            
            eventManager.on('videoShown', () => {
              set({ isVideoHidden: false });
            });
            
            eventManager.on('screenShareStarted', () => {
              set({ isScreenSharing: true });
            });
            
            eventManager.on('screenShareEnded', () => {
              set({ isScreenSharing: false });
            });
            
            // Recording events
            eventManager.on('recordingStarted', () => {
              set({
                isRecording: true,
                recordingStartTime: new Date()
              });
            });
            
            eventManager.on('recordingStopped', () => {
              set({
                isRecording: false,
                recordingEndTime: new Date()
              });
            });
            
            // Viewer events
            eventManager.on('viewerJoined', (event) => {
              const state = get();
              const viewer: ViewerInfo = {
                id: event.viewerId,
                username: event.username,
                connectionQuality: event.connectionQuality,
                joinTime: new Date(),
                lastActivity: new Date(),
                isAuthenticated: !!event.username
              };
              
              const newViewers = new Map(state.activeViewers);
              newViewers.set(viewer.id, viewer);
              
              set({
                activeViewers: newViewers,
                viewerCount: newViewers.size,
                totalViewers: state.totalViewers + 1,
                peakViewerCount: Math.max(state.peakViewerCount, newViewers.size)
              });
            });
            
            eventManager.on('viewerLeft', (event) => {
              const state = get();
              const newViewers = new Map(state.activeViewers);
              newViewers.delete(event.viewerId);
              
              set({
                activeViewers: newViewers,
                viewerCount: newViewers.size
              });
            });
            
            // Stats events
            eventManager.on('getStats', (event) => {
              if (event.stats) {
                get().updateStats(event.stats);
              }
            });
            
            // Connection health events
            eventManager.on('connectionHealthUpdate', (event) => {
              set({
                connectionQuality: event.quality,
                connectionScore: event.score,
                latency: event.latency || get().latency,
                packetLoss: event.packetLoss || get().packetLoss,
                jitter: event.jitter || get().jitter
              });
            });
          }
        },
        
        // Stream Control
        startStream: async () => {
          const { commandManager } = get();
          if (commandManager) {
            set({ streamState: 'initializing' });
            await commandManager.sendCommand({ action: 'startStream' });
          }
        },
        
        stopStream: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'stopStream' });
            set({
              streamState: 'ended',
              isStreaming: false,
              streamEndTime: new Date()
            });
          }
        },
        
        pauseStream: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'pauseStream' });
            set({ isPaused: true, streamState: 'paused' });
          }
        },
        
        resumeStream: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'resumeStream' });
            set({ isPaused: false, streamState: 'streaming' });
          }
        },
        
        // Media Controls
        toggleAudio: async () => {
          const { commandManager, isAudioMuted } = get();
          if (commandManager) {
            await commandManager.sendCommand({
              action: isAudioMuted ? 'unmuteAudio' : 'muteAudio'
            });
            set({ isAudioMuted: !isAudioMuted });
          }
        },
        
        toggleVideo: async () => {
          const { commandManager, isVideoHidden } = get();
          if (commandManager) {
            await commandManager.sendCommand({
              action: isVideoHidden ? 'showVideo' : 'hideVideo'
            });
            set({ isVideoHidden: !isVideoHidden });
          }
        },
        
        toggleScreenShare: async () => {
          const { commandManager, isScreenSharing } = get();
          if (commandManager) {
            await commandManager.sendCommand({
              action: isScreenSharing ? 'stopScreenShare' : 'startScreenShare'
            });
            set({ isScreenSharing: !isScreenSharing });
          }
        },
        
        setVolume: (volume) => {
          set({ volume });
          const { commandManager } = get();
          if (commandManager) {
            commandManager.sendCommand({ action: 'setVolume', value: volume });
          }
        },
        
        setAudioDevice: (deviceId) => {
          set({ selectedAudioDevice: deviceId });
          const { commandManager } = get();
          if (commandManager) {
            commandManager.sendCommand({ action: 'setAudioDevice', value: deviceId });
          }
        },
        
        setVideoDevice: (deviceId) => {
          set({ selectedVideoDevice: deviceId });
          const { commandManager } = get();
          if (commandManager) {
            commandManager.sendCommand({ action: 'setVideoDevice', value: deviceId });
          }
        },
        
        setQualityPreset: (preset) => {
          set({ qualityPreset: preset });
          const { commandManager } = get();
          if (commandManager) {
            const presetSettings = {
              low: { bitrate: 1000000, resolution: '480p', framerate: 30 },
              medium: { bitrate: 2500000, resolution: '720p', framerate: 30 },
              high: { bitrate: 5000000, resolution: '1080p', framerate: 30 },
              ultra: { bitrate: 10000000, resolution: '4K', framerate: 60 }
            };
            
            const settings = presetSettings[preset];
            commandManager.sendCommand({
              action: 'setQuality',
              value: settings
            });
          }
        },
        
        // Recording
        startRecording: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'startRecording' });
            set({ isRecording: true, recordingStartTime: new Date() });
          }
        },
        
        stopRecording: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'stopRecording' });
            set({ isRecording: false, recordingEndTime: new Date() });
          }
        },
        
        pauseRecording: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'pauseRecording' });
          }
        },
        
        resumeRecording: async () => {
          const { commandManager } = get();
          if (commandManager) {
            await commandManager.sendCommand({ action: 'resumeRecording' });
          }
        },
        
        // Viewer Management
        addViewer: (viewer) => {
          const state = get();
          const newViewers = new Map(state.activeViewers);
          newViewers.set(viewer.id, viewer);
          
          set({
            activeViewers: newViewers,
            viewerCount: newViewers.size,
            totalViewers: state.totalViewers + 1,
            peakViewerCount: Math.max(state.peakViewerCount, newViewers.size)
          });
        },
        
        removeViewer: (viewerId) => {
          const state = get();
          const newViewers = new Map(state.activeViewers);
          newViewers.delete(viewerId);
          
          set({
            activeViewers: newViewers,
            viewerCount: newViewers.size
          });
        },
        
        updateViewer: (viewerId, updates) => {
          const state = get();
          const viewer = state.activeViewers.get(viewerId);
          if (viewer) {
            const newViewers = new Map(state.activeViewers);
            newViewers.set(viewerId, { ...viewer, ...updates });
            set({ activeViewers: newViewers });
          }
        },
        
        // Statistics
        updateStats: (stats) => {
          const state = get();
          const newHistory = [...state.statsHistory, stats];
          
          // Keep only last 5 minutes of history (300 data points at 1s intervals)
          if (newHistory.length > 300) {
            newHistory.shift();
          }
          
          set({
            currentStats: stats,
            statsHistory: newHistory
          });
          
          // Trigger aggregation
          get().aggregateStats();
        },
        
        aggregateStats: () => {
          const { statsHistory } = get();
          if (statsHistory.length === 0) return;
          
          const now = Date.now();
          const oneMinuteAgo = now - 60000;
          const fiveMinutesAgo = now - 300000;
          const fifteenMinutesAgo = now - 900000;
          
          const aggregate = (data: StreamStatistics[]) => {
            if (data.length === 0) return {};
            
            const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
            const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
            
            return {
              fps: avg(data.map(d => d.fps || 0)),
              bitrate: avg(data.map(d => d.bitrate || 0)),
              latency: avg(data.map(d => d.latency || 0)),
              packetLoss: avg(data.map(d => d.packetLoss || 0)),
              jitter: avg(data.map(d => d.jitter || 0))
            };
          };
          
          // Filter stats by time windows
          const lastMinuteStats = statsHistory.filter(s => 
            s.timestamp && new Date(s.timestamp).getTime() > oneMinuteAgo
          );
          
          const last5MinutesStats = statsHistory.filter(s => 
            s.timestamp && new Date(s.timestamp).getTime() > fiveMinutesAgo
          );
          
          const last15MinutesStats = statsHistory.filter(s => 
            s.timestamp && new Date(s.timestamp).getTime() > fifteenMinutesAgo
          );
          
          set({
            aggregatedStats: {
              lastMinute: aggregate(lastMinuteStats),
              last5Minutes: aggregate(last5MinutesStats),
              last15Minutes: aggregate(last15MinutesStats)
            }
          });
        },
        
        clearStatsHistory: () => {
          set({
            statsHistory: [],
            aggregatedStats: {
              lastMinute: {},
              last5Minutes: {},
              last15Minutes: {}
            }
          });
        },
        
        // Connection Health
        updateConnectionHealth: (quality, score) => {
          set({
            connectionQuality: quality,
            connectionScore: score
          });
        },
        
        updateNetworkMetrics: (latency, packetLoss, jitter) => {
          set({ latency, packetLoss, jitter });
        },
        
        // Stream Info
        updateStreamInfo: (info) => {
          set({
            streamTitle: info.title !== undefined ? info.title : get().streamTitle,
            streamDescription: info.description !== undefined ? info.description : get().streamDescription,
            streamCategory: info.category !== undefined ? info.category : get().streamCategory,
            streamTags: info.tags !== undefined ? info.tags : get().streamTags,
            streamThumbnail: info.thumbnail !== undefined ? info.thumbnail : get().streamThumbnail
          });
        },
        
        // State Updates
        updateStreamState: (state) => {
          set({
            streamState: state,
            lastStateChange: new Date()
          });
        },
        
        updateConnectionState: (state) => {
          set({ connectionState: state });
        },
        
        // Error Handling
        handleError: (error) => {
          const state = get();
          set({
            lastError: error,
            errorCount: state.errorCount + 1,
            streamState: 'error'
          });
          
          // Attempt reconnection if below max attempts
          if (state.reconnectAttempts < state.maxReconnectAttempts) {
            setTimeout(() => {
              get().incrementReconnectAttempt();
              // Trigger reconnection logic here
            }, Math.min(1000 * Math.pow(2, state.reconnectAttempts), 10000));
          }
        },
        
        clearError: () => {
          set({ lastError: null });
        },
        
        incrementReconnectAttempt: () => {
          set({ reconnectAttempts: get().reconnectAttempts + 1 });
        },
        
        resetReconnectAttempts: () => {
          set({ reconnectAttempts: 0 });
        },
        
        // Cleanup
        reset: () => {
          set(initialState);
        },
        
        cleanup: () => {
          const { eventManager, commandManager } = get();
          
          // Clean up event listeners
          if (eventManager) {
            eventManager.stopListening();
          }
          
          // Clear command queue
          if (commandManager) {
            commandManager.clearQueue();
          }
          
          // Reset state
          get().reset();
        }
      })),
      {
        name: 'vdo-stream-store',
        // Don't persist managers and certain runtime data
        partialize: (state) => ({
          streamId: state.streamId,
          roomName: state.roomName,
          streamKey: state.streamKey,
          streamTitle: state.streamTitle,
          streamDescription: state.streamDescription,
          streamCategory: state.streamCategory,
          streamTags: state.streamTags,
          qualityPreset: state.qualityPreset,
          volume: state.volume,
          selectedAudioDevice: state.selectedAudioDevice,
          selectedVideoDevice: state.selectedVideoDevice
        })
      }
    ),
    {
      name: 'VdoStreamStore'
    }
  )
);

// Selectors
export const selectStreamState = (state: VdoStreamStore) => state.streamState;
export const selectIsStreaming = (state: VdoStreamStore) => state.isStreaming;
export const selectViewerCount = (state: VdoStreamStore) => state.viewerCount;
export const selectConnectionQuality = (state: VdoStreamStore) => state.connectionQuality;
export const selectCurrentStats = (state: VdoStreamStore) => state.currentStats;
export const selectMediaControls = (state: VdoStreamStore) => ({
  isAudioMuted: state.isAudioMuted,
  isVideoHidden: state.isVideoHidden,
  isScreenSharing: state.isScreenSharing,
  volume: state.volume
});

// Helper hooks
export const useVdoStream = () => {
  const streamState = useVdoStreamStore(selectStreamState);
  const isStreaming = useVdoStreamStore(selectIsStreaming);
  const viewerCount = useVdoStreamStore(selectViewerCount);
  const connectionQuality = useVdoStreamStore(selectConnectionQuality);
  
  return {
    streamState,
    isStreaming,
    viewerCount,
    connectionQuality
  };
};

export const useVdoMediaControls = () => {
  const controls = useVdoStreamStore(selectMediaControls);
  const toggleAudio = useVdoStreamStore(state => state.toggleAudio);
  const toggleVideo = useVdoStreamStore(state => state.toggleVideo);
  const toggleScreenShare = useVdoStreamStore(state => state.toggleScreenShare);
  const setVolume = useVdoStreamStore(state => state.setVolume);
  
  return {
    ...controls,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    setVolume
  };
};

export const useVdoStats = () => {
  const currentStats = useVdoStreamStore(selectCurrentStats);
  const aggregatedStats = useVdoStreamStore(state => state.aggregatedStats);
  const connectionQuality = useVdoStreamStore(selectConnectionQuality);
  const latency = useVdoStreamStore(state => state.latency);
  const packetLoss = useVdoStreamStore(state => state.packetLoss);
  
  return {
    currentStats,
    aggregatedStats,
    connectionQuality,
    latency,
    packetLoss
  };
};