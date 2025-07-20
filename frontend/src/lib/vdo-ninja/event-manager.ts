import { VdoEvent, VdoStats } from './types';

export type VdoEventHandler = (event: VdoEvent) => void;
export type VdoStatsHandler = (stats: VdoStats) => void;

export class VdoEventManager {
  private eventHandlers: Map<string, Set<VdoEventHandler>> = new Map();
  private statsHandlers: Set<VdoStatsHandler> = new Set();
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private iframeRef: HTMLIFrameElement | null = null;

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

    const vdoEvent: VdoEvent = {
      action: data.action,
      value: data.value,
      streamId: data.streamId,
      target: data.target,
      stats: data.stats,
    };

    // Handle stats separately
    if (vdoEvent.action === 'stats' && vdoEvent.stats) {
      this.emitStats(vdoEvent.stats);
    }

    // Emit to specific action handlers
    this.emit(vdoEvent.action, vdoEvent);

    // Emit to wildcard handlers
    this.emit('*', vdoEvent);
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
   */
  private emit(action: string, event: VdoEvent): void {
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
  
  // Stream events
  STREAM_STARTED: 'streamStarted',
  STREAM_STOPPED: 'streamStopped',
  STREAM_ADDED: 'streamAdded',
  STREAM_REMOVED: 'streamRemoved',
  
  // Media events
  AUDIO_MUTED: 'audioMuted',
  AUDIO_UNMUTED: 'audioUnmuted',
  VIDEO_MUTED: 'videoMuted',
  VIDEO_UNMUTED: 'videoUnmuted',
  
  // Quality events
  QUALITY_CHANGED: 'qualityChanged',
  BITRATE_CHANGED: 'bitrateChanged',
  
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