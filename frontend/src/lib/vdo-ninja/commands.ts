import { VdoCommand } from './types';

// Command response types
export interface CommandResponse {
  commandId: string;
  action: string;
  success: boolean;
  error?: string;
  data?: any;
  timestamp: number;
}

export interface CommandQueueItem {
  id: string;
  command: VdoCommand;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  callback?: (response: CommandResponse) => void;
}

export interface CommandValidationRule {
  action: string;
  validate: (command: VdoCommand) => boolean | string;
  sanitize?: (command: VdoCommand) => VdoCommand;
}

export interface CommandManagerConfig {
  queueEnabled: boolean;
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  offlineMode: boolean;
  validateCommands: boolean;
  responseTimeout: number;
}

/**
 * Enhanced command manager with queue and validation
 */
export class VdoCommandManager {
  private iframe: HTMLIFrameElement | null = null;
  private commandQueue: CommandQueueItem[] = [];
  private pendingResponses: Map<string, (response: CommandResponse) => void> = new Map();
  private validationRules: Map<string, CommandValidationRule> = new Map();
  private isOnline: boolean = true;
  private config: CommandManagerConfig;
  private queueTimer: NodeJS.Timeout | null = null;
  private responseListeners: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(config?: Partial<CommandManagerConfig>) {
    this.config = {
      queueEnabled: true,
      maxQueueSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      offlineMode: false,
      validateCommands: true,
      responseTimeout: 5000,
      ...config
    };
    
    this.setupDefaultValidationRules();
    this.setupMessageListener();
  }
  
  /**
   * Set the iframe reference
   */
  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
    
    // Process queued commands if we just got an iframe
    if (iframe && this.commandQueue.length > 0) {
      this.processQueue();
    }
  }
  
  /**
   * Send a command with optional queueing and response handling
   */
  async sendCommand(
    command: VdoCommand,
    options?: {
      priority?: CommandQueueItem['priority'];
      waitForResponse?: boolean;
      queueIfOffline?: boolean;
      skipValidation?: boolean;
    }
  ): Promise<CommandResponse | void> {
    const {
      priority = 'normal',
      waitForResponse = false,
      queueIfOffline = true,
      skipValidation = false
    } = options || {};
    
    // Validate command
    if (this.config.validateCommands && !skipValidation) {
      const validation = this.validateCommand(command);
      if (!validation.valid) {
        const response: CommandResponse = {
          commandId: this.generateCommandId(),
          action: command.action,
          success: false,
          error: validation.error,
          timestamp: Date.now()
        };
        
        if (waitForResponse) {
          return response;
        }
        
        console.error('VDO.ninja: Command validation failed', validation.error);
        return;
      }
      
      // Apply sanitization if available
      if (validation.sanitized) {
        command = validation.sanitized;
      }
    }
    
    // Check if we should queue the command
    if (this.shouldQueueCommand(queueIfOffline)) {
      const queueItem = this.addToQueue(command, priority);
      
      if (waitForResponse) {
        return this.waitForCommandResponse(queueItem);
      }
      
      return;
    }
    
    // Send command immediately
    const commandId = this.generateCommandId();
    const enhancedCommand = { ...command, commandId };
    
    this.sendCommandToIframe(enhancedCommand);
    
    if (waitForResponse) {
      return this.waitForResponse(commandId, command.action);
    }
  }
  
  /**
   * Send command directly to iframe
   */
  private sendCommandToIframe(command: VdoCommand & { commandId?: string }): void {
    if (!this.iframe || !this.iframe.contentWindow) {
      console.error('VDO.ninja: Invalid iframe reference');
      return;
    }
    
    try {
      this.iframe.contentWindow.postMessage(command, '*');
      console.log('VDO.ninja: Command sent', command.action, command.commandId);
    } catch (error) {
      console.error('VDO.ninja: Failed to send command', error);
      
      // Add to queue if send failed
      if (this.config.queueEnabled) {
        this.addToQueue(command, 'high');
      }
    }
  }
  
  /**
   * Check if command should be queued
   */
  private shouldQueueCommand(queueIfOffline: boolean): boolean {
    if (!this.config.queueEnabled) return false;
    if (!this.iframe) return true;
    if (this.config.offlineMode && queueIfOffline) return true;
    if (!this.isOnline && queueIfOffline) return true;
    
    return false;
  }
  
  /**
   * Add command to queue
   */
  private addToQueue(
    command: VdoCommand,
    priority: CommandQueueItem['priority'] = 'normal'
  ): CommandQueueItem {
    const queueItem: CommandQueueItem = {
      id: this.generateCommandId(),
      command,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.config.maxRetries,
      priority
    };
    
    // Add to queue based on priority
    if (priority === 'critical') {
      this.commandQueue.unshift(queueItem);
    } else if (priority === 'high') {
      const normalIndex = this.commandQueue.findIndex(item => 
        item.priority === 'normal' || item.priority === 'low'
      );
      if (normalIndex >= 0) {
        this.commandQueue.splice(normalIndex, 0, queueItem);
      } else {
        this.commandQueue.push(queueItem);
      }
    } else {
      this.commandQueue.push(queueItem);
    }
    
    // Enforce max queue size
    if (this.commandQueue.length > this.config.maxQueueSize) {
      // Remove lowest priority items from the end
      const removed = this.commandQueue.splice(
        this.config.maxQueueSize,
        this.commandQueue.length - this.config.maxQueueSize
      );
      console.warn(`VDO.ninja: Queue size exceeded, removed ${removed.length} commands`);
    }
    
    console.log(`VDO.ninja: Command queued (${this.commandQueue.length} in queue)`);
    
    // Schedule queue processing
    this.scheduleQueueProcessing();
    
    return queueItem;
  }
  
  /**
   * Process command queue
   */
  private processQueue(): void {
    if (!this.iframe || this.commandQueue.length === 0) {
      return;
    }
    
    // Process commands in batches
    const batchSize = 5;
    const batch = this.commandQueue.splice(0, batchSize);
    
    batch.forEach(item => {
      if (item.retries >= item.maxRetries) {
        console.error(`VDO.ninja: Command failed after ${item.retries} retries`, item.command);
        
        // Call callback with error if exists
        if (item.callback) {
          item.callback({
            commandId: item.id,
            action: item.command.action,
            success: false,
            error: 'Max retries exceeded',
            timestamp: Date.now()
          });
        }
        
        return;
      }
      
      // Send command
      const enhancedCommand = { ...item.command, commandId: item.id };
      this.sendCommandToIframe(enhancedCommand);
      
      // Handle retry logic
      if (this.config.queueEnabled) {
        setTimeout(() => {
          // Check if command was acknowledged (would be removed from pending)
          if (this.pendingResponses.has(item.id)) {
            // Command was not acknowledged, retry
            item.retries++;
            this.commandQueue.push(item);
            this.scheduleQueueProcessing();
          }
        }, this.config.responseTimeout);
      }
    });
    
    // Schedule next batch
    if (this.commandQueue.length > 0) {
      this.scheduleQueueProcessing();
    }
  }
  
  /**
   * Schedule queue processing
   */
  private scheduleQueueProcessing(): void {
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
    }
    
    this.queueTimer = setTimeout(() => {
      this.processQueue();
    }, this.config.retryDelay);
  }
  
  /**
   * Wait for command response
   */
  private async waitForCommandResponse(
    queueItem: CommandQueueItem
  ): Promise<CommandResponse> {
    return new Promise((resolve) => {
      queueItem.callback = resolve;
      
      // Set timeout for response
      const timeout = setTimeout(() => {
        resolve({
          commandId: queueItem.id,
          action: queueItem.command.action,
          success: false,
          error: 'Response timeout',
          timestamp: Date.now()
        });
      }, this.config.responseTimeout);
      
      // Store timeout to clear later
      this.responseListeners.set(queueItem.id, timeout);
    });
  }
  
  /**
   * Wait for response from iframe
   */
  private async waitForResponse(
    commandId: string,
    action: string
  ): Promise<CommandResponse> {
    return new Promise((resolve) => {
      this.pendingResponses.set(commandId, resolve);
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(commandId);
        resolve({
          commandId,
          action,
          success: false,
          error: 'Response timeout',
          timestamp: Date.now()
        });
      }, this.config.responseTimeout);
      
      this.responseListeners.set(commandId, timeout);
    });
  }
  
  /**
   * Setup message listener for responses
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      
      const { commandId, action, success, error, data } = event.data;
      
      // Check if this is a command response
      if (commandId && this.pendingResponses.has(commandId)) {
        const response: CommandResponse = {
          commandId,
          action,
          success: success !== false,
          error,
          data,
          timestamp: Date.now()
        };
        
        // Resolve waiting promise
        const resolver = this.pendingResponses.get(commandId);
        if (resolver) {
          resolver(response);
          this.pendingResponses.delete(commandId);
        }
        
        // Clear timeout
        const timeout = this.responseListeners.get(commandId);
        if (timeout) {
          clearTimeout(timeout);
          this.responseListeners.delete(commandId);
        }
      }
    });
  }
  
  /**
   * Validate command
   */
  private validateCommand(command: VdoCommand): {
    valid: boolean;
    error?: string;
    sanitized?: VdoCommand;
  } {
    const rule = this.validationRules.get(command.action);
    
    if (!rule) {
      // No validation rule, assume valid
      return { valid: true };
    }
    
    const result = rule.validate(command);
    
    if (typeof result === 'string') {
      return { valid: false, error: result };
    }
    
    if (!result) {
      return { valid: false, error: `Invalid command: ${command.action}` };
    }
    
    // Apply sanitization if available
    const sanitized = rule.sanitize ? rule.sanitize(command) : undefined;
    
    return { valid: true, sanitized };
  }
  
  /**
   * Setup default validation rules
   */
  private setupDefaultValidationRules(): void {
    // Volume validation
    this.validationRules.set('volume', {
      action: 'volume',
      validate: (cmd) => {
        if (typeof cmd.value !== 'number') return 'Volume must be a number';
        if (cmd.value < 0 || cmd.value > 100) return 'Volume must be between 0 and 100';
        return true;
      },
      sanitize: (cmd) => ({
        ...cmd,
        value: Math.max(0, Math.min(100, cmd.value as number))
      })
    });
    
    // Bitrate validation
    this.validationRules.set('bitrate', {
      action: 'bitrate',
      validate: (cmd) => {
        if (typeof cmd.value !== 'number') return 'Bitrate must be a number';
        if (cmd.value < 0) return 'Bitrate must be positive';
        if (cmd.value > 50000000) return 'Bitrate too high (max 50Mbps)';
        return true;
      }
    });
    
    // Quality validation
    this.validationRules.set('quality', {
      action: 'quality',
      validate: (cmd) => {
        if (typeof cmd.value !== 'number') return 'Quality must be a number';
        if (cmd.value < 0 || cmd.value > 100) return 'Quality must be between 0 and 100';
        return true;
      }
    });
    
    // Framerate validation
    this.validationRules.set('framerate', {
      action: 'framerate',
      validate: (cmd) => {
        if (typeof cmd.value !== 'number') return 'Framerate must be a number';
        if (cmd.value < 1 || cmd.value > 120) return 'Framerate must be between 1 and 120';
        return true;
      }
    });
    
    // Rotation validation
    this.validationRules.set('rotate', {
      action: 'rotate',
      validate: (cmd) => {
        if (typeof cmd.value !== 'number') return 'Rotation must be a number';
        return true;
      },
      sanitize: (cmd) => ({
        ...cmd,
        value: ((cmd.value as number) % 360 + 360) % 360
      })
    });
    
    // Chat message validation
    this.validationRules.set('sendChat', {
      action: 'sendChat',
      validate: (cmd) => {
        if (typeof cmd.value !== 'string') return 'Message must be a string';
        if (cmd.value.length > 500) return 'Message too long (max 500 chars)';
        return true;
      },
      sanitize: (cmd) => ({
        ...cmd,
        value: (cmd.value as string).trim().substring(0, 500)
      })
    });
    
    // Device ID validation
    this.validationRules.set('setCamera', {
      action: 'setCamera',
      validate: (cmd) => {
        if (typeof cmd.value !== 'string') return 'Device ID must be a string';
        if (!cmd.value) return 'Device ID cannot be empty';
        return true;
      }
    });
    
    this.validationRules.set('setMicrophone', {
      action: 'setMicrophone',
      validate: (cmd) => {
        if (typeof cmd.value !== 'string') return 'Device ID must be a string';
        if (!cmd.value) return 'Device ID cannot be empty';
        return true;
      }
    });
  }
  
  /**
   * Add custom validation rule
   */
  addValidationRule(rule: CommandValidationRule): void {
    this.validationRules.set(rule.action, rule);
  }
  
  /**
   * Set online/offline mode
   */
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    
    if (online && this.commandQueue.length > 0) {
      console.log('VDO.ninja: Back online, processing queued commands');
      this.processQueue();
    }
  }
  
  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    commands: CommandQueueItem[];
    isProcessing: boolean;
  } {
    return {
      size: this.commandQueue.length,
      commands: [...this.commandQueue],
      isProcessing: this.queueTimer !== null
    };
  }
  
  /**
   * Clear command queue
   */
  clearQueue(): void {
    this.commandQueue = [];
    
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
    
    // Clear pending responses
    this.pendingResponses.forEach((resolver, commandId) => {
      resolver({
        commandId,
        action: '',
        success: false,
        error: 'Queue cleared',
        timestamp: Date.now()
      });
    });
    this.pendingResponses.clear();
    
    // Clear response timeouts
    this.responseListeners.forEach(timeout => clearTimeout(timeout));
    this.responseListeners.clear();
  }
  
  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  /**
   * Cleanup
   */
  cleanup(): void {
    this.clearQueue();
    this.iframe = null;
    this.validationRules.clear();
  }
}

/**
 * Legacy send command function for backward compatibility
 */
export function sendCommand(
  iframe: HTMLIFrameElement | null,
  command: VdoCommand
): void {
  if (!iframe || !iframe.contentWindow) {
    console.error('VDO.ninja: Invalid iframe reference');
    return;
  }

  try {
    iframe.contentWindow.postMessage(command, '*');
  } catch (error) {
    console.error('VDO.ninja: Failed to send command', error);
  }
}

/**
 * Enhanced VDO.ninja commands with new additions
 */
export const VdoCommands = {
  // Stream control
  startStream: (): VdoCommand => ({
    action: 'start',
  }),

  stopStream: (): VdoCommand => ({
    action: 'stop',
  }),

  toggleStream: (): VdoCommand => ({
    action: 'toggle',
  }),
  
  pauseStream: (): VdoCommand => ({
    action: 'pause',
  }),
  
  resumeStream: (): VdoCommand => ({
    action: 'resume',
  }),

  // Audio control - Enhanced
  muteAudio: (): VdoCommand => ({
    action: 'mute',
  }),

  unmuteAudio: (): VdoCommand => ({
    action: 'unmute',
  }),

  toggleAudio: (): VdoCommand => ({
    action: 'toggleMute',
  }),

  setVolume: (volume: number): VdoCommand => ({
    action: 'volume',
    value: Math.max(0, Math.min(100, volume)),
  }),
  
  setAudioGain: (gain: number): VdoCommand => ({
    action: 'audioGain',
    value: Math.max(0, Math.min(200, gain)),
  }),
  
  enableNoiseSuppression: (enabled: boolean): VdoCommand => ({
    action: 'noiseSuppression',
    value: enabled,
  }),
  
  enableEchoCancellation: (enabled: boolean): VdoCommand => ({
    action: 'echoCancellation',
    value: enabled,
  }),
  
  enableAutoGainControl: (enabled: boolean): VdoCommand => ({
    action: 'autoGainControl',
    value: enabled,
  }),
  
  setStereoAudio: (stereo: boolean): VdoCommand => ({
    action: 'stereo',
    value: stereo,
  }),

  // Video control - Enhanced
  hideVideo: (): VdoCommand => ({
    action: 'hideVideo',
  }),

  showVideo: (): VdoCommand => ({
    action: 'showVideo',
  }),

  toggleVideo: (): VdoCommand => ({
    action: 'toggleVideo',
  }),
  
  disableVideo: (): VdoCommand => ({
    action: 'disableVideo',
  }),
  
  enableVideo: (): VdoCommand => ({
    action: 'enableVideo',
  }),
  
  setVideoConstraints: (constraints: {
    width?: number;
    height?: number;
    aspectRatio?: number;
    facingMode?: 'user' | 'environment';
  }): VdoCommand => ({
    action: 'videoConstraints',
    value: constraints,
  }),

  // Quality settings - Enhanced
  setBitrate: (bitrate: number): VdoCommand => ({
    action: 'bitrate',
    value: bitrate,
  }),

  setQuality: (quality: number): VdoCommand => ({
    action: 'quality',
    value: quality,
  }),

  setFramerate: (framerate: number): VdoCommand => ({
    action: 'framerate',
    value: framerate,
  }),
  
  setResolution: (width: number, height: number): VdoCommand => ({
    action: 'resolution',
    value: { width, height },
  }),
  
  setCodec: (codec: 'h264' | 'vp8' | 'vp9' | 'av1'): VdoCommand => ({
    action: 'codec',
    value: codec,
  }),
  
  setAudioCodec: (codec: 'opus' | 'pcmu' | 'pcma'): VdoCommand => ({
    action: 'audioCodec',
    value: codec,
  }),
  
  setAdaptiveBitrate: (enabled: boolean): VdoCommand => ({
    action: 'adaptiveBitrate',
    value: enabled,
  }),
  
  setMaxBitrate: (bitrate: number): VdoCommand => ({
    action: 'maxBitrate',
    value: bitrate,
  }),
  
  setMinBitrate: (bitrate: number): VdoCommand => ({
    action: 'minBitrate',
    value: bitrate,
  }),

  // Screen sharing - Enhanced
  startScreenShare: (): VdoCommand => ({
    action: 'screenshare',
    value: true,
  }),

  stopScreenShare: (): VdoCommand => ({
    action: 'screenshare',
    value: false,
  }),
  
  toggleScreenShare: (): VdoCommand => ({
    action: 'toggleScreenshare',
  }),
  
  setScreenShareQuality: (quality: 'low' | 'medium' | 'high' | 'max'): VdoCommand => ({
    action: 'screenshareQuality',
    value: quality,
  }),
  
  shareWindow: (): VdoCommand => ({
    action: 'shareWindow',
  }),
  
  shareTab: (): VdoCommand => ({
    action: 'shareTab',
  }),
  
  shareAudio: (enabled: boolean): VdoCommand => ({
    action: 'shareAudio',
    value: enabled,
  }),

  // Recording - Enhanced
  startRecording: (): VdoCommand => ({
    action: 'record',
    value: true,
  }),

  stopRecording: (): VdoCommand => ({
    action: 'record',
    value: false,
  }),
  
  toggleRecording: (): VdoCommand => ({
    action: 'toggleRecord',
  }),
  
  pauseRecording: (): VdoCommand => ({
    action: 'pauseRecord',
  }),
  
  resumeRecording: (): VdoCommand => ({
    action: 'resumeRecord',
  }),
  
  setRecordingQuality: (quality: 'low' | 'medium' | 'high' | 'max'): VdoCommand => ({
    action: 'recordQuality',
    value: quality,
  }),
  
  downloadRecording: (): VdoCommand => ({
    action: 'downloadRecord',
  }),

  // Camera control - Enhanced
  switchCamera: (): VdoCommand => ({
    action: 'switchCamera',
  }),

  setCamera: (deviceId: string): VdoCommand => ({
    action: 'setCamera',
    value: deviceId,
  }),
  
  flipCamera: (): VdoCommand => ({
    action: 'flipCamera',
  }),
  
  zoomCamera: (zoom: number): VdoCommand => ({
    action: 'zoom',
    value: zoom,
  }),
  
  focusCamera: (x: number, y: number): VdoCommand => ({
    action: 'focus',
    value: { x, y },
  }),
  
  setExposure: (exposure: number): VdoCommand => ({
    action: 'exposure',
    value: exposure,
  }),

  // Microphone control - Enhanced
  switchMicrophone: (): VdoCommand => ({
    action: 'switchMicrophone',
  }),

  setMicrophone: (deviceId: string): VdoCommand => ({
    action: 'setMicrophone',
    value: deviceId,
  }),
  
  setSpeaker: (deviceId: string): VdoCommand => ({
    action: 'setSpeaker',
    value: deviceId,
  }),

  // Effects - Enhanced
  setMirror: (mirror: boolean): VdoCommand => ({
    action: 'mirror',
    value: mirror,
  }),

  setRotation: (degrees: number): VdoCommand => ({
    action: 'rotate',
    value: degrees,
  }),
  
  setBlur: (enabled: boolean, strength?: number): VdoCommand => ({
    action: 'blur',
    value: enabled ? (strength || 10) : 0,
  }),
  
  setVirtualBackground: (imageUrl: string | null): VdoCommand => ({
    action: 'virtualBg',
    value: imageUrl,
  }),
  
  setBrightness: (level: number): VdoCommand => ({
    action: 'brightness',
    value: level,
  }),
  
  setContrast: (level: number): VdoCommand => ({
    action: 'contrast',
    value: level,
  }),
  
  setSaturation: (level: number): VdoCommand => ({
    action: 'saturation',
    value: level,
  }),
  
  setFilter: (filter: string | null): VdoCommand => ({
    action: 'filter',
    value: filter,
  }),

  // Chat - Enhanced
  sendChatMessage: (message: string): VdoCommand => ({
    action: 'sendChat',
    value: message,
  }),
  
  clearChat: (): VdoCommand => ({
    action: 'clearChat',
  }),
  
  setChatNickname: (nickname: string): VdoCommand => ({
    action: 'chatNickname',
    value: nickname,
  }),

  // Stats - Enhanced
  requestStats: (): VdoCommand => ({
    action: 'getStats',
  }),
  
  enableStats: (enabled: boolean): VdoCommand => ({
    action: 'showStats',
    value: enabled,
  }),
  
  getDeviceList: (): VdoCommand => ({
    action: 'enumerateDevices',
  }),

  // Connection - Enhanced
  reload: (): VdoCommand => ({
    action: 'reload',
  }),

  hangup: (): VdoCommand => ({
    action: 'hangup',
  }),
  
  reconnect: (): VdoCommand => ({
    action: 'reconnect',
  }),
  
  setReconnectAttempts: (attempts: number): VdoCommand => ({
    action: 'reconnectAttempts',
    value: attempts,
  }),
  
  setConnectionMode: (mode: 'p2p' | 'relay' | 'auto'): VdoCommand => ({
    action: 'connectionMode',
    value: mode,
  }),

  // Director controls - Enhanced
  addStreamToScene: (streamId: string): VdoCommand => ({
    action: 'addToScene',
    target: streamId,
  }),

  removeStreamFromScene: (streamId: string): VdoCommand => ({
    action: 'removeFromScene',
    target: streamId,
  }),

  soloStream: (streamId: string): VdoCommand => ({
    action: 'solo',
    target: streamId,
  }),

  highlightStream: (streamId: string): VdoCommand => ({
    action: 'highlight',
    target: streamId,
  }),

  muteStreamAudio: (streamId: string): VdoCommand => ({
    action: 'muteStream',
    target: streamId,
  }),
  
  unmuteStreamAudio: (streamId: string): VdoCommand => ({
    action: 'unmuteStream',
    target: streamId,
  }),

  hideStreamVideo: (streamId: string): VdoCommand => ({
    action: 'hideStreamVideo',
    target: streamId,
  }),
  
  showStreamVideo: (streamId: string): VdoCommand => ({
    action: 'showStreamVideo',
    target: streamId,
  }),
  
  setStreamVolume: (streamId: string, volume: number): VdoCommand => ({
    action: 'streamVolume',
    target: streamId,
    value: volume,
  }),
  
  setStreamLayout: (layout: 'grid' | 'focus' | 'pip' | 'side'): VdoCommand => ({
    action: 'layout',
    value: layout,
  }),
  
  moveStream: (streamId: string, position: { x: number; y: number }): VdoCommand => ({
    action: 'moveStream',
    target: streamId,
    value: position,
  }),
  
  resizeStream: (streamId: string, size: { width: number; height: number }): VdoCommand => ({
    action: 'resizeStream',
    target: streamId,
    value: size,
  }),
  
  // Advanced controls
  setBufferSize: (size: number): VdoCommand => ({
    action: 'bufferSize',
    value: size,
  }),
  
  setLatencyMode: (mode: 'ultra-low' | 'low' | 'normal' | 'safe'): VdoCommand => ({
    action: 'latencyMode',
    value: mode,
  }),
  
  setPacketLossRecovery: (enabled: boolean): VdoCommand => ({
    action: 'plr',
    value: enabled,
  }),
  
  setJitterBuffer: (size: number): VdoCommand => ({
    action: 'jitterBuffer',
    value: size,
  }),
  
  // Room management
  joinRoom: (roomId: string, password?: string): VdoCommand => ({
    action: 'joinRoom',
    value: { roomId, password },
  }),
  
  leaveRoom: (): VdoCommand => ({
    action: 'leaveRoom',
  }),
  
  lockRoom: (locked: boolean): VdoCommand => ({
    action: 'lockRoom',
    value: locked,
  }),
  
  kickUser: (userId: string): VdoCommand => ({
    action: 'kick',
    target: userId,
  }),
  
  // Permissions
  requestPermission: (permission: 'audio' | 'video' | 'screen'): VdoCommand => ({
    action: 'requestPermission',
    value: permission,
  }),
  
  // Custom command helper
  custom: (action: string, value?: any, target?: string): VdoCommand => ({
    action,
    value,
    target,
  }),
};