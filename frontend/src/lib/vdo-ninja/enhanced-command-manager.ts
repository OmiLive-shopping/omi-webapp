import { Socket } from 'socket.io-client';
import { VdoCommand } from './types';
import { 
  VdoCommandManager, 
  CommandResponse, 
  CommandQueueItem,
  CommandManagerConfig 
} from './commands';
import { 
  VdoWebSocketFeedback, 
  VdoCommandEvent,
  VdoCommandAck,
  VdoCommandResult,
  VdoCommandError,
  VdoQueueUpdate,
  VdoPermissionRequest,
  VdoValidationError,
  vdoWebSocketFeedback 
} from './websocket-feedback';

/**
 * Enhanced VDO Command Manager with WebSocket integration
 * Extends the base command manager with real-time feedback capabilities
 */
export class EnhancedVdoCommandManager extends VdoCommandManager {
  private socket: Socket | null = null;
  private wsFeedback: VdoWebSocketFeedback;
  private acknowledgmentTimeout: number = 2000;
  private commandStartTimes: Map<string, number> = new Map();
  private permissionCallbacks: Map<string, (granted: boolean) => void> = new Map();
  
  constructor(config?: Partial<CommandManagerConfig>) {
    super(config);
    this.wsFeedback = vdoWebSocketFeedback;
    this.setupWebSocketListeners();
  }
  
  /**
   * Initialize with WebSocket connection
   */
  initializeWebSocket(socket: Socket): void {
    this.socket = socket;
    this.wsFeedback.initialize(socket);
    
    // Request initial status
    this.requestSystemStatus();
  }
  
  /**
   * Setup WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    // Listen for command acknowledgments
    this.wsFeedback.on('vdo:command:acknowledged', (ack: VdoCommandAck) => {
      this.handleCommandAcknowledgment(ack);
    });
    
    // Listen for command completion
    this.wsFeedback.on('vdo:command:completed', (result: VdoCommandResult) => {
      this.handleCommandCompletion(result);
    });
    
    // Listen for command errors
    this.wsFeedback.on('vdo:command:failed', (error: VdoCommandError) => {
      this.handleCommandError(error);
    });
    
    // Listen for queue updates
    this.wsFeedback.on('vdo:queue:added', (update: VdoQueueUpdate) => {
      this.handleQueueAdded(update);
    });
    
    this.wsFeedback.on('vdo:queue:processed', (update: VdoQueueUpdate) => {
      this.handleQueueProcessed(update);
    });
    
    // Listen for permission requests
    this.wsFeedback.on('vdo:permission:required', (request: VdoPermissionRequest) => {
      this.handlePermissionRequest(request);
    });
    
    // Listen for validation errors
    this.wsFeedback.on('vdo:validation:error', (error: VdoValidationError) => {
      this.handleValidationError(error);
    });
  }
  
  /**
   * Send command with WebSocket feedback
   */
  async sendCommand(
    command: VdoCommand,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      waitForResponse?: boolean;
      queueIfOffline?: boolean;
      skipValidation?: boolean;
      trackMetrics?: boolean;
      requireAcknowledgment?: boolean;
    }
  ): Promise<CommandResponse | void> {
    const {
      priority = 'normal',
      waitForResponse = false,
      requireAcknowledgment = true,
      trackMetrics = true
    } = options || {};
    
    // Generate command ID for tracking
    const commandId = this.wsFeedback.sendCommandWithFeedback(command, {
      priority,
      source: 'user',
      trackMetrics
    });
    
    // Store start time for performance tracking
    this.commandStartTimes.set(commandId, Date.now());
    
    // Send command through parent class
    const basePromise = super.sendCommand(command, options);
    
    // If acknowledgment is required, wait for it
    if (requireAcknowledgment && this.socket?.connected) {
      const ackPromise = this.waitForAcknowledgment(commandId);
      
      // Race between acknowledgment timeout and actual acknowledgment
      const ackReceived = await Promise.race([
        ackPromise,
        this.createTimeoutPromise(this.acknowledgmentTimeout, false)
      ]);
      
      if (!ackReceived) {
        console.warn(`Command ${commandId} not acknowledged within ${this.acknowledgmentTimeout}ms`);
        // Emit warning event
        this.wsFeedback.on('vdo:validation:warning', {
          commandId,
          action: command.action,
          warning: 'Command acknowledgment timeout',
          suggestion: 'Check connection quality or retry',
          timestamp: Date.now()
        } as any);
      }
    }
    
    // Wait for response if requested
    if (waitForResponse) {
      return await this.waitForCommandResult(commandId, command.action);
    }
    
    return basePromise;
  }
  
  /**
   * Wait for command acknowledgment
   */
  private waitForAcknowledgment(commandId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (ack: VdoCommandAck) => {
        if (ack.commandId === commandId) {
          this.wsFeedback.off('vdo:command:acknowledged', handler);
          resolve(ack.acknowledged);
        }
      };
      
      this.wsFeedback.on('vdo:command:acknowledged', handler);
    });
  }
  
  /**
   * Wait for command result
   */
  private waitForCommandResult(commandId: string, action: string): Promise<CommandResponse> {
    return new Promise((resolve) => {
      let resolved = false;
      
      // Success handler
      const successHandler = (result: VdoCommandResult) => {
        if (result.commandId === commandId && !resolved) {
          resolved = true;
          this.wsFeedback.off('vdo:command:completed', successHandler);
          this.wsFeedback.off('vdo:command:failed', errorHandler);
          
          resolve({
            commandId,
            action,
            success: true,
            data: result.result,
            timestamp: result.timestamp
          });
        }
      };
      
      // Error handler
      const errorHandler = (error: VdoCommandError) => {
        if (error.commandId === commandId && !resolved) {
          resolved = true;
          this.wsFeedback.off('vdo:command:completed', successHandler);
          this.wsFeedback.off('vdo:command:failed', errorHandler);
          
          resolve({
            commandId,
            action,
            success: false,
            error: error.error,
            timestamp: error.timestamp
          });
        }
      };
      
      this.wsFeedback.on('vdo:command:completed', successHandler);
      this.wsFeedback.on('vdo:command:failed', errorHandler);
      
      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.wsFeedback.off('vdo:command:completed', successHandler);
          this.wsFeedback.off('vdo:command:failed', errorHandler);
          
          resolve({
            commandId,
            action,
            success: false,
            error: 'Command result timeout',
            timestamp: Date.now()
          });
        }
      }, this.config.responseTimeout);
    });
  }
  
  /**
   * Handle command acknowledgment
   */
  private handleCommandAcknowledgment(ack: VdoCommandAck): void {
    const startTime = this.commandStartTimes.get(ack.commandId);
    if (startTime) {
      const latency = Date.now() - startTime;
      console.debug(`Command ${ack.action} acknowledged in ${latency}ms`);
    }
  }
  
  /**
   * Handle command completion
   */
  private handleCommandCompletion(result: VdoCommandResult): void {
    const startTime = this.commandStartTimes.get(result.commandId);
    if (startTime) {
      const totalTime = Date.now() - startTime;
      console.debug(`Command ${result.action} completed in ${totalTime}ms (execution: ${result.executionTime}ms)`);
      this.commandStartTimes.delete(result.commandId);
    }
  }
  
  /**
   * Handle command error
   */
  private handleCommandError(error: VdoCommandError): void {
    console.error(`Command ${error.action} failed:`, error.error);
    
    if (error.recoverable && error.suggestion) {
      console.info(`Recovery suggestion: ${error.suggestion}`);
      
      // Attempt auto-recovery for certain errors
      if (error.code === 'PERMISSION_REQUIRED') {
        this.requestPermission(error.commandId, error.action);
      } else if (error.code === 'OFFLINE' && this.config.queueEnabled) {
        console.info('Command will be retried when connection is restored');
      }
    }
    
    this.commandStartTimes.delete(error.commandId);
  }
  
  /**
   * Handle queue added event
   */
  private handleQueueAdded(update: VdoQueueUpdate): void {
    console.debug(`Command ${update.action} added to queue at position ${update.position}`);
    
    if (update.estimatedProcessingTime) {
      console.debug(`Estimated processing time: ${update.estimatedProcessingTime}ms`);
    }
  }
  
  /**
   * Handle queue processed event
   */
  private handleQueueProcessed(update: VdoQueueUpdate): void {
    console.debug(`Command ${update.action} processed from queue`);
  }
  
  /**
   * Handle permission request
   */
  private handlePermissionRequest(request: VdoPermissionRequest): void {
    console.info(`Permission required: ${request.permission} - ${request.reason}`);
    
    // Store callback if command is waiting
    if (request.commandId) {
      // In a real application, you would show a UI prompt here
      // For now, we'll auto-grant for testing
      setTimeout(() => {
        this.wsFeedback.on('vdo:permission:granted', {
          permission: request.permission,
          granted: true,
          persistent: false,
          timestamp: Date.now()
        } as any);
        
        const callback = this.permissionCallbacks.get(request.commandId);
        if (callback) {
          callback(true);
          this.permissionCallbacks.delete(request.commandId);
        }
      }, 100);
    }
  }
  
  /**
   * Handle validation error
   */
  private handleValidationError(error: VdoValidationError): void {
    console.error(`Validation error for ${error.action}:`, error.error);
    
    if (error.field) {
      console.error(`Field: ${error.field}, Expected: ${error.expected}, Received: ${error.received}`);
    }
  }
  
  /**
   * Request permission for a command
   */
  private requestPermission(commandId: string, action: string): void {
    // Determine which permission is needed based on action
    let permission: string;
    
    if (action.includes('camera') || action.includes('video')) {
      permission = 'camera';
    } else if (action.includes('audio') || action.includes('microphone')) {
      permission = 'microphone';
    } else if (action.includes('screen') || action.includes('share')) {
      permission = 'screen';
    } else {
      return;
    }
    
    // Request permission through WebSocket
    if (this.socket) {
      this.socket.emit('vdo:permission:request', { 
        permission, 
        commandId,
        action 
      });
    }
  }
  
  /**
   * Request system status
   */
  private requestSystemStatus(): void {
    if (!this.socket) return;
    
    // Request queue status
    this.socket.emit('vdo:queue:status');
    
    // Request permission status
    this.socket.emit('vdo:permission:status');
    
    // Request connection status
    this.socket.emit('vdo:connection:status');
  }
  
  /**
   * Get help for a command
   */
  async getCommandHelp(command?: string, category?: string): Promise<void> {
    this.wsFeedback.requestHelp(command, category);
  }
  
  /**
   * Get current queue status
   */
  getQueueStatus() {
    return this.wsFeedback.getQueueStatus();
  }
  
  /**
   * Get permission status
   */
  getPermissionStatus() {
    return this.wsFeedback.getPermissionStatus();
  }
  
  /**
   * Get command metrics
   */
  getMetrics() {
    return this.wsFeedback.getMetrics();
  }
  
  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(ms: number, value: T): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), ms));
  }
  
  /**
   * Clear all tracking data
   */
  clear(): void {
    super.clear();
    this.commandStartTimes.clear();
    this.permissionCallbacks.clear();
    this.wsFeedback.clear();
  }
}

// Export singleton instance
export const enhancedVdoCommandManager = new EnhancedVdoCommandManager({
  queueEnabled: true,
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  offlineMode: true,
  validateCommands: true,
  responseTimeout: 10000
});