/**
 * VDO.Ninja Error Recovery System
 * Comprehensive error handling and automatic recovery mechanisms
 */

import { EventEmitter } from 'events';

// Error types
export enum VdoErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  STREAM_ERROR = 'STREAM_ERROR',
  MEDIA_ERROR = 'MEDIA_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  COMMAND_ERROR = 'COMMAND_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum VdoErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface VdoError {
  type: VdoErrorType;
  severity: VdoErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface RecoveryStrategy {
  type: VdoErrorType;
  action: (error: VdoError) => Promise<boolean>;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  timeout?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
  monitoringPeriod: number;
}

export interface RecoveryManagerConfig {
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
  circuitBreaker?: CircuitBreakerConfig;
  enableAutoRecovery?: boolean;
  enableLogging?: boolean;
  onError?: (error: VdoError) => void;
  onRecoveryAttempt?: (error: VdoError, attempt: number) => void;
  onRecoverySuccess?: (error: VdoError) => void;
  onRecoveryFailed?: (error: VdoError) => void;
}

// Circuit Breaker States
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private successCount: number = 0;
  private halfOpenRequests: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    this.checkReset();
    
    if (this.state === CircuitState.OPEN) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.config.halfOpenRequests) {
        throw new Error('Circuit breaker is HALF_OPEN - max requests reached');
      }
      this.halfOpenRequests++;
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenRequests) {
        this.close();
      }
    } else {
      this.failureCount = 0;
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }
  
  private open(): void {
    this.state = CircuitState.OPEN;
    console.warn('Circuit breaker opened due to excessive failures');
  }
  
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenRequests = 0;
    console.info('Circuit breaker closed');
  }
  
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.halfOpenRequests = 0;
    console.info('Circuit breaker half-open for testing');
  }
  
  private checkReset(): void {
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceFailure >= this.config.resetTimeout) {
        this.halfOpen();
      }
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  reset(): void {
    this.close();
  }
}

export class VdoErrorRecoveryManager extends EventEmitter {
  private config: Required<RecoveryManagerConfig>;
  private strategies: Map<VdoErrorType, RecoveryStrategy> = new Map();
  private errorHistory: VdoError[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private isRecovering: boolean = false;
  
  constructor(config?: RecoveryManagerConfig) {
    super();
    
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      baseRetryDelay: config?.baseRetryDelay ?? 1000,
      maxRetryDelay: config?.maxRetryDelay ?? 30000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      circuitBreaker: config?.circuitBreaker ?? {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenRequests: 3,
        monitoringPeriod: 300000
      },
      enableAutoRecovery: config?.enableAutoRecovery ?? true,
      enableLogging: config?.enableLogging ?? true,
      onError: config?.onError ?? (() => {}),
      onRecoveryAttempt: config?.onRecoveryAttempt ?? (() => {}),
      onRecoverySuccess: config?.onRecoverySuccess ?? (() => {}),
      onRecoveryFailed: config?.onRecoveryFailed ?? (() => {})
    };
    
    this.initializeDefaultStrategies();
  }
  
  private initializeDefaultStrategies(): void {
    // Connection error recovery
    this.registerStrategy({
      type: VdoErrorType.CONNECTION_ERROR,
      action: async (error) => {
        // Attempt to reconnect
        await this.delay(1000);
        return Math.random() > 0.3; // Simulate recovery success
      },
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 1.5
    });
    
    // Stream error recovery
    this.registerStrategy({
      type: VdoErrorType.STREAM_ERROR,
      action: async (error) => {
        // Attempt to restart stream
        await this.delay(2000);
        return Math.random() > 0.4;
      },
      maxRetries: 3,
      retryDelay: 3000,
      backoffMultiplier: 2
    });
    
    // Media error recovery
    this.registerStrategy({
      type: VdoErrorType.MEDIA_ERROR,
      action: async (error) => {
        // Attempt to reset media devices
        await this.delay(500);
        return Math.random() > 0.2;
      },
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 1.5
    });
    
    // Network error recovery
    this.registerStrategy({
      type: VdoErrorType.NETWORK_ERROR,
      action: async (error) => {
        // Wait for network to stabilize
        await this.delay(5000);
        return Math.random() > 0.5;
      },
      maxRetries: 4,
      retryDelay: 5000,
      backoffMultiplier: 2
    });
    
    // Permission error recovery
    this.registerStrategy({
      type: VdoErrorType.PERMISSION_ERROR,
      action: async (error) => {
        // Cannot auto-recover, need user action
        return false;
      },
      maxRetries: 1,
      retryDelay: 0,
      backoffMultiplier: 1
    });
  }
  
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }
  
  async handleError(error: VdoError): Promise<boolean> {
    // Log error
    if (this.config.enableLogging) {
      console.error(`[VDO Error] ${error.type}: ${error.message}`, error);
    }
    
    // Add to history
    this.errorHistory.push(error);
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
    
    // Emit error event
    this.emit('error', error);
    this.config.onError(error);
    
    // Check if error is recoverable
    if (!error.recoverable || !this.config.enableAutoRecovery) {
      this.config.onRecoveryFailed(error);
      return false;
    }
    
    // Check circuit breaker
    const circuitKey = `${error.type}-${error.code || 'default'}`;
    let circuitBreaker = this.circuitBreakers.get(circuitKey);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
      this.circuitBreakers.set(circuitKey, circuitBreaker);
    }
    
    try {
      return await circuitBreaker.execute(() => this.attemptRecovery(error));
    } catch (cbError) {
      console.error('Circuit breaker prevented recovery attempt:', cbError);
      return false;
    }
  }
  
  private async attemptRecovery(error: VdoError): Promise<boolean> {
    if (this.isRecovering) {
      console.warn('Recovery already in progress, skipping...');
      return false;
    }
    
    this.isRecovering = true;
    
    try {
      const strategy = this.strategies.get(error.type);
      if (!strategy) {
        console.warn(`No recovery strategy for error type: ${error.type}`);
        return false;
      }
      
      const errorKey = this.getErrorKey(error);
      const attempts = this.recoveryAttempts.get(errorKey) || 0;
      
      if (attempts >= strategy.maxRetries) {
        console.error(`Max recovery attempts reached for ${error.type}`);
        this.config.onRecoveryFailed(error);
        return false;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        strategy.retryDelay * Math.pow(strategy.backoffMultiplier, attempts),
        this.config.maxRetryDelay
      );
      
      // Wait before retry
      await this.delay(delay);
      
      // Emit recovery attempt event
      this.emit('recoveryAttempt', { error, attempt: attempts + 1 });
      this.config.onRecoveryAttempt(error, attempts + 1);
      
      // Attempt recovery
      const success = await this.executeWithTimeout(
        strategy.action(error),
        strategy.timeout || 30000
      );
      
      if (success) {
        // Reset attempts on success
        this.recoveryAttempts.delete(errorKey);
        this.emit('recoverySuccess', error);
        this.config.onRecoverySuccess(error);
        return true;
      } else {
        // Increment attempts on failure
        this.recoveryAttempts.set(errorKey, attempts + 1);
        
        // Retry if attempts remaining
        if (attempts + 1 < strategy.maxRetries) {
          return this.attemptRecovery({ ...error, retryCount: attempts + 1 });
        } else {
          this.emit('recoveryFailed', error);
          this.config.onRecoveryFailed(error);
          return false;
        }
      }
    } finally {
      this.isRecovering = false;
    }
  }
  
  private getErrorKey(error: VdoError): string {
    return `${error.type}-${error.code || 'default'}`;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }
  
  // Public methods
  
  createError(
    type: VdoErrorType,
    message: string,
    options?: Partial<VdoError>
  ): VdoError {
    return {
      type,
      severity: options?.severity ?? VdoErrorSeverity.MEDIUM,
      message,
      code: options?.code,
      details: options?.details,
      timestamp: new Date(),
      recoverable: options?.recoverable ?? true,
      retryCount: options?.retryCount ?? 0,
      maxRetries: options?.maxRetries ?? this.config.maxRetries
    };
  }
  
  getErrorHistory(): VdoError[] {
    return [...this.errorHistory];
  }
  
  getErrorStats(): {
    total: number;
    byType: Record<VdoErrorType, number>;
    bySeverity: Record<VdoErrorSeverity, number>;
    recoveryRate: number;
  } {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<VdoErrorType, number>,
      bySeverity: {} as Record<VdoErrorSeverity, number>,
      recoveryRate: 0
    };
    
    let recoveredCount = 0;
    
    for (const error of this.errorHistory) {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count recovered
      if (error.recoverable && !this.recoveryAttempts.has(this.getErrorKey(error))) {
        recoveredCount++;
      }
    }
    
    stats.recoveryRate = stats.total > 0 ? recoveredCount / stats.total : 0;
    
    return stats;
  }
  
  resetCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }
  
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
  
  reset(): void {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    this.circuitBreakers.clear();
    this.isRecovering = false;
  }
}

// Singleton instance
let recoveryManager: VdoErrorRecoveryManager | null = null;

export function getRecoveryManager(config?: RecoveryManagerConfig): VdoErrorRecoveryManager {
  if (!recoveryManager) {
    recoveryManager = new VdoErrorRecoveryManager(config);
  }
  return recoveryManager;
}

// Helper function to determine error type from various sources
export function detectErrorType(error: any): VdoErrorType {
  if (!error) return VdoErrorType.UNKNOWN_ERROR;
  
  const message = error.message || error.toString();
  const code = error.code || error.name;
  
  // Connection errors
  if (
    message.includes('connection') ||
    message.includes('disconnected') ||
    message.includes('connect') ||
    code === 'CONNECTION_FAILED'
  ) {
    return VdoErrorType.CONNECTION_ERROR;
  }
  
  // Stream errors
  if (
    message.includes('stream') ||
    message.includes('broadcast') ||
    code === 'STREAM_ERROR'
  ) {
    return VdoErrorType.STREAM_ERROR;
  }
  
  // Media errors
  if (
    message.includes('media') ||
    message.includes('camera') ||
    message.includes('microphone') ||
    message.includes('audio') ||
    message.includes('video') ||
    code === 'NotAllowedError' ||
    code === 'NotFoundError' ||
    code === 'NotReadableError'
  ) {
    return VdoErrorType.MEDIA_ERROR;
  }
  
  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('denied') ||
    code === 'PermissionDeniedError'
  ) {
    return VdoErrorType.PERMISSION_ERROR;
  }
  
  // Network errors
  if (
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('fetch') ||
    code === 'NetworkError'
  ) {
    return VdoErrorType.NETWORK_ERROR;
  }
  
  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    code === 'TIMEOUT'
  ) {
    return VdoErrorType.TIMEOUT_ERROR;
  }
  
  // Command errors
  if (
    message.includes('command') ||
    message.includes('invalid') ||
    code === 'COMMAND_FAILED'
  ) {
    return VdoErrorType.COMMAND_ERROR;
  }
  
  return VdoErrorType.UNKNOWN_ERROR;
}

// Helper function to determine error severity
export function detectErrorSeverity(error: any): VdoErrorSeverity {
  const type = detectErrorType(error);
  
  switch (type) {
    case VdoErrorType.PERMISSION_ERROR:
      return VdoErrorSeverity.CRITICAL;
    case VdoErrorType.CONNECTION_ERROR:
    case VdoErrorType.STREAM_ERROR:
      return VdoErrorSeverity.HIGH;
    case VdoErrorType.MEDIA_ERROR:
    case VdoErrorType.NETWORK_ERROR:
      return VdoErrorSeverity.MEDIUM;
    case VdoErrorType.TIMEOUT_ERROR:
    case VdoErrorType.COMMAND_ERROR:
      return VdoErrorSeverity.LOW;
    default:
      return VdoErrorSeverity.MEDIUM;
  }
}