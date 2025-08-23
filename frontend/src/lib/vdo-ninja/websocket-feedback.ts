import { Socket } from 'socket.io-client';
import { VdoCommand, VdoEvent } from './types';
import { CommandResponse, CommandQueueItem } from './commands';

/**
 * WebSocket event types for VDO.Ninja command feedback
 */
export interface VdoWebSocketEvents {
  // Command acknowledgment events
  'vdo:command:sent': (data: VdoCommandEvent) => void;
  'vdo:command:acknowledged': (data: VdoCommandAck) => void;
  'vdo:command:completed': (data: VdoCommandResult) => void;
  'vdo:command:failed': (data: VdoCommandError) => void;
  
  // Command queue events
  'vdo:queue:added': (data: VdoQueueUpdate) => void;
  'vdo:queue:processed': (data: VdoQueueUpdate) => void;
  'vdo:queue:status': (data: VdoQueueStatus) => void;
  'vdo:queue:cleared': (data: { reason: string; timestamp: number }) => void;
  
  // Permission events
  'vdo:permission:required': (data: VdoPermissionRequest) => void;
  'vdo:permission:granted': (data: VdoPermissionResult) => void;
  'vdo:permission:denied': (data: VdoPermissionResult) => void;
  'vdo:permission:status': (data: VdoPermissionStatus) => void;
  
  // Help system events
  'vdo:help:request': (data: { command?: string; category?: string }) => void;
  'vdo:help:response': (data: VdoHelpResponse) => void;
  'vdo:help:categories': (data: VdoHelpCategories) => void;
  
  // Connection status events
  'vdo:connection:status': (data: VdoConnectionStatus) => void;
  'vdo:connection:quality': (data: VdoConnectionQuality) => void;
  
  // Validation feedback
  'vdo:validation:error': (data: VdoValidationError) => void;
  'vdo:validation:warning': (data: VdoValidationWarning) => void;
}

/**
 * Event data structures
 */
export interface VdoCommandEvent {
  commandId: string;
  action: string;
  params?: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  source: 'user' | 'system' | 'automation';
}

export interface VdoCommandAck {
  commandId: string;
  action: string;
  acknowledged: boolean;
  processingTime: number;
  timestamp: number;
}

export interface VdoCommandResult {
  commandId: string;
  action: string;
  success: boolean;
  result?: any;
  executionTime: number;
  timestamp: number;
}

export interface VdoCommandError {
  commandId: string;
  action: string;
  error: string;
  code: string;
  recoverable: boolean;
  suggestion?: string;
  timestamp: number;
}

export interface VdoQueueUpdate {
  commandId: string;
  action: string;
  position: number;
  queueLength: number;
  estimatedProcessingTime?: number;
  timestamp: number;
}

export interface VdoQueueStatus {
  queueLength: number;
  processing: boolean;
  offlineMode: boolean;
  pendingCommands: Array<{
    id: string;
    action: string;
    priority: string;
    retries: number;
  }>;
  processedCount: number;
  failedCount: number;
  timestamp: number;
}

export interface VdoPermissionRequest {
  permission: 'camera' | 'microphone' | 'screen' | 'speakers';
  required: boolean;
  reason: string;
  commandId?: string;
  timestamp: number;
}

export interface VdoPermissionResult {
  permission: string;
  granted: boolean;
  persistent: boolean;
  timestamp: number;
}

export interface VdoPermissionStatus {
  camera: 'granted' | 'denied' | 'prompt';
  microphone: 'granted' | 'denied' | 'prompt';
  screen: 'granted' | 'denied' | 'prompt';
  speakers: 'granted' | 'denied' | 'prompt';
  timestamp: number;
}

export interface VdoHelpResponse {
  command?: string;
  category?: string;
  description: string;
  syntax?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: any;
  }>;
  examples?: string[];
  relatedCommands?: string[];
  permissions?: string[];
  availability?: {
    browser: string[];
    mobile: boolean;
    desktop: boolean;
  };
}

export interface VdoHelpCategories {
  categories: Array<{
    name: string;
    description: string;
    commands: string[];
    icon?: string;
  }>;
  totalCommands: number;
  version: string;
}

export interface VdoConnectionStatus {
  connected: boolean;
  connectionId?: string;
  roomId?: string;
  streamId?: string;
  role: 'host' | 'viewer' | 'director';
  uptime?: number;
  reconnectAttempts: number;
  timestamp: number;
}

export interface VdoConnectionQuality {
  bitrate: number;
  framerate: number;
  resolution: string;
  packetLoss: number;
  latency: number;
  jitter: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  suggestions?: string[];
  timestamp: number;
}

export interface VdoValidationError {
  commandId: string;
  action: string;
  field?: string;
  error: string;
  expected?: any;
  received?: any;
  timestamp: number;
}

export interface VdoValidationWarning {
  commandId: string;
  action: string;
  warning: string;
  suggestion?: string;
  timestamp: number;
}

/**
 * VDO WebSocket Feedback Manager
 * Provides real-time feedback for VDO.Ninja commands through WebSocket
 */
export class VdoWebSocketFeedback {
  private socket: Socket | null = null;
  private commandTracking: Map<string, VdoCommandEvent> = new Map();
  private queueStatus: VdoQueueStatus | null = null;
  private permissionCache: Map<string, string> = new Map();
  private helpCache: Map<string, VdoHelpResponse> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private metricsCollector: CommandMetricsCollector;
  
  constructor() {
    this.metricsCollector = new CommandMetricsCollector();
  }
  
  /**
   * Initialize with socket connection
   */
  initialize(socket: Socket): void {
    this.socket = socket;
    this.setupSocketListeners();
    this.requestInitialStatus();
  }
  
  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;
    
    // Listen for command responses from server
    this.socket.on('vdo:command:response', (data: any) => {
      this.handleCommandResponse(data);
    });
    
    // Listen for queue updates
    this.socket.on('vdo:queue:update', (data: any) => {
      this.handleQueueUpdate(data);
    });
    
    // Listen for permission events
    this.socket.on('vdo:permission:update', (data: any) => {
      this.handlePermissionUpdate(data);
    });
    
    // Listen for connection quality updates
    this.socket.on('vdo:connection:metrics', (data: any) => {
      this.handleConnectionMetrics(data);
    });
  }
  
  /**
   * Send command with WebSocket feedback
   */
  sendCommandWithFeedback(command: VdoCommand, options?: {
    priority?: 'low' | 'normal' | 'high' | 'critical';
    source?: 'user' | 'system' | 'automation';
    trackMetrics?: boolean;
  }): string {
    const commandId = this.generateCommandId();
    const commandEvent: VdoCommandEvent = {
      commandId,
      action: command.action,
      params: command,
      timestamp: Date.now(),
      priority: options?.priority || 'normal',
      source: options?.source || 'user'
    };
    
    // Track command
    this.commandTracking.set(commandId, commandEvent);
    
    // Emit command sent event
    this.emitSocketEvent('vdo:command:sent', commandEvent);
    
    // Track metrics if requested
    if (options?.trackMetrics) {
      this.metricsCollector.startTracking(commandId, command.action);
    }
    
    return commandId;
  }
  
  /**
   * Handle command response
   */
  private handleCommandResponse(data: any): void {
    const { commandId, success, error, result, executionTime } = data;
    const command = this.commandTracking.get(commandId);
    
    if (!command) return;
    
    if (success) {
      const result: VdoCommandResult = {
        commandId,
        action: command.action,
        success: true,
        result: result,
        executionTime: executionTime || 0,
        timestamp: Date.now()
      };
      this.emitSocketEvent('vdo:command:completed', result);
      this.metricsCollector.recordSuccess(commandId, executionTime);
    } else {
      const error: VdoCommandError = {
        commandId,
        action: command.action,
        error: error.message || 'Command failed',
        code: error.code || 'UNKNOWN_ERROR',
        recoverable: error.recoverable !== false,
        suggestion: error.suggestion,
        timestamp: Date.now()
      };
      this.emitSocketEvent('vdo:command:failed', error);
      this.metricsCollector.recordFailure(commandId, error.code);
    }
    
    // Clean up tracking
    this.commandTracking.delete(commandId);
  }
  
  /**
   * Handle queue updates
   */
  private handleQueueUpdate(data: any): void {
    if (data.type === 'status') {
      this.queueStatus = {
        queueLength: data.queueLength,
        processing: data.processing,
        offlineMode: data.offlineMode,
        pendingCommands: data.pendingCommands || [],
        processedCount: data.processedCount || 0,
        failedCount: data.failedCount || 0,
        timestamp: Date.now()
      };
      this.emitSocketEvent('vdo:queue:status', this.queueStatus);
    } else if (data.type === 'added') {
      const update: VdoQueueUpdate = {
        commandId: data.commandId,
        action: data.action,
        position: data.position,
        queueLength: data.queueLength,
        estimatedProcessingTime: data.estimatedTime,
        timestamp: Date.now()
      };
      this.emitSocketEvent('vdo:queue:added', update);
    } else if (data.type === 'processed') {
      const update: VdoQueueUpdate = {
        commandId: data.commandId,
        action: data.action,
        position: 0,
        queueLength: data.queueLength,
        timestamp: Date.now()
      };
      this.emitSocketEvent('vdo:queue:processed', update);
    }
  }
  
  /**
   * Handle permission updates
   */
  private handlePermissionUpdate(data: any): void {
    if (data.type === 'request') {
      const request: VdoPermissionRequest = {
        permission: data.permission,
        required: data.required,
        reason: data.reason,
        commandId: data.commandId,
        timestamp: Date.now()
      };
      this.emitSocketEvent('vdo:permission:required', request);
    } else if (data.type === 'result') {
      const result: VdoPermissionResult = {
        permission: data.permission,
        granted: data.granted,
        persistent: data.persistent || false,
        timestamp: Date.now()
      };
      
      // Cache permission result
      this.permissionCache.set(data.permission, data.granted ? 'granted' : 'denied');
      
      if (data.granted) {
        this.emitSocketEvent('vdo:permission:granted', result);
      } else {
        this.emitSocketEvent('vdo:permission:denied', result);
      }
    }
  }
  
  /**
   * Handle connection metrics
   */
  private handleConnectionMetrics(data: any): void {
    const quality: VdoConnectionQuality = {
      bitrate: data.bitrate || 0,
      framerate: data.framerate || 0,
      resolution: data.resolution || 'unknown',
      packetLoss: data.packetLoss || 0,
      latency: data.latency || 0,
      jitter: data.jitter || 0,
      quality: this.calculateQuality(data),
      suggestions: this.generateQualitySuggestions(data),
      timestamp: Date.now()
    };
    
    this.emitSocketEvent('vdo:connection:quality', quality);
  }
  
  /**
   * Request help for a command
   */
  requestHelp(command?: string, category?: string): void {
    const cacheKey = `${command || ''}_${category || ''}`;
    
    // Check cache first
    if (this.helpCache.has(cacheKey)) {
      this.emitSocketEvent('vdo:help:response', this.helpCache.get(cacheKey)!);
      return;
    }
    
    // Request from server
    if (this.socket) {
      this.socket.emit('vdo:help:request', { command, category });
      this.emitSocketEvent('vdo:help:request', { command, category });
    }
  }
  
  /**
   * Get command queue status
   */
  getQueueStatus(): VdoQueueStatus | null {
    return this.queueStatus;
  }
  
  /**
   * Get permission status
   */
  getPermissionStatus(): VdoPermissionStatus {
    return {
      camera: (this.permissionCache.get('camera') || 'prompt') as any,
      microphone: (this.permissionCache.get('microphone') || 'prompt') as any,
      screen: (this.permissionCache.get('screen') || 'prompt') as any,
      speakers: (this.permissionCache.get('speakers') || 'prompt') as any,
      timestamp: Date.now()
    };
  }
  
  /**
   * Request initial status
   */
  private requestInitialStatus(): void {
    if (!this.socket) return;
    
    // Request queue status
    this.socket.emit('vdo:queue:status:request');
    
    // Request permission status
    this.socket.emit('vdo:permission:status:request');
    
    // Request help categories
    this.socket.emit('vdo:help:categories:request');
  }
  
  /**
   * Emit socket event to local listeners
   */
  private emitSocketEvent(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
    
    // Notify local listeners
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
  
  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Calculate connection quality
   */
  private calculateQuality(metrics: any): 'excellent' | 'good' | 'fair' | 'poor' {
    const { bitrate, framerate, packetLoss, latency } = metrics;
    
    if (packetLoss > 5 || latency > 200) return 'poor';
    if (packetLoss > 2 || latency > 100 || bitrate < 1000000) return 'fair';
    if (packetLoss > 0.5 || latency > 50 || bitrate < 2000000) return 'good';
    return 'excellent';
  }
  
  /**
   * Generate quality improvement suggestions
   */
  private generateQualitySuggestions(metrics: any): string[] {
    const suggestions: string[] = [];
    
    if (metrics.packetLoss > 2) {
      suggestions.push('High packet loss detected. Check your network connection.');
    }
    if (metrics.latency > 100) {
      suggestions.push('High latency detected. Consider using a wired connection.');
    }
    if (metrics.bitrate < 1000000) {
      suggestions.push('Low bitrate. Consider reducing video quality settings.');
    }
    if (metrics.framerate < 24) {
      suggestions.push('Low framerate. Consider reducing resolution or CPU usage.');
    }
    
    return suggestions;
  }
  
  /**
   * Get command metrics
   */
  getMetrics(): CommandMetrics {
    return this.metricsCollector.getMetrics();
  }
  
  /**
   * Clear all data
   */
  clear(): void {
    this.commandTracking.clear();
    this.permissionCache.clear();
    this.helpCache.clear();
    this.listeners.clear();
    this.metricsCollector.clear();
    this.queueStatus = null;
  }
}

/**
 * Command metrics collector
 */
class CommandMetricsCollector {
  private metrics: Map<string, CommandMetric> = new Map();
  private aggregateMetrics: AggregateMetrics;
  
  constructor() {
    this.aggregateMetrics = {
      totalCommands: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      commandCounts: new Map(),
      errorCounts: new Map()
    };
  }
  
  startTracking(commandId: string, action: string): void {
    this.metrics.set(commandId, {
      commandId,
      action,
      startTime: Date.now(),
      endTime: 0,
      success: false,
      error: null,
      executionTime: 0
    });
  }
  
  recordSuccess(commandId: string, executionTime: number): void {
    const metric = this.metrics.get(commandId);
    if (metric) {
      metric.success = true;
      metric.executionTime = executionTime;
      metric.endTime = Date.now();
      
      // Update aggregate metrics
      this.aggregateMetrics.totalCommands++;
      this.aggregateMetrics.successCount++;
      this.updateCommandCount(metric.action);
      this.updateAverageExecutionTime(executionTime);
    }
  }
  
  recordFailure(commandId: string, errorCode: string): void {
    const metric = this.metrics.get(commandId);
    if (metric) {
      metric.success = false;
      metric.error = errorCode;
      metric.endTime = Date.now();
      metric.executionTime = metric.endTime - metric.startTime;
      
      // Update aggregate metrics
      this.aggregateMetrics.totalCommands++;
      this.aggregateMetrics.failureCount++;
      this.updateCommandCount(metric.action);
      this.updateErrorCount(errorCode);
    }
  }
  
  private updateCommandCount(action: string): void {
    const count = this.aggregateMetrics.commandCounts.get(action) || 0;
    this.aggregateMetrics.commandCounts.set(action, count + 1);
  }
  
  private updateErrorCount(errorCode: string): void {
    const count = this.aggregateMetrics.errorCounts.get(errorCode) || 0;
    this.aggregateMetrics.errorCounts.set(errorCode, count + 1);
  }
  
  private updateAverageExecutionTime(time: number): void {
    const total = this.aggregateMetrics.averageExecutionTime * (this.aggregateMetrics.successCount - 1);
    this.aggregateMetrics.averageExecutionTime = (total + time) / this.aggregateMetrics.successCount;
  }
  
  getMetrics(): CommandMetrics {
    return {
      commands: Array.from(this.metrics.values()),
      aggregate: this.aggregateMetrics,
      timestamp: Date.now()
    };
  }
  
  clear(): void {
    this.metrics.clear();
    this.aggregateMetrics = {
      totalCommands: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      commandCounts: new Map(),
      errorCounts: new Map()
    };
  }
}

/**
 * Metric interfaces
 */
interface CommandMetric {
  commandId: string;
  action: string;
  startTime: number;
  endTime: number;
  success: boolean;
  error: string | null;
  executionTime: number;
}

interface AggregateMetrics {
  totalCommands: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  commandCounts: Map<string, number>;
  errorCounts: Map<string, number>;
}

interface CommandMetrics {
  commands: CommandMetric[];
  aggregate: AggregateMetrics;
  timestamp: number;
}

// Export singleton instance
export const vdoWebSocketFeedback = new VdoWebSocketFeedback();