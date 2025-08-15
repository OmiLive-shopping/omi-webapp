import { 
  VdoEvent, 
  VdoStats,
  StreamLifecycleEvent,
  ViewerEvent,
  MediaStateEvent,
  QualityEvent,
  ConnectionHealthEvent,
  EventValidationRule,
  ThrottleConfig
} from './types';

export type VdoEventHandler = (event: VdoEvent) => void;
export type VdoStatsHandler = (stats: VdoStats) => void;

export class VdoEventManager {
  private eventHandlers: Map<string, Set<VdoEventHandler>> = new Map();
  private statsHandlers: Set<VdoStatsHandler> = new Set();
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private iframeRef: HTMLIFrameElement | null = null;
  
  // Enhanced event tracking
  private eventHistory: VdoEvent[] = [];
  private maxHistorySize = 100;
  private lastEventTimestamps: Map<string, number> = new Map();
  
  // Throttling configuration
  private throttleConfigs: Map<string, ThrottleConfig> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleQueues: Map<string, VdoEvent[]> = new Map();
  
  // Validation rules
  private validationRules: Map<string, EventValidationRule> = new Map();
  
  // Connection health tracking
  private connectionHealth: {
    state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    lastUpdate: number;
  } = {
    state: 'disconnected',
    quality: 'good',
    lastUpdate: Date.now()
  };
  
  // Viewer tracking
  private activeViewers: Map<string, { joinTime: number; userName?: string }> = new Map();
  private viewerCount = 0;

  /**
   * Start listening to VDO.ninja events
   */
  startListening(iframe: HTMLIFrameElement): void {
    if (this.messageListener) {
      this.stopListening();
    }

    this.iframeRef = iframe;
    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageListener);
  }

  /**
   * Stop listening to VDO.ninja events
   */
  stopListening(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.iframeRef = null;
  }

  /**
   * Handle incoming postMessage events
   */
  private handleMessage(event: MessageEvent): void {
    // Verify the message is from our iframe
    if (this.iframeRef && event.source !== this.iframeRef.contentWindow) {
      return;
    }

    // Parse VDO.ninja message
    const data = event.data;
    if (!data || typeof data !== 'object' || !data.action) {
      return;
    }

    // Create enhanced event with timestamp
    const vdoEvent: VdoEvent = {
      action: data.action,
      value: data.value,
      streamId: data.streamId,
      target: data.target,
      stats: data.stats,
      timestamp: Date.now(),
      metadata: data.metadata || {}
    };

    // Validate event
    if (!this.validateEvent(vdoEvent)) {
      console.warn('VDO.ninja: Invalid event received', vdoEvent);
      return;
    }

    // Add to event history
    this.addToHistory(vdoEvent);

    // Process enhanced event types
    this.processEnhancedEvent(vdoEvent);

    // Handle stats separately
    if (vdoEvent.action === 'stats' && vdoEvent.stats) {
      this.emitStats(vdoEvent.stats);
    }

    // Check if event should be throttled
    if (this.shouldThrottle(vdoEvent.action)) {
      this.handleThrottledEvent(vdoEvent);
    } else {
      // Emit to specific action handlers
      this.emit(vdoEvent.action, vdoEvent);
      
      // Emit to wildcard handlers
      this.emit('*', vdoEvent);
    }
  }

  /**
   * Register an event handler for a specific action
   */
  on(action: string, handler: VdoEventHandler): void {
    if (!this.eventHandlers.has(action)) {
      this.eventHandlers.set(action, new Set());
    }
    this.eventHandlers.get(action)!.add(handler);
  }

  /**
   * Unregister an event handler
   */
  off(action: string, handler: VdoEventHandler): void {
    const handlers = this.eventHandlers.get(action);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(action);
      }
    }
  }

  /**
   * Register a stats handler
   */
  onStats(handler: VdoStatsHandler): void {
    this.statsHandlers.add(handler);
  }

  /**
   * Unregister a stats handler
   */
  offStats(handler: VdoStatsHandler): void {
    this.statsHandlers.delete(handler);
  }

  /**
   * Emit an event to all registered handlers
   * Made public for testing and manual event triggering
   */
  public emit(action: string, event: VdoEvent): void {
    const handlers = this.eventHandlers.get(action);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('VDO.ninja: Event handler error', error);
        }
      });
    }
  }

  /**
   * Emit stats to all registered handlers
   */
  private emitStats(stats: VdoStats): void {
    this.statsHandlers.forEach(handler => {
      try {
        handler(stats);
      } catch (error) {
        console.error('VDO.ninja: Stats handler error', error);
      }
    });
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.eventHandlers.clear();
    this.statsHandlers.clear();
    this.eventHistory = [];
    this.lastEventTimestamps.clear();
    this.throttleConfigs.clear();
    this.throttleQueues.clear();
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.clear();
    this.activeViewers.clear();
    this.viewerCount = 0;
  }

  /**
   * Process enhanced event types
   */
  private processEnhancedEvent(event: VdoEvent): void {
    switch (event.action) {
      // Stream lifecycle events
      case 'streamStarted':
      case 'streamStopped':
      case 'streamPaused':
      case 'streamResumed':
        this.handleStreamLifecycleEvent(event as StreamLifecycleEvent);
        break;
        
      // Viewer management events
      case 'viewerJoined':
      case 'viewerLeft':
      case 'viewerReconnected':
        this.handleViewerEvent(event as ViewerEvent);
        break;
        
      // Media state events
      case 'audioMuted':
      case 'audioUnmuted':
      case 'videoMuted':
      case 'videoUnmuted':
      case 'mediaStateChanged':
        this.handleMediaStateEvent(event as MediaStateEvent);
        break;
        
      // Quality events
      case 'qualityChanged':
      case 'bitrateChanged':
      case 'resolutionChanged':
      case 'framerateChanged':
        this.handleQualityEvent(event as QualityEvent);
        break;
        
      // Connection health events
      case 'connectionHealthUpdate':
      case 'connectionStateChanged':
      case 'networkQualityChanged':
        this.handleConnectionHealthEvent(event as ConnectionHealthEvent);
        break;
        
      // Existing connection events
      case 'connected':
        this.updateConnectionHealth('connected', 'excellent');
        break;
      case 'disconnected':
        this.updateConnectionHealth('disconnected', 'poor');
        break;
      case 'connectionFailed':
        this.updateConnectionHealth('failed', 'critical');
        break;
    }
  }

  /**
   * Handle stream lifecycle events
   */
  private handleStreamLifecycleEvent(event: StreamLifecycleEvent): void {
    // Emit specific stream lifecycle event
    this.emit(`stream:${event.action}`, event);
    
    // Log important stream events
    if (event.action === 'streamStarted') {
      console.log('VDO.ninja: Stream started', event.streamInfo);
    } else if (event.action === 'streamStopped') {
      console.log('VDO.ninja: Stream stopped', event.streamInfo);
    }
  }

  /**
   * Handle viewer events
   */
  private handleViewerEvent(event: ViewerEvent): void {
    const viewerId = event.viewerInfo?.viewerId;
    
    if (viewerId) {
      switch (event.action) {
        case 'viewerJoined':
          this.activeViewers.set(viewerId, {
            joinTime: event.viewerInfo?.joinTime || Date.now(),
            userName: event.viewerInfo?.userName
          });
          this.viewerCount++;
          break;
          
        case 'viewerLeft':
          this.activeViewers.delete(viewerId);
          this.viewerCount = Math.max(0, this.viewerCount - 1);
          break;
          
        case 'viewerReconnected':
          if (!this.activeViewers.has(viewerId)) {
            this.activeViewers.set(viewerId, {
              joinTime: Date.now(),
              userName: event.viewerInfo?.userName
            });
          }
          break;
      }
    }
    
    // Add viewer count to event
    event.viewerCount = this.viewerCount;
    
    // Emit viewer event
    this.emit(`viewer:${event.action}`, event);
  }

  /**
   * Handle media state events
   */
  private handleMediaStateEvent(event: MediaStateEvent): void {
    // Emit media state event
    this.emit(`media:${event.action}`, event);
    
    // Track overall media state
    if (event.mediaState) {
      this.emit('mediaStateUpdate', event);
    }
  }

  /**
   * Handle quality events
   */
  private handleQualityEvent(event: QualityEvent): void {
    // Emit quality event
    this.emit(`quality:${event.action}`, event);
    
    // Update connection quality based on bitrate
    if (event.quality?.bitrate) {
      const bitrate = event.quality.bitrate;
      let quality: typeof this.connectionHealth.quality;
      
      if (bitrate > 2000000) quality = 'excellent';
      else if (bitrate > 1000000) quality = 'good';
      else if (bitrate > 500000) quality = 'fair';
      else if (bitrate > 100000) quality = 'poor';
      else quality = 'critical';
      
      this.updateConnectionHealth(this.connectionHealth.state, quality);
    }
  }

  /**
   * Handle connection health events
   */
  private handleConnectionHealthEvent(event: ConnectionHealthEvent): void {
    if (event.health) {
      this.updateConnectionHealth(event.health.state, event.health.quality);
    }
    
    // Emit connection health event
    this.emit(`connection:${event.action}`, event);
  }

  /**
   * Update connection health state
   */
  private updateConnectionHealth(
    state: typeof this.connectionHealth.state,
    quality: typeof this.connectionHealth.quality
  ): void {
    this.connectionHealth = {
      state,
      quality,
      lastUpdate: Date.now()
    };
    
    // Emit health update
    this.emit('connectionHealthChanged', {
      action: 'connectionHealthChanged',
      value: this.connectionHealth,
      timestamp: Date.now()
    } as VdoEvent);
  }

  /**
   * Validate an event against defined rules
   */
  private validateEvent(event: VdoEvent): boolean {
    const rule = this.validationRules.get(event.action);
    
    if (!rule) {
      // No validation rule defined, allow by default
      return true;
    }
    
    // Check required fields
    if (rule.required) {
      for (const field of rule.required) {
        if (!(field in event) || event[field as keyof VdoEvent] === undefined) {
          console.error(`VDO.ninja: Missing required field '${field}' in event '${event.action}'`);
          return false;
        }
      }
    }
    
    // Run custom validator if provided
    if (rule.validator) {
      try {
        return rule.validator(event);
      } catch (error) {
        console.error('VDO.ninja: Event validation error', error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: VdoEvent): void {
    this.eventHistory.push(event);
    
    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Update last event timestamp
    this.lastEventTimestamps.set(event.action, event.timestamp || Date.now());
  }

  /**
   * Check if an event should be throttled
   */
  private shouldThrottle(action: string): boolean {
    return this.throttleConfigs.has(action);
  }

  /**
   * Handle throttled event
   */
  private handleThrottledEvent(event: VdoEvent): void {
    const config = this.throttleConfigs.get(event.action);
    if (!config) {
      this.emit(event.action, event);
      this.emit('*', event);
      return;
    }
    
    // Initialize queue if needed
    if (!this.throttleQueues.has(event.action)) {
      this.throttleQueues.set(event.action, []);
    }
    
    const queue = this.throttleQueues.get(event.action)!;
    queue.push(event);
    
    // Check if we should process immediately (leading edge)
    if (config.leading && !this.throttleTimers.has(event.action)) {
      const firstEvent = queue.shift();
      if (firstEvent) {
        this.emit(firstEvent.action, firstEvent);
        this.emit('*', firstEvent);
      }
    }
    
    // Set up throttle timer if not already running
    if (!this.throttleTimers.has(event.action)) {
      const timer = setTimeout(() => {
        const events = this.throttleQueues.get(event.action) || [];
        this.throttleQueues.set(event.action, []);
        this.throttleTimers.delete(event.action);
        
        // Process queued events
        if (config.trailing && events.length > 0) {
          // Emit the last event if trailing is enabled
          const lastEvent = events[events.length - 1];
          this.emit(lastEvent.action, lastEvent);
          this.emit('*', lastEvent);
        } else if (config.maxEvents) {
          // Emit up to maxEvents
          events.slice(0, config.maxEvents).forEach(e => {
            this.emit(e.action, e);
            this.emit('*', e);
          });
        }
      }, config.interval);
      
      this.throttleTimers.set(event.action, timer);
    }
  }

  /**
   * Configure throttling for specific event types
   */
  setThrottle(action: string, config: ThrottleConfig): void {
    this.throttleConfigs.set(action, config);
  }

  /**
   * Remove throttling for an event type
   */
  removeThrottle(action: string): void {
    this.throttleConfigs.delete(action);
    
    // Clear any pending timer
    const timer = this.throttleTimers.get(action);
    if (timer) {
      clearTimeout(timer);
      this.throttleTimers.delete(action);
    }
    
    // Clear queue
    this.throttleQueues.delete(action);
  }

  /**
   * Set validation rule for an event type
   */
  setValidationRule(action: string, rule: EventValidationRule): void {
    this.validationRules.set(action, rule);
  }

  /**
   * Get current connection health
   */
  getConnectionHealth(): typeof this.connectionHealth {
    return { ...this.connectionHealth };
  }

  /**
   * Get active viewer count
   */
  getViewerCount(): number {
    return this.viewerCount;
  }

  /**
   * Get active viewers
   */
  getActiveViewers(): Map<string, { joinTime: number; userName?: string }> {
    return new Map(this.activeViewers);
  }

  /**
   * Get event history
   */
  getEventHistory(action?: string, limit?: number): VdoEvent[] {
    let history = [...this.eventHistory];
    
    if (action) {
      history = history.filter(e => e.action === action);
    }
    
    if (limit && limit > 0) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get last event timestamp for an action
   */
  getLastEventTime(action: string): number | undefined {
    return this.lastEventTimestamps.get(action);
  }
}

/**
 * Common VDO.ninja events
 */
export const VdoEvents = {
  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTION_FAILED: 'connectionFailed',
  CONNECTION_HEALTH_UPDATE: 'connectionHealthUpdate',
  CONNECTION_STATE_CHANGED: 'connectionStateChanged',
  NETWORK_QUALITY_CHANGED: 'networkQualityChanged',
  
  // Stream lifecycle events
  STREAM_STARTED: 'streamStarted',
  STREAM_STOPPED: 'streamStopped',
  STREAM_PAUSED: 'streamPaused',
  STREAM_RESUMED: 'streamResumed',
  STREAM_ADDED: 'streamAdded',
  STREAM_REMOVED: 'streamRemoved',
  
  // Viewer management events
  VIEWER_JOINED: 'viewerJoined',
  VIEWER_LEFT: 'viewerLeft',
  VIEWER_RECONNECTED: 'viewerReconnected',
  
  // Media events
  AUDIO_MUTED: 'audioMuted',
  AUDIO_UNMUTED: 'audioUnmuted',
  VIDEO_MUTED: 'videoMuted',
  VIDEO_UNMUTED: 'videoUnmuted',
  MEDIA_STATE_CHANGED: 'mediaStateChanged',
  
  // Quality events
  QUALITY_CHANGED: 'qualityChanged',
  BITRATE_CHANGED: 'bitrateChanged',
  RESOLUTION_CHANGED: 'resolutionChanged',
  FRAMERATE_CHANGED: 'framerateChanged',
  
  // Recording events
  RECORDING_STARTED: 'recordingStarted',
  RECORDING_STOPPED: 'recordingStopped',
  
  // Chat events
  CHAT_MESSAGE: 'chatMessage',
  
  // Error events
  ERROR: 'error',
  WARNING: 'warning',
  
  // Stats event
  STATS: 'stats',
  
  // Device events
  DEVICE_CHANGED: 'deviceChanged',
  DEVICES_ENUMERATED: 'devicesEnumerated',
  
  // Screen share events
  SCREENSHARE_STARTED: 'screenshareStarted',
  SCREENSHARE_STOPPED: 'screenshareStopped',
};

/**
 * Default throttle configurations for high-frequency events
 */
export const DefaultThrottleConfigs: Record<string, ThrottleConfig> = {
  stats: {
    interval: 1000, // Update stats at most once per second
    trailing: true
  },
  connectionHealthUpdate: {
    interval: 2000, // Health updates every 2 seconds max
    trailing: true
  },
  bitrateChanged: {
    interval: 500,
    trailing: true
  },
  audioLevel: {
    interval: 100, // Audio level updates 10 times per second max
    trailing: false,
    leading: true
  }
};

/**
 * Default validation rules for critical events
 */
export const DefaultValidationRules: Record<string, EventValidationRule> = {
  streamStarted: {
    action: 'streamStarted',
    required: ['streamId'],
    validator: (event) => {
      return typeof event.streamId === 'string' && event.streamId.length > 0;
    }
  },
  viewerJoined: {
    action: 'viewerJoined',
    required: ['viewerInfo'],
    validator: (event) => {
      const viewer = (event as ViewerEvent).viewerInfo;
      return viewer !== undefined && typeof viewer.viewerId === 'string';
    }
  },
  connectionStateChanged: {
    action: 'connectionStateChanged',
    required: ['health'],
    validator: (event) => {
      const health = (event as ConnectionHealthEvent).health;
      return health !== undefined && typeof health.state === 'string';
    }
  }
};