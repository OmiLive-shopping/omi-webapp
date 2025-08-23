import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { enhancedVdoCommandManager } from '@/lib/vdo-ninja/enhanced-command-manager';
import { vdoWebSocketFeedback } from '@/lib/vdo-ninja/websocket-feedback';
import { vdoCommandHelp } from '@/lib/vdo-ninja/command-help-system';
import { VdoCommand } from '@/lib/vdo-ninja/types';
import {
  VdoCommandEvent,
  VdoCommandResult,
  VdoCommandError,
  VdoQueueStatus,
  VdoPermissionStatus,
  VdoConnectionQuality,
  VdoHelpResponse
} from '@/lib/vdo-ninja/websocket-feedback';

/**
 * Hook state interface
 */
interface VdoWebSocketFeedbackState {
  isConnected: boolean;
  queueStatus: VdoQueueStatus | null;
  permissionStatus: VdoPermissionStatus | null;
  connectionQuality: VdoConnectionQuality | null;
  lastCommand: VdoCommandEvent | null;
  lastResult: VdoCommandResult | null;
  lastError: VdoCommandError | null;
  metrics: {
    totalCommands: number;
    successCount: number;
    failureCount: number;
    averageExecutionTime: number;
  };
  pendingCommands: Map<string, VdoCommandEvent>;
}

/**
 * Hook return interface
 */
interface UseVdoWebSocketFeedbackReturn {
  // State
  isConnected: boolean;
  queueStatus: VdoQueueStatus | null;
  permissionStatus: VdoPermissionStatus | null;
  connectionQuality: VdoConnectionQuality | null;
  metrics: VdoWebSocketFeedbackState['metrics'];
  pendingCommands: VdoCommandEvent[];
  
  // Command methods
  sendCommand: (
    command: VdoCommand,
    options?: SendCommandOptions
  ) => Promise<void | VdoCommandResult>;
  sendCommandWithTracking: (
    command: VdoCommand,
    options?: SendCommandOptions
  ) => Promise<string>;
  cancelCommand: (commandId: string) => void;
  
  // Queue methods
  getQueuePosition: (commandId: string) => number;
  clearQueue: () => void;
  
  // Help methods
  getHelp: (command?: string, category?: string) => Promise<VdoHelpResponse | null>;
  searchCommands: (query: string) => any[];
  getQuickReference: () => string;
  
  // Permission methods
  requestPermission: (permission: string) => Promise<boolean>;
  checkPermission: (permission: string) => 'granted' | 'denied' | 'prompt';
  
  // Utility methods
  getCommandStatus: (commandId: string) => 'pending' | 'processing' | 'completed' | 'failed' | null;
  getLastError: () => VdoCommandError | null;
  clearMetrics: () => void;
}

interface SendCommandOptions {
  priority?: 'low' | 'normal' | 'high' | 'critical';
  waitForResponse?: boolean;
  requireAcknowledgment?: boolean;
  trackMetrics?: boolean;
  queueIfOffline?: boolean;
}

/**
 * React hook for VDO.Ninja WebSocket feedback integration
 */
export function useVdoWebSocketFeedback(
  socket: Socket | null,
  iframe?: HTMLIFrameElement | null
): UseVdoWebSocketFeedbackReturn {
  const [state, setState] = useState<VdoWebSocketFeedbackState>({
    isConnected: false,
    queueStatus: null,
    permissionStatus: null,
    connectionQuality: null,
    lastCommand: null,
    lastResult: null,
    lastError: null,
    metrics: {
      totalCommands: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0
    },
    pendingCommands: new Map()
  });
  
  const commandStatusMap = useRef<Map<string, string>>(new Map());
  const permissionCallbacks = useRef<Map<string, (granted: boolean) => void>>(new Map());
  
  // Initialize WebSocket feedback when socket is available
  useEffect(() => {
    if (!socket) return;
    
    // Initialize the enhanced command manager with socket
    enhancedVdoCommandManager.initializeWebSocket(socket);
    
    // Set iframe if available
    if (iframe) {
      enhancedVdoCommandManager.setIframe(iframe);
    }
    
    setState(prev => ({ ...prev, isConnected: true }));
    
    // Setup event listeners
    const handleCommandSent = (event: VdoCommandEvent) => {
      setState(prev => ({
        ...prev,
        lastCommand: event,
        pendingCommands: new Map(prev.pendingCommands).set(event.commandId, event),
        metrics: {
          ...prev.metrics,
          totalCommands: prev.metrics.totalCommands + 1
        }
      }));
      commandStatusMap.current.set(event.commandId, 'pending');
    };
    
    const handleCommandCompleted = (result: VdoCommandResult) => {
      setState(prev => {
        const pendingCommands = new Map(prev.pendingCommands);
        pendingCommands.delete(result.commandId);
        
        return {
          ...prev,
          lastResult: result,
          pendingCommands,
          metrics: {
            ...prev.metrics,
            successCount: prev.metrics.successCount + 1,
            averageExecutionTime: 
              (prev.metrics.averageExecutionTime * prev.metrics.successCount + result.executionTime) /
              (prev.metrics.successCount + 1)
          }
        };
      });
      commandStatusMap.current.set(result.commandId, 'completed');
    };
    
    const handleCommandFailed = (error: VdoCommandError) => {
      setState(prev => {
        const pendingCommands = new Map(prev.pendingCommands);
        pendingCommands.delete(error.commandId);
        
        return {
          ...prev,
          lastError: error,
          pendingCommands,
          metrics: {
            ...prev.metrics,
            failureCount: prev.metrics.failureCount + 1
          }
        };
      });
      commandStatusMap.current.set(error.commandId, 'failed');
    };
    
    const handleQueueStatus = (status: VdoQueueStatus) => {
      setState(prev => ({ ...prev, queueStatus: status }));
    };
    
    const handlePermissionStatus = (status: VdoPermissionStatus) => {
      setState(prev => ({ ...prev, permissionStatus: status }));
    };
    
    const handleConnectionQuality = (quality: VdoConnectionQuality) => {
      setState(prev => ({ ...prev, connectionQuality: quality }));
    };
    
    const handlePermissionGranted = (result: any) => {
      const callback = permissionCallbacks.current.get(result.permission);
      if (callback) {
        callback(true);
        permissionCallbacks.current.delete(result.permission);
      }
    };
    
    const handlePermissionDenied = (result: any) => {
      const callback = permissionCallbacks.current.get(result.permission);
      if (callback) {
        callback(false);
        permissionCallbacks.current.delete(result.permission);
      }
    };
    
    // Subscribe to events
    vdoWebSocketFeedback.on('vdo:command:sent', handleCommandSent);
    vdoWebSocketFeedback.on('vdo:command:completed', handleCommandCompleted);
    vdoWebSocketFeedback.on('vdo:command:failed', handleCommandFailed);
    vdoWebSocketFeedback.on('vdo:queue:status', handleQueueStatus);
    vdoWebSocketFeedback.on('vdo:permission:status', handlePermissionStatus);
    vdoWebSocketFeedback.on('vdo:connection:quality', handleConnectionQuality);
    vdoWebSocketFeedback.on('vdo:permission:granted', handlePermissionGranted);
    vdoWebSocketFeedback.on('vdo:permission:denied', handlePermissionDenied);
    
    // Cleanup
    return () => {
      vdoWebSocketFeedback.off('vdo:command:sent', handleCommandSent);
      vdoWebSocketFeedback.off('vdo:command:completed', handleCommandCompleted);
      vdoWebSocketFeedback.off('vdo:command:failed', handleCommandFailed);
      vdoWebSocketFeedback.off('vdo:queue:status', handleQueueStatus);
      vdoWebSocketFeedback.off('vdo:permission:status', handlePermissionStatus);
      vdoWebSocketFeedback.off('vdo:connection:quality', handleConnectionQuality);
      vdoWebSocketFeedback.off('vdo:permission:granted', handlePermissionGranted);
      vdoWebSocketFeedback.off('vdo:permission:denied', handlePermissionDenied);
      
      setState(prev => ({ ...prev, isConnected: false }));
    };
  }, [socket, iframe]);
  
  // Send command
  const sendCommand = useCallback(async (
    command: VdoCommand,
    options?: SendCommandOptions
  ) => {
    if (!state.isConnected) {
      console.warn('WebSocket not connected. Command will be queued.');
    }
    
    const result = await enhancedVdoCommandManager.sendCommand(command, {
      ...options,
      trackMetrics: options?.trackMetrics !== false
    });
    
    return result as any;
  }, [state.isConnected]);
  
  // Send command with tracking
  const sendCommandWithTracking = useCallback(async (
    command: VdoCommand,
    options?: SendCommandOptions
  ): Promise<string> => {
    const commandId = vdoWebSocketFeedback.sendCommandWithFeedback(command, {
      priority: options?.priority || 'normal',
      source: 'user',
      trackMetrics: true
    });
    
    commandStatusMap.current.set(commandId, 'processing');
    
    // Send the actual command
    enhancedVdoCommandManager.sendCommand(command, options);
    
    return commandId;
  }, []);
  
  // Cancel command
  const cancelCommand = useCallback((commandId: string) => {
    // Remove from queue if present
    enhancedVdoCommandManager.removeFromQueue(commandId);
    
    // Update state
    setState(prev => {
      const pendingCommands = new Map(prev.pendingCommands);
      pendingCommands.delete(commandId);
      return { ...prev, pendingCommands };
    });
    
    commandStatusMap.current.delete(commandId);
  }, []);
  
  // Get queue position
  const getQueuePosition = useCallback((commandId: string): number => {
    if (!state.queueStatus) return -1;
    
    const index = state.queueStatus.pendingCommands.findIndex(
      cmd => cmd.id === commandId
    );
    
    return index;
  }, [state.queueStatus]);
  
  // Clear queue
  const clearQueue = useCallback(() => {
    enhancedVdoCommandManager.clearQueue();
    setState(prev => ({
      ...prev,
      pendingCommands: new Map(),
      queueStatus: null
    }));
  }, []);
  
  // Get help
  const getHelp = useCallback(async (
    command?: string,
    category?: string
  ): Promise<VdoHelpResponse | null> => {
    if (command) {
      return vdoCommandHelp.getCommandHelp(command);
    } else if (category) {
      return vdoCommandHelp.getCategoryHelp(category);
    }
    
    // Request from WebSocket if not found locally
    vdoWebSocketFeedback.requestHelp(command, category);
    
    return new Promise((resolve) => {
      const handler = (response: VdoHelpResponse) => {
        vdoWebSocketFeedback.off('vdo:help:response', handler);
        resolve(response);
      };
      
      vdoWebSocketFeedback.on('vdo:help:response', handler);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        vdoWebSocketFeedback.off('vdo:help:response', handler);
        resolve(null);
      }, 5000);
    });
  }, []);
  
  // Search commands
  const searchCommands = useCallback((query: string) => {
    return vdoCommandHelp.searchCommands(query);
  }, []);
  
  // Get quick reference
  const getQuickReference = useCallback(() => {
    return vdoCommandHelp.getQuickReference();
  }, []);
  
  // Request permission
  const requestPermission = useCallback(async (
    permission: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already granted
      const currentStatus = state.permissionStatus?.[permission as keyof VdoPermissionStatus];
      if (currentStatus === 'granted') {
        resolve(true);
        return;
      }
      
      // Store callback
      permissionCallbacks.current.set(permission, resolve);
      
      // Request permission
      if (socket) {
        socket.emit('vdo:permission:request', { permission });
      }
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (permissionCallbacks.current.has(permission)) {
          permissionCallbacks.current.delete(permission);
          resolve(false);
        }
      }, 30000);
    });
  }, [socket, state.permissionStatus]);
  
  // Check permission
  const checkPermission = useCallback((
    permission: string
  ): 'granted' | 'denied' | 'prompt' => {
    const status = state.permissionStatus?.[permission as keyof VdoPermissionStatus];
    return status || 'prompt';
  }, [state.permissionStatus]);
  
  // Get command status
  const getCommandStatus = useCallback((commandId: string) => {
    return commandStatusMap.current.get(commandId) || null;
  }, []);
  
  // Get last error
  const getLastError = useCallback(() => {
    return state.lastError;
  }, [state.lastError]);
  
  // Clear metrics
  const clearMetrics = useCallback(() => {
    vdoWebSocketFeedback.clear();
    setState(prev => ({
      ...prev,
      metrics: {
        totalCommands: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0
      },
      lastCommand: null,
      lastResult: null,
      lastError: null
    }));
  }, []);
  
  return {
    // State
    isConnected: state.isConnected,
    queueStatus: state.queueStatus,
    permissionStatus: state.permissionStatus,
    connectionQuality: state.connectionQuality,
    metrics: state.metrics,
    pendingCommands: Array.from(state.pendingCommands.values()),
    
    // Command methods
    sendCommand,
    sendCommandWithTracking,
    cancelCommand,
    
    // Queue methods
    getQueuePosition,
    clearQueue,
    
    // Help methods
    getHelp,
    searchCommands,
    getQuickReference,
    
    // Permission methods
    requestPermission,
    checkPermission,
    
    // Utility methods
    getCommandStatus,
    getLastError,
    clearMetrics
  };
}