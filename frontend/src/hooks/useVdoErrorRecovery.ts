import { useState, useEffect, useCallback, useRef } from 'react';
import {
  VdoError,
  VdoErrorType,
  VdoErrorSeverity,
  VdoErrorRecoveryManager,
  RecoveryManagerConfig,
  getRecoveryManager,
  detectErrorType,
  detectErrorSeverity
} from '@/lib/vdo-ninja/error-recovery';

export interface UseVdoErrorRecoveryOptions extends RecoveryManagerConfig {
  streamId?: string;
  onErrorResolved?: (error: VdoError) => void;
  onErrorPersisted?: (error: VdoError) => void;
  autoReportErrors?: boolean;
}

export interface UseVdoErrorRecoveryReturn {
  // Error state
  currentError: VdoError | null;
  errorHistory: VdoError[];
  isRecovering: boolean;
  recoveryAttempts: number;
  
  // Error statistics
  errorStats: {
    total: number;
    byType: Record<VdoErrorType, number>;
    bySeverity: Record<VdoErrorSeverity, number>;
    recoveryRate: number;
  };
  
  // Actions
  reportError: (error: Error | VdoError, context?: any) => Promise<boolean>;
  clearError: () => void;
  clearHistory: () => void;
  retryLastError: () => Promise<boolean>;
  
  // Circuit breaker
  circuitBreakerStatus: 'closed' | 'open' | 'half-open';
  resetCircuitBreakers: () => void;
}

export function useVdoErrorRecovery(
  options?: UseVdoErrorRecoveryOptions
): UseVdoErrorRecoveryReturn {
  const [currentError, setCurrentError] = useState<VdoError | null>(null);
  const [errorHistory, setErrorHistory] = useState<VdoError[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<'closed' | 'open' | 'half-open'>('closed');
  
  const recoveryManagerRef = useRef<VdoErrorRecoveryManager>();
  const lastErrorRef = useRef<VdoError | null>(null);
  
  // Initialize recovery manager
  useEffect(() => {
    recoveryManagerRef.current = getRecoveryManager({
      ...options,
      onError: (error) => {
        setCurrentError(error);
        lastErrorRef.current = error;
        options?.onError?.(error);
      },
      onRecoveryAttempt: (error, attempt) => {
        setIsRecovering(true);
        setRecoveryAttempts(attempt);
        options?.onRecoveryAttempt?.(error, attempt);
      },
      onRecoverySuccess: (error) => {
        setCurrentError(null);
        setIsRecovering(false);
        setRecoveryAttempts(0);
        options?.onRecoverySuccess?.(error);
        options?.onErrorResolved?.(error);
      },
      onRecoveryFailed: (error) => {
        setIsRecovering(false);
        options?.onRecoveryFailed?.(error);
        options?.onErrorPersisted?.(error);
      }
    });
    
    // Update error history periodically
    const interval = setInterval(() => {
      if (recoveryManagerRef.current) {
        setErrorHistory(recoveryManagerRef.current.getErrorHistory());
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // Report error
  const reportError = useCallback(async (
    error: Error | VdoError,
    context?: any
  ): Promise<boolean> => {
    if (!recoveryManagerRef.current) return false;
    
    let vdoError: VdoError;
    
    if ('type' in error && 'severity' in error) {
      // Already a VdoError
      vdoError = error as VdoError;
    } else {
      // Convert Error to VdoError
      const errorObj = error as Error;
      vdoError = recoveryManagerRef.current.createError(
        detectErrorType(errorObj),
        errorObj.message,
        {
          severity: detectErrorSeverity(errorObj),
          details: {
            ...context,
            stack: errorObj.stack,
            streamId: options?.streamId
          }
        }
      );
    }
    
    // Auto-report to backend if enabled
    if (options?.autoReportErrors && options.streamId) {
      try {
        await fetch('/api/v1/vdo/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId: options.streamId,
            error: {
              type: vdoError.type,
              severity: vdoError.severity,
              message: vdoError.message,
              code: vdoError.code,
              timestamp: vdoError.timestamp
            }
          })
        });
      } catch (reportError) {
        console.error('Failed to report error:', reportError);
      }
    }
    
    return recoveryManagerRef.current.handleError(vdoError);
  }, [options?.streamId, options?.autoReportErrors]);
  
  // Clear current error
  const clearError = useCallback(() => {
    setCurrentError(null);
    setRecoveryAttempts(0);
    setIsRecovering(false);
  }, []);
  
  // Clear error history
  const clearHistory = useCallback(() => {
    recoveryManagerRef.current?.clearErrorHistory();
    setErrorHistory([]);
  }, []);
  
  // Retry last error
  const retryLastError = useCallback(async (): Promise<boolean> => {
    if (!lastErrorRef.current || !recoveryManagerRef.current) return false;
    
    const error = { ...lastErrorRef.current, retryCount: 0 };
    return recoveryManagerRef.current.handleError(error);
  }, []);
  
  // Reset circuit breakers
  const resetCircuitBreakers = useCallback(() => {
    recoveryManagerRef.current?.resetCircuitBreakers();
    setCircuitBreakerStatus('closed');
  }, []);
  
  // Get error statistics
  const errorStats = recoveryManagerRef.current?.getErrorStats() || {
    total: 0,
    byType: {} as Record<VdoErrorType, number>,
    bySeverity: {} as Record<VdoErrorSeverity, number>,
    recoveryRate: 0
  };
  
  return {
    currentError,
    errorHistory,
    isRecovering,
    recoveryAttempts,
    errorStats,
    reportError,
    clearError,
    clearHistory,
    retryLastError,
    circuitBreakerStatus,
    resetCircuitBreakers
  };
}

// Hook for automatic error recovery with React Error Boundaries
export function useErrorBoundaryRecovery() {
  const [error, setError] = useState<Error | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const resetError = useCallback(() => {
    setError(null);
    setIsRecovering(false);
  }, []);
  
  const recoverError = useCallback(async (error: Error) => {
    setError(error);
    setIsRecovering(true);
    
    const recoveryManager = getRecoveryManager();
    const vdoError = recoveryManager.createError(
      detectErrorType(error),
      error.message,
      {
        severity: detectErrorSeverity(error),
        details: { stack: error.stack }
      }
    );
    
    const success = await recoveryManager.handleError(vdoError);
    
    if (success) {
      resetError();
    } else {
      setIsRecovering(false);
    }
    
    return success;
  }, [resetError]);
  
  return {
    error,
    isRecovering,
    resetError,
    recoverError
  };
}

// Hook for monitoring connection health
export function useVdoConnectionHealth(streamId?: string) {
  const [connectionHealth, setConnectionHealth] = useState<{
    status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    latency: number;
    packetLoss: number;
    reconnectAttempts: number;
  }>({
    status: 'disconnected',
    quality: 'good',
    latency: 0,
    packetLoss: 0,
    reconnectAttempts: 0
  });
  
  const { reportError, isRecovering, recoveryAttempts } = useVdoErrorRecovery({
    streamId,
    enableAutoRecovery: true
  });
  
  // Monitor connection events
  useEffect(() => {
    const handleConnectionChange = (event: any) => {
      const { status, quality, metrics } = event.detail || {};
      
      setConnectionHealth(prev => ({
        ...prev,
        status: status || prev.status,
        quality: quality || prev.quality,
        latency: metrics?.latency || prev.latency,
        packetLoss: metrics?.packetLoss || prev.packetLoss
      }));
      
      // Report connection errors
      if (status === 'error' || status === 'disconnected') {
        reportError(
          new Error(`Connection ${status}`),
          { streamId, quality, metrics }
        );
      }
    };
    
    window.addEventListener('vdo:connection:change', handleConnectionChange);
    
    return () => {
      window.removeEventListener('vdo:connection:change', handleConnectionChange);
    };
  }, [streamId, reportError]);
  
  // Update reconnect attempts
  useEffect(() => {
    if (isRecovering) {
      setConnectionHealth(prev => ({
        ...prev,
        status: 'reconnecting',
        reconnectAttempts: recoveryAttempts
      }));
    }
  }, [isRecovering, recoveryAttempts]);
  
  return connectionHealth;
}

// Hook for media device error handling
export function useVdoMediaErrors() {
  const [mediaErrors, setMediaErrors] = useState<{
    camera: Error | null;
    microphone: Error | null;
    screen: Error | null;
  }>({
    camera: null,
    microphone: null,
    screen: null
  });
  
  const { reportError } = useVdoErrorRecovery({
    enableAutoRecovery: true
  });
  
  const handleCameraError = useCallback((error: Error) => {
    setMediaErrors(prev => ({ ...prev, camera: error }));
    reportError(error, { device: 'camera' });
  }, [reportError]);
  
  const handleMicrophoneError = useCallback((error: Error) => {
    setMediaErrors(prev => ({ ...prev, microphone: error }));
    reportError(error, { device: 'microphone' });
  }, [reportError]);
  
  const handleScreenError = useCallback((error: Error) => {
    setMediaErrors(prev => ({ ...prev, screen: error }));
    reportError(error, { device: 'screen' });
  }, [reportError]);
  
  const clearMediaErrors = useCallback(() => {
    setMediaErrors({
      camera: null,
      microphone: null,
      screen: null
    });
  }, []);
  
  return {
    mediaErrors,
    handleCameraError,
    handleMicrophoneError,
    handleScreenError,
    clearMediaErrors
  };
}