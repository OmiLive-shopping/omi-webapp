import { VdoEventManager, VdoEvents } from './event-manager';
import type {
  VdoEvent,
  StreamLifecycleEvent,
  ViewerEvent,
  MediaStateEvent,
  QualityEvent,
  ConnectionHealthEvent
} from './types';

export interface StreamState {
  // Stream lifecycle
  streamId: string | null;
  isStreaming: boolean;
  isPaused: boolean;
  startTime: number | null;
  duration: number;
  
  // Viewer management
  viewerCount: number;
  activeViewers: Map<string, ViewerInfo>;
  peakViewerCount: number;
  
  // Media controls
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  currentAudioDevice: string | null;
  currentVideoDevice: string | null;
  
  // Connection quality
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  lastConnectionUpdate: number;
  
  // Quality metrics
  bitrate: number;
  resolution: { width: number; height: number } | null;
  framerate: number;
  packetLoss: number;
  latency: number;
  
  // Recording state
  isRecording: boolean;
  recordingStartTime: number | null;
}

export interface ViewerInfo {
  viewerId: string;
  userName?: string;
  joinTime: number;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  lastActivity: number;
}

export interface StreamStateChangeEvent {
  type: keyof StreamState | 'multiple';
  previousValue: any;
  newValue: any;
  timestamp: number;
}

export type StreamStateChangeHandler = (event: StreamStateChangeEvent) => void;

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface PersistenceConfig {
  enabled: boolean;
  storageKey: string;
  persistInterval: number;
  fieldsToExclude?: (keyof StreamState)[];
}

export class StreamStateManager {
  private state: StreamState;
  private eventManager: VdoEventManager | null = null;
  private changeHandlers: Set<StreamStateChangeHandler> = new Set();
  private eventUnsubscribers: Array<() => void> = [];
  
  // Persistence
  private persistenceConfig: PersistenceConfig;
  private persistenceTimer: NodeJS.Timeout | null = null;
  private lastPersistedState: string | null = null;
  
  // Retry mechanism
  private retryConfig: RetryConfig;
  private retryAttempts: number = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private isRetrying: boolean = false;
  
  // State history for debugging
  private stateHistory: Array<{ state: Partial<StreamState>; timestamp: number }> = [];
  private maxHistorySize: number = 50;
  
  constructor(
    persistenceConfig?: Partial<PersistenceConfig>,
    retryConfig?: Partial<RetryConfig>
  ) {
    // Initialize default state
    this.state = this.getDefaultState();
    
    // Configure persistence
    this.persistenceConfig = {
      enabled: true,
      storageKey: 'vdo-stream-state',
      persistInterval: 1000,
      fieldsToExclude: ['activeViewers'],
      ...persistenceConfig
    };
    
    // Configure retry mechanism
    this.retryConfig = {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      ...retryConfig
    };
    
    // Load persisted state if available
    if (this.persistenceConfig.enabled) {
      this.loadPersistedState();
      this.startPersistence();
    }
  }
  
  /**
   * Get default state
   */
  private getDefaultState(): StreamState {
    return {
      // Stream lifecycle
      streamId: null,
      isStreaming: false,
      isPaused: false,
      startTime: null,
      duration: 0,
      
      // Viewer management
      viewerCount: 0,
      activeViewers: new Map(),
      peakViewerCount: 0,
      
      // Media controls
      audioEnabled: true,
      videoEnabled: true,
      screenShareEnabled: false,
      currentAudioDevice: null,
      currentVideoDevice: null,
      
      // Connection quality
      connectionState: 'idle',
      connectionQuality: 'good',
      lastConnectionUpdate: Date.now(),
      
      // Quality metrics
      bitrate: 0,
      resolution: null,
      framerate: 0,
      packetLoss: 0,
      latency: 0,
      
      // Recording state
      isRecording: false,
      recordingStartTime: null
    };
  }
  
  /**
   * Initialize with VdoEventManager
   */
  initialize(eventManager: VdoEventManager): void {
    if (this.eventManager) {
      this.cleanup();
    }
    
    this.eventManager = eventManager;
    this.setupEventListeners();
    
    // Update connection state
    this.updateState({ connectionState: 'connecting' });
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.eventManager) return;
    
    // Stream lifecycle events
    this.subscribeToEvent(VdoEvents.STREAM_STARTED, this.handleStreamStarted.bind(this));
    this.subscribeToEvent(VdoEvents.STREAM_STOPPED, this.handleStreamStopped.bind(this));
    this.subscribeToEvent(VdoEvents.STREAM_PAUSED, this.handleStreamPaused.bind(this));
    this.subscribeToEvent(VdoEvents.STREAM_RESUMED, this.handleStreamResumed.bind(this));
    
    // Viewer events
    this.subscribeToEvent(VdoEvents.VIEWER_JOINED, this.handleViewerJoined.bind(this));
    this.subscribeToEvent(VdoEvents.VIEWER_LEFT, this.handleViewerLeft.bind(this));
    this.subscribeToEvent(VdoEvents.VIEWER_RECONNECTED, this.handleViewerReconnected.bind(this));
    
    // Media state events
    this.subscribeToEvent(VdoEvents.AUDIO_MUTED, () => this.updateState({ audioEnabled: false }));
    this.subscribeToEvent(VdoEvents.AUDIO_UNMUTED, () => this.updateState({ audioEnabled: true }));
    this.subscribeToEvent(VdoEvents.VIDEO_MUTED, () => this.updateState({ videoEnabled: false }));
    this.subscribeToEvent(VdoEvents.VIDEO_UNMUTED, () => this.updateState({ videoEnabled: true }));
    this.subscribeToEvent(VdoEvents.MEDIA_STATE_CHANGED, this.handleMediaStateChanged.bind(this));
    
    // Quality events
    this.subscribeToEvent(VdoEvents.QUALITY_CHANGED, this.handleQualityChanged.bind(this));
    this.subscribeToEvent(VdoEvents.BITRATE_CHANGED, this.handleBitrateChanged.bind(this));
    this.subscribeToEvent(VdoEvents.RESOLUTION_CHANGED, this.handleResolutionChanged.bind(this));
    this.subscribeToEvent(VdoEvents.FRAMERATE_CHANGED, this.handleFramerateChanged.bind(this));
    
    // Connection events
    this.subscribeToEvent(VdoEvents.CONNECTED, () => this.handleConnectionStateChange('connected'));
    this.subscribeToEvent(VdoEvents.DISCONNECTED, () => this.handleConnectionStateChange('disconnected'));
    this.subscribeToEvent(VdoEvents.CONNECTION_FAILED, () => this.handleConnectionStateChange('failed'));
    this.subscribeToEvent(VdoEvents.CONNECTION_HEALTH_UPDATE, this.handleConnectionHealthUpdate.bind(this));
    
    // Recording events
    this.subscribeToEvent(VdoEvents.RECORDING_STARTED, this.handleRecordingStarted.bind(this));
    this.subscribeToEvent(VdoEvents.RECORDING_STOPPED, this.handleRecordingStopped.bind(this));
    
    // Stats updates
    this.subscribeToEvent(VdoEvents.STATS, this.handleStatsUpdate.bind(this));
  }
  
  /**
   * Subscribe to an event with automatic cleanup tracking
   */
  private subscribeToEvent(event: string, handler: (event: VdoEvent) => void): void {
    if (!this.eventManager) return;
    
    this.eventManager.on(event, handler);
    this.eventUnsubscribers.push(() => {
      this.eventManager?.off(event, handler);
    });
  }
  
  /**
   * Handle stream started event
   */
  private handleStreamStarted(event: StreamLifecycleEvent): void {
    const streamInfo = event.streamInfo;
    this.updateState({
      streamId: streamInfo?.streamId || event.streamId || null,
      isStreaming: true,
      isPaused: false,
      startTime: streamInfo?.startTime || Date.now(),
      duration: 0
    });
    
    // Reset retry attempts on successful connection
    this.retryAttempts = 0;
    this.isRetrying = false;
  }
  
  /**
   * Handle stream stopped event
   */
  private handleStreamStopped(event: StreamLifecycleEvent): void {
    const duration = this.state.startTime 
      ? Date.now() - this.state.startTime 
      : 0;
    
    this.updateState({
      isStreaming: false,
      isPaused: false,
      duration,
      viewerCount: 0,
      activeViewers: new Map()
    });
  }
  
  /**
   * Handle stream paused event
   */
  private handleStreamPaused(event: StreamLifecycleEvent): void {
    this.updateState({ isPaused: true });
  }
  
  /**
   * Handle stream resumed event
   */
  private handleStreamResumed(event: StreamLifecycleEvent): void {
    this.updateState({ isPaused: false });
  }
  
  /**
   * Handle viewer joined event
   */
  private handleViewerJoined(event: ViewerEvent): void {
    const viewerInfo = event.viewerInfo;
    if (!viewerInfo?.viewerId) return;
    
    const activeViewers = new Map(this.state.activeViewers);
    activeViewers.set(viewerInfo.viewerId, {
      viewerId: viewerInfo.viewerId,
      userName: viewerInfo.userName,
      joinTime: viewerInfo.joinTime || Date.now(),
      connectionQuality: viewerInfo.connectionQuality,
      lastActivity: Date.now()
    });
    
    const viewerCount = activeViewers.size;
    const peakViewerCount = Math.max(viewerCount, this.state.peakViewerCount);
    
    this.updateState({
      activeViewers,
      viewerCount,
      peakViewerCount
    });
  }
  
  /**
   * Handle viewer left event
   */
  private handleViewerLeft(event: ViewerEvent): void {
    const viewerId = event.viewerInfo?.viewerId;
    if (!viewerId) return;
    
    const activeViewers = new Map(this.state.activeViewers);
    activeViewers.delete(viewerId);
    
    this.updateState({
      activeViewers,
      viewerCount: activeViewers.size
    });
  }
  
  /**
   * Handle viewer reconnected event
   */
  private handleViewerReconnected(event: ViewerEvent): void {
    const viewerInfo = event.viewerInfo;
    if (!viewerInfo?.viewerId) return;
    
    const activeViewers = new Map(this.state.activeViewers);
    const existingViewer = activeViewers.get(viewerInfo.viewerId);
    
    activeViewers.set(viewerInfo.viewerId, {
      ...existingViewer,
      viewerId: viewerInfo.viewerId,
      userName: viewerInfo.userName || existingViewer?.userName,
      connectionQuality: viewerInfo.connectionQuality,
      lastActivity: Date.now()
    });
    
    this.updateState({ activeViewers });
  }
  
  /**
   * Handle media state changed event
   */
  private handleMediaStateChanged(event: MediaStateEvent): void {
    const mediaState = event.mediaState;
    if (!mediaState) return;
    
    this.updateState({
      audioEnabled: mediaState.audioEnabled,
      videoEnabled: mediaState.videoEnabled,
      screenShareEnabled: mediaState.screenShareEnabled,
      currentAudioDevice: mediaState.audioDevice || this.state.currentAudioDevice,
      currentVideoDevice: mediaState.videoDevice || this.state.currentVideoDevice
    });
  }
  
  /**
   * Handle quality changed event
   */
  private handleQualityChanged(event: QualityEvent): void {
    const quality = event.quality;
    if (!quality) return;
    
    const updates: Partial<StreamState> = {};
    
    if (quality.bitrate !== undefined) updates.bitrate = quality.bitrate;
    if (quality.resolution) updates.resolution = quality.resolution;
    if (quality.framerate !== undefined) updates.framerate = quality.framerate;
    
    if (Object.keys(updates).length > 0) {
      this.updateState(updates);
    }
  }
  
  /**
   * Handle bitrate changed event
   */
  private handleBitrateChanged(event: QualityEvent): void {
    if (event.quality?.bitrate !== undefined) {
      this.updateState({ bitrate: event.quality.bitrate });
    }
  }
  
  /**
   * Handle resolution changed event
   */
  private handleResolutionChanged(event: QualityEvent): void {
    if (event.quality?.resolution) {
      this.updateState({ resolution: event.quality.resolution });
    }
  }
  
  /**
   * Handle framerate changed event
   */
  private handleFramerateChanged(event: QualityEvent): void {
    if (event.quality?.framerate !== undefined) {
      this.updateState({ framerate: event.quality.framerate });
    }
  }
  
  /**
   * Handle connection state change
   */
  private handleConnectionStateChange(state: StreamState['connectionState']): void {
    this.updateState({
      connectionState: state,
      lastConnectionUpdate: Date.now()
    });
    
    // Handle connection failures with retry
    if (state === 'failed' || state === 'disconnected') {
      this.handleConnectionFailure();
    } else if (state === 'connected') {
      // Reset retry state on successful connection
      this.retryAttempts = 0;
      this.isRetrying = false;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    }
  }
  
  /**
   * Handle connection health update
   */
  private handleConnectionHealthUpdate(event: ConnectionHealthEvent): void {
    const health = event.health;
    if (!health) return;
    
    const updates: Partial<StreamState> = {
      lastConnectionUpdate: Date.now()
    };
    
    if (health.state) updates.connectionState = health.state;
    if (health.quality) updates.connectionQuality = health.quality;
    if (health.packetLoss !== undefined) updates.packetLoss = health.packetLoss;
    if (health.latency !== undefined) updates.latency = health.latency;
    
    this.updateState(updates);
  }
  
  /**
   * Handle recording started event
   */
  private handleRecordingStarted(event: VdoEvent): void {
    this.updateState({
      isRecording: true,
      recordingStartTime: Date.now()
    });
  }
  
  /**
   * Handle recording stopped event
   */
  private handleRecordingStopped(event: VdoEvent): void {
    this.updateState({
      isRecording: false,
      recordingStartTime: null
    });
  }
  
  /**
   * Handle stats update
   */
  private handleStatsUpdate(event: VdoEvent): void {
    const stats = event.stats;
    if (!stats) return;
    
    const updates: Partial<StreamState> = {};
    
    if (stats.bitrate?.total !== undefined) {
      updates.bitrate = stats.bitrate.total;
    }
    if (stats.resolution) {
      updates.resolution = stats.resolution;
    }
    if (stats.framerate !== undefined) {
      updates.framerate = stats.framerate;
    }
    if (stats.packetLoss !== undefined) {
      updates.packetLoss = stats.packetLoss;
    }
    if (stats.latency !== undefined) {
      updates.latency = stats.latency;
    }
    
    if (Object.keys(updates).length > 0) {
      this.updateState(updates);
    }
  }
  
  /**
   * Handle connection failure with retry mechanism
   */
  private handleConnectionFailure(): void {
    if (this.isRetrying || this.retryAttempts >= this.retryConfig.maxAttempts) {
      return;
    }
    
    this.isRetrying = true;
    this.retryAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, this.retryAttempts - 1),
      this.retryConfig.maxDelay
    );
    
    console.log(`VDO.ninja: Connection failed, retrying in ${delay}ms (attempt ${this.retryAttempts}/${this.retryConfig.maxAttempts})`);
    
    this.retryTimer = setTimeout(() => {
      this.updateState({ connectionState: 'reconnecting' });
      
      // Emit retry event for external handling
      this.emitChange({
        type: 'connectionState',
        previousValue: 'failed',
        newValue: 'reconnecting',
        timestamp: Date.now()
      });
      
      // The actual reconnection should be handled externally
      // This manager just tracks the state
      this.isRetrying = false;
    }, delay);
  }
  
  /**
   * Update state with changes
   */
  private updateState(updates: Partial<StreamState>): void {
    const previousState = { ...this.state };
    const changes: Array<StreamStateChangeEvent> = [];
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      const typedKey = key as keyof StreamState;
      const previousValue = this.state[typedKey];
      
      // Special handling for Map objects
      if (value instanceof Map) {
        (this.state as any)[typedKey] = value;
      } else if (previousValue !== value) {
        (this.state as any)[typedKey] = value;
      }
      
      // Track changes
      if (previousValue !== value) {
        changes.push({
          type: typedKey,
          previousValue,
          newValue: value,
          timestamp: Date.now()
        });
      }
    });
    
    // Update duration if streaming
    if (this.state.isStreaming && this.state.startTime && !this.state.isPaused) {
      this.state.duration = Date.now() - this.state.startTime;
    }
    
    // Add to history
    this.addToHistory(updates);
    
    // Emit changes
    if (changes.length > 0) {
      if (changes.length === 1) {
        this.emitChange(changes[0]);
      } else {
        this.emitChange({
          type: 'multiple',
          previousValue: previousState,
          newValue: this.state,
          timestamp: Date.now()
        });
      }
    }
    
    // Trigger persistence
    if (this.persistenceConfig.enabled) {
      this.schedulePersistence();
    }
  }
  
  /**
   * Add state change to history
   */
  private addToHistory(updates: Partial<StreamState>): void {
    this.stateHistory.push({
      state: updates,
      timestamp: Date.now()
    });
    
    // Trim history if needed
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }
  
  /**
   * Emit state change event
   */
  private emitChange(event: StreamStateChangeEvent): void {
    this.changeHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('StreamStateManager: Change handler error', error);
      }
    });
  }
  
  /**
   * Subscribe to state changes
   */
  onChange(handler: StreamStateChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }
  
  /**
   * Get current state
   */
  getState(): Readonly<StreamState> {
    return { ...this.state };
  }
  
  /**
   * Get specific state value
   */
  getValue<K extends keyof StreamState>(key: K): StreamState[K] {
    return this.state[key];
  }
  
  /**
   * Get state history
   */
  getHistory(): Array<{ state: Partial<StreamState>; timestamp: number }> {
    return [...this.stateHistory];
  }
  
  /**
   * Manually update state (for external control)
   */
  setState(updates: Partial<StreamState>): void {
    this.updateState(updates);
  }
  
  /**
   * Reset state to defaults
   */
  reset(): void {
    this.updateState(this.getDefaultState());
    this.stateHistory = [];
    this.retryAttempts = 0;
    this.isRetrying = false;
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
  
  /**
   * Load persisted state from storage
   */
  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem(this.persistenceConfig.storageKey);
      if (!stored) return;
      
      const parsed = JSON.parse(stored);
      const restoredState: Partial<StreamState> = {};
      
      // Restore allowed fields
      Object.entries(parsed).forEach(([key, value]) => {
        if (!this.persistenceConfig.fieldsToExclude?.includes(key as keyof StreamState)) {
          (restoredState as any)[key] = value;
        }
      });
      
      // Don't restore transient fields
      delete restoredState.isStreaming;
      delete restoredState.isPaused;
      delete restoredState.connectionState;
      delete restoredState.activeViewers;
      delete restoredState.viewerCount;
      
      // Apply restored state
      this.updateState(restoredState);
      
      console.log('VDO.ninja: Restored stream state from storage');
    } catch (error) {
      console.error('VDO.ninja: Failed to load persisted state', error);
    }
  }
  
  /**
   * Start persistence timer
   */
  private startPersistence(): void {
    if (!this.persistenceConfig.enabled) return;
    
    // Clear existing timer
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    
    // Set up periodic persistence
    this.persistenceTimer = setInterval(() => {
      this.persistState();
    }, this.persistenceConfig.persistInterval);
  }
  
  /**
   * Schedule immediate persistence
   */
  private schedulePersistence(): void {
    // Debounce persistence to avoid excessive writes
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }
    
    this.persistenceTimer = setTimeout(() => {
      this.persistState();
    }, 100);
  }
  
  /**
   * Persist current state to storage
   */
  private persistState(): void {
    if (!this.persistenceConfig.enabled) return;
    
    try {
      const stateToPersist: Partial<StreamState> = {};
      
      // Only persist allowed fields
      Object.entries(this.state).forEach(([key, value]) => {
        if (!this.persistenceConfig.fieldsToExclude?.includes(key as keyof StreamState)) {
          // Convert Map to array for serialization
          if (value instanceof Map) {
            (stateToPersist as any)[key] = Array.from(value.entries());
          } else {
            (stateToPersist as any)[key] = value;
          }
        }
      });
      
      const serialized = JSON.stringify(stateToPersist);
      
      // Only write if state has changed
      if (serialized !== this.lastPersistedState) {
        localStorage.setItem(this.persistenceConfig.storageKey, serialized);
        this.lastPersistedState = serialized;
      }
    } catch (error) {
      console.error('VDO.ninja: Failed to persist state', error);
    }
  }
  
  /**
   * Cleanup and release resources
   */
  cleanup(): void {
    // Unsubscribe from all events
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribers = [];
    
    // Clear timers
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    // Final persistence
    if (this.persistenceConfig.enabled) {
      this.persistState();
    }
    
    // Clear handlers
    this.changeHandlers.clear();
    
    // Reset state
    this.reset();
    
    this.eventManager = null;
  }
  
  /**
   * Get retry status
   */
  getRetryStatus(): {
    isRetrying: boolean;
    attempts: number;
    maxAttempts: number;
  } {
    return {
      isRetrying: this.isRetrying,
      attempts: this.retryAttempts,
      maxAttempts: this.retryConfig.maxAttempts
    };
  }
  
  /**
   * Force retry connection
   */
  forceRetry(): void {
    this.retryAttempts = 0;
    this.handleConnectionFailure();
  }
  
  /**
   * Cancel retry attempts
   */
  cancelRetry(): void {
    this.isRetrying = false;
    this.retryAttempts = 0;
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}