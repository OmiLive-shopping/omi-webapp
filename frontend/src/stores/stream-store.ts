import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface StreamInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl?: string;
  startedAt: Date;
  scheduledFor?: Date;
}

export interface StreamStats {
  viewerCount: number;
  peakViewerCount: number;
  duration: number;
  likes: number;
  shares: number;
  chatMessages: number;
  bandwidth: {
    upload: number;
    download: number;
  };
  quality: {
    resolution: string;
    fps: number;
    bitrate: number;
  };
}

export interface Viewer {
  id: string;
  username: string;
  avatarUrl?: string;
  joinedAt: Date;
  isFollowing: boolean;
  isSubscribed: boolean;
  isModerator: boolean;
  watchTime: number;
}

export type StreamStatus = 'offline' | 'starting' | 'live' | 'ending' | 'ended';

interface StreamState {
  // Stream Info
  currentStream: StreamInfo | null;
  setCurrentStream: (stream: StreamInfo | null) => void;
  updateStreamInfo: (updates: Partial<StreamInfo>) => void;
  
  // Stream Status
  status: StreamStatus;
  setStatus: (status: StreamStatus) => void;
  isLive: boolean;
  goLive: (streamInfo: StreamInfo) => void;
  endStream: () => void;
  
  // Stream Stats
  stats: StreamStats;
  updateStats: (updates: Partial<StreamStats>) => void;
  incrementViewerCount: () => void;
  decrementViewerCount: () => void;
  recordPeakViewers: () => void;
  
  // Viewers
  viewers: Map<string, Viewer>;
  addViewer: (viewer: Viewer) => void;
  removeViewer: (viewerId: string) => void;
  updateViewer: (viewerId: string, updates: Partial<Viewer>) => void;
  getActiveViewers: () => Viewer[];
  
  // Stream Settings
  streamKey: string | null;
  setStreamKey: (key: string | null) => void;
  streamUrl: string | null;
  setStreamUrl: (url: string | null) => void;
  
  // Recording
  isRecording: boolean;
  recordingStartedAt: Date | null;
  startRecording: () => void;
  stopRecording: () => void;
  
  // Stream History
  streamHistory: StreamInfo[];
  addToHistory: (stream: StreamInfo) => void;
  clearHistory: () => void;
  
  // Utilities
  resetStreamData: () => void;
  getStreamDuration: () => number;
  isStreamer: boolean;
  setIsStreamer: (isStreamer: boolean) => void;
}

const initialStats: StreamStats = {
  viewerCount: 0,
  peakViewerCount: 0,
  duration: 0,
  likes: 0,
  shares: 0,
  chatMessages: 0,
  bandwidth: {
    upload: 0,
    download: 0,
  },
  quality: {
    resolution: '1080p',
    fps: 30,
    bitrate: 4500,
  },
};

export const useStreamStore = create<StreamState>()(
  subscribeWithSelector((set, get) => ({
    // Stream Info
    currentStream: null,
    setCurrentStream: (currentStream) => set({ currentStream }),
    updateStreamInfo: (updates) => set((state) => ({
      currentStream: state.currentStream 
        ? { ...state.currentStream, ...updates }
        : null
    })),
    
    // Stream Status
    status: 'offline',
    setStatus: (status) => set({ status, isLive: status === 'live' }),
    isLive: false,
    goLive: (streamInfo) => {
      set({
        currentStream: streamInfo,
        status: 'live',
        isLive: true,
        stats: { ...initialStats, viewerCount: 0 },
      });
      get().addToHistory(streamInfo);
    },
    endStream: () => {
      const { currentStream, stats } = get();
      if (currentStream) {
        // Save final stats before ending
        get().addToHistory({
          ...currentStream,
          startedAt: currentStream.startedAt,
        });
      }
      set({
        status: 'ended',
        isLive: false,
        isRecording: false,
        recordingStartedAt: null,
      });
    },
    
    // Stream Stats
    stats: initialStats,
    updateStats: (updates) => set((state) => ({
      stats: { ...state.stats, ...updates }
    })),
    incrementViewerCount: () => set((state) => {
      const newCount = state.stats.viewerCount + 1;
      return {
        stats: {
          ...state.stats,
          viewerCount: newCount,
          peakViewerCount: Math.max(newCount, state.stats.peakViewerCount),
        }
      };
    }),
    decrementViewerCount: () => set((state) => ({
      stats: {
        ...state.stats,
        viewerCount: Math.max(0, state.stats.viewerCount - 1),
      }
    })),
    recordPeakViewers: () => set((state) => ({
      stats: {
        ...state.stats,
        peakViewerCount: Math.max(state.stats.viewerCount, state.stats.peakViewerCount),
      }
    })),
    
    // Viewers
    viewers: new Map(),
    addViewer: (viewer) => set((state) => {
      const newViewers = new Map(state.viewers);
      newViewers.set(viewer.id, viewer);
      return { viewers: newViewers };
    }),
    removeViewer: (viewerId) => set((state) => {
      const newViewers = new Map(state.viewers);
      newViewers.delete(viewerId);
      return { viewers: newViewers };
    }),
    updateViewer: (viewerId, updates) => set((state) => {
      const newViewers = new Map(state.viewers);
      const viewer = newViewers.get(viewerId);
      if (viewer) {
        newViewers.set(viewerId, { ...viewer, ...updates });
      }
      return { viewers: newViewers };
    }),
    getActiveViewers: () => Array.from(get().viewers.values()),
    
    // Stream Settings
    streamKey: null,
    setStreamKey: (streamKey) => set({ streamKey }),
    streamUrl: null,
    setStreamUrl: (streamUrl) => set({ streamUrl }),
    
    // Recording
    isRecording: false,
    recordingStartedAt: null,
    startRecording: () => set({ 
      isRecording: true, 
      recordingStartedAt: new Date() 
    }),
    stopRecording: () => set({ 
      isRecording: false, 
      recordingStartedAt: null 
    }),
    
    // Stream History
    streamHistory: [],
    addToHistory: (stream) => set((state) => ({
      streamHistory: [stream, ...state.streamHistory].slice(0, 50) // Keep last 50
    })),
    clearHistory: () => set({ streamHistory: [] }),
    
    // Utilities
    resetStreamData: () => set({
      currentStream: null,
      status: 'offline',
      isLive: false,
      stats: initialStats,
      viewers: new Map(),
      isRecording: false,
      recordingStartedAt: null,
    }),
    getStreamDuration: () => {
      const { currentStream } = get();
      if (!currentStream) return 0;
      return Date.now() - currentStream.startedAt.getTime();
    },
    isStreamer: false,
    setIsStreamer: (isStreamer) => set({ isStreamer }),
  }))
);

// Subscribe to viewer count changes for real-time updates
useStreamStore.subscribe(
  (state) => state.stats.viewerCount,
  (viewerCount) => {
    // Record peak viewers automatically
    useStreamStore.getState().recordPeakViewers();
  }
);