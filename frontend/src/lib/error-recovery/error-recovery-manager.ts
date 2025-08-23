import { EventEmitter } from 'events';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for different handling strategies
 */
export type ErrorCategory = 
  | 'connection' 
  | 'authentication' 
  | 'rate_limit' 
  | 'server_error' 
  | 'client_error' 
  | 'network' 
  | 'timeout'
  | 'unknown';

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = 
  | 'retry' 
  | 'fallback' 
  | 'queue' 
  | 'ignore' 
  | 'escalate' 
  | 'circuit_break';

/**
 * Error classification and handling configuration
 */
export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  strategy: RecoveryStrategy;
  retryable: boolean;
  requiresUserNotification: boolean;
  fallbackAction?: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Error instance with context
 */
export interface ErrorInstance {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error | string;
  context: {
    event?: string;
    data?: any;
    socketConnected?: boolean;
    attemptNumber?: number;
    userId?: string;
    streamId?: string;
  };
  classification: ErrorClassification;
  recovery?: {
    strategy: RecoveryStrategy;
    attempted: boolean;
    successful?: boolean;
    fallbackUsed?: boolean;
    retryCount: number;
    nextRetryAt?: Date;
  };
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Fallback mode configuration
 */
export interface FallbackMode {
  name: string;
  enabled: boolean;
  features: {
    chat: 'disabled' | 'readonly' | 'cached' | 'polling';
    streaming: 'disabled' | 'readonly' | 'degraded';
    analytics: 'disabled' | 'cached' | 'basic';
    notifications: 'disabled' | 'basic' | 'cached';
  };
  userMessage: string;
  automaticRecovery: boolean;
  maxDuration?: number; // ms
}

/**
 * Error recovery events
 */
export interface ErrorRecoveryEvents {
  'error:classified': (error: ErrorInstance) => void;
  'error:recovery:started': (error: ErrorInstance) => void;
  'error:recovery:success': (error: ErrorInstance) => void;
  'error:recovery:failed': (error: ErrorInstance) => void;
  'circuit-breaker:opened': (failures: number) => void;
  'circuit-breaker:closed': () => void;
  'circuit-breaker:half-open': () => void;
  'fallback:activated': (mode: FallbackMode) => void;
  'fallback:deactivated': (mode: FallbackMode) => void;
  'user:notification': (notification: UserNotification) => void;
}

/**
 * User notification interface
 */
export interface UserNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    style: 'primary' | 'secondary' | 'danger';
  }>;
  dismissible: boolean;
  persistent: boolean;
}

/**
 * Comprehensive Error Recovery Manager
 */
export class ErrorRecoveryManager extends EventEmitter {
  private static instance: ErrorRecoveryManager;
  private errorHistory: Map<string, ErrorInstance[]> = new Map(); // category -> errors
  private errorClassifications: Map<string, ErrorClassification> = new Map();
  private circuitBreaker: CircuitBreakerState;
  private currentFallbackMode: FallbackMode | null = null;
  private fallbackModes: Map<string, FallbackMode> = new Map();
  private activeRecoveries: Map<string, NodeJS.Timeout> = new Map(); // errorId -> timeout
  private userNotifications: Map<string, UserNotification> = new Map();
  private errorStatsCollector: any; // Would integrate with analytics

  // Circuit breaker configuration
  private circuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
  };

  private constructor() {
    super();
    this.initializeCircuitBreaker();
    this.initializeErrorClassifications();
    this.initializeFallbackModes();
    this.setupCleanupIntervals();
  }

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  /**
   * Handle an error with automatic classification and recovery
   */
  public async handleError(
    error: Error | string,
    context: ErrorInstance['context'] = {}
  ): Promise<ErrorInstance> {
    const errorInstance = this.createErrorInstance(error, context);
    
    // Classify the error
    this.classifyError(errorInstance);
    
    // Store in history
    this.addToHistory(errorInstance);
    
    // Update circuit breaker
    this.updateCircuitBreaker(errorInstance);
    
    // Emit classification event
    this.emit('error:classified', errorInstance);
    
    // Attempt recovery
    await this.attemptRecovery(errorInstance);
    
    // Update error statistics
    this.updateErrorStats(errorInstance);
    
    return errorInstance;
  }

  /**
   * Create error instance with unique ID and timestamp
   */
  private createErrorInstance(
    error: Error | string,
    context: ErrorInstance['context']
  ): ErrorInstance {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: errorId,
      timestamp: new Date(),
      category: this.categorizeError(errorMessage),
      severity: 'medium', // Will be updated by classification
      message: errorMessage,
      originalError: error,
      context,
      classification: this.getDefaultClassification(),
      recovery: {
        strategy: 'retry',
        attempted: false,
        retryCount: 0,
      },
    };
  }

  /**
   * Categorize error based on message and context
   */
  private categorizeError(message: string): ErrorCategory {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('network') || messageLower.includes('connection')) {
      return 'network';
    }
    if (messageLower.includes('timeout')) {
      return 'timeout';
    }
    if (messageLower.includes('auth') || messageLower.includes('token')) {
      return 'authentication';
    }
    if (messageLower.includes('rate limit') || messageLower.includes('rate_limit')) {
      return 'rate_limit';
    }
    if (messageLower.includes('server') || messageLower.includes('5')) {
      return 'server_error';
    }
    if (messageLower.includes('client') || messageLower.includes('4')) {
      return 'client_error';
    }
    if (messageLower.includes('disconnect') || messageLower.includes('connect')) {
      return 'connection';
    }
    
    return 'unknown';
  }

  /**
   * Classify error with appropriate handling strategy
   */
  private classifyError(errorInstance: ErrorInstance): void {
    const classification = this.errorClassifications.get(errorInstance.category) ||
                          this.getDefaultClassification();
    
    errorInstance.classification = classification;
    errorInstance.severity = classification.severity;
  }

  /**
   * Attempt recovery based on error classification
   */
  private async attemptRecovery(errorInstance: ErrorInstance): Promise<void> {
    const { classification, recovery } = errorInstance;
    
    if (!classification.retryable && classification.strategy === 'retry') {
      console.warn('Error is not retryable, skipping recovery');
      return;
    }

    // Check circuit breaker
    if (this.circuitBreaker.state === 'open' && classification.strategy === 'retry') {
      console.warn('Circuit breaker is open, activating fallback');
      await this.activateFallback(errorInstance);
      return;
    }

    recovery.attempted = true;
    this.emit('error:recovery:started', errorInstance);

    try {
      switch (classification.strategy) {
        case 'retry':
          await this.scheduleRetry(errorInstance);
          break;
        case 'fallback':
          await this.activateFallback(errorInstance);
          break;
        case 'queue':
          await this.queueForLater(errorInstance);
          break;
        case 'circuit_break':
          this.openCircuitBreaker();
          await this.activateFallback(errorInstance);
          break;
        case 'ignore':
          console.log('Ignoring error as per classification');
          break;
        case 'escalate':
          await this.escalateError(errorInstance);
          break;
      }

      // Send user notification if required
      if (classification.requiresUserNotification) {
        this.sendUserNotification(errorInstance);
      }

    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      recovery.successful = false;
      this.emit('error:recovery:failed', errorInstance);
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(errorInstance: ErrorInstance): Promise<void> {
    const { classification, recovery } = errorInstance;
    const maxRetries = classification.maxRetries || 3;
    
    if (recovery.retryCount >= maxRetries) {
      console.warn('Max retries exceeded, activating fallback');
      await this.activateFallback(errorInstance);
      return;
    }

    recovery.retryCount++;
    const baseDelay = classification.retryDelay || 1000;
    const delay = baseDelay * Math.pow(2, recovery.retryCount - 1);
    const jitter = Math.random() * 0.3 * delay; // ±30% jitter
    const finalDelay = delay + jitter;

    recovery.nextRetryAt = new Date(Date.now() + finalDelay);

    console.log(`Scheduling retry ${recovery.retryCount}/${maxRetries} in ${finalDelay}ms`);

    const timeout = setTimeout(async () => {
      try {
        // The actual retry logic would be implemented by the caller
        // For now, we just emit an event that the consumer can listen to
        this.emit('error:recovery:retry', errorInstance);
      } catch (error) {
        console.error('Retry failed:', error);
        await this.scheduleRetry(errorInstance); // Try again
      }
    }, finalDelay);

    this.activeRecoveries.set(errorInstance.id, timeout);
  }

  /**
   * Activate fallback mode
   */
  private async activateFallback(errorInstance: ErrorInstance): Promise<void> {
    const fallbackName = this.determineFallbackMode(errorInstance);
    const fallbackMode = this.fallbackModes.get(fallbackName);
    
    if (!fallbackMode) {
      console.error('No fallback mode available for error:', errorInstance.category);
      return;
    }

    if (this.currentFallbackMode === fallbackMode) {
      console.log('Fallback mode already active');
      return;
    }

    console.log(`Activating fallback mode: ${fallbackName}`);
    
    this.currentFallbackMode = fallbackMode;
    fallbackMode.enabled = true;
    
    errorInstance.recovery!.fallbackUsed = true;
    
    this.emit('fallback:activated', fallbackMode);
    
    // Schedule automatic recovery if enabled
    if (fallbackMode.automaticRecovery && fallbackMode.maxDuration) {
      setTimeout(() => {
        this.deactivateFallback();
      }, fallbackMode.maxDuration);
    }
  }

  /**
   * Deactivate current fallback mode
   */
  public deactivateFallback(): void {
    if (!this.currentFallbackMode) return;
    
    console.log(`Deactivating fallback mode: ${this.currentFallbackMode.name}`);
    
    const mode = this.currentFallbackMode;
    mode.enabled = false;
    this.currentFallbackMode = null;
    
    this.emit('fallback:deactivated', mode);
  }

  /**
   * Queue error for later processing (offline scenarios)
   */
  private async queueForLater(errorInstance: ErrorInstance): Promise<void> {
    // This would integrate with the offline queue system
    console.log('Queuing error for later processing:', errorInstance.id);
    
    // Store in localStorage or IndexedDB for persistence
    const queueKey = `error_queue_${errorInstance.category}`;
    const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
    existing.push({
      id: errorInstance.id,
      timestamp: errorInstance.timestamp,
      message: errorInstance.message,
      context: errorInstance.context,
    });
    localStorage.setItem(queueKey, JSON.stringify(existing));
  }

  /**
   * Escalate error to higher level handling
   */
  private async escalateError(errorInstance: ErrorInstance): Promise<void> {
    console.error('Escalating error:', errorInstance);
    
    // This would integrate with error reporting services
    // Send to Sentry, LogRocket, or similar service
    
    // For now, just emit an event
    this.emit('error:escalated', errorInstance);
  }

  /**
   * Send user notification
   */
  private sendUserNotification(errorInstance: ErrorInstance): void {
    const notification: UserNotification = {
      id: `notif_${errorInstance.id}`,
      type: this.getNotificationType(errorInstance.severity),
      title: this.getNotificationTitle(errorInstance.category),
      message: this.getNotificationMessage(errorInstance),
      duration: this.getNotificationDuration(errorInstance.severity),
      dismissible: true,
      persistent: errorInstance.severity === 'critical',
      actions: this.getNotificationActions(errorInstance),
    };

    this.userNotifications.set(notification.id, notification);
    this.emit('user:notification', notification);
  }

  /**
   * Circuit breaker methods
   */
  private initializeCircuitBreaker(): void {
    this.circuitBreaker = {
      state: 'closed',
      failures: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      consecutiveFailures: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
  }

  private updateCircuitBreaker(errorInstance: ErrorInstance): void {
    if (errorInstance.classification.severity === 'critical' || 
        errorInstance.category === 'connection') {
      
      this.circuitBreaker.failures++;
      this.circuitBreaker.consecutiveFailures++;
      this.circuitBreaker.totalFailures++;
      this.circuitBreaker.lastFailureTime = new Date();

      if (this.circuitBreaker.consecutiveFailures >= this.circuitBreakerConfig.failureThreshold) {
        this.openCircuitBreaker();
      }
    }
  }

  private openCircuitBreaker(): void {
    if (this.circuitBreaker.state === 'open') return;
    
    console.warn('Opening circuit breaker due to consecutive failures');
    
    this.circuitBreaker.state = 'open';
    this.circuitBreaker.nextAttemptTime = new Date(
      Date.now() + this.circuitBreakerConfig.resetTimeout
    );
    
    this.emit('circuit-breaker:opened', this.circuitBreaker.consecutiveFailures);
    
    // Schedule half-open attempt
    setTimeout(() => {
      this.circuitBreaker.state = 'half-open';
      this.emit('circuit-breaker:half-open');
    }, this.circuitBreakerConfig.resetTimeout);
  }

  public closeCircuitBreaker(): void {
    console.log('Closing circuit breaker - connection restored');
    
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.consecutiveFailures = 0;
    this.circuitBreaker.totalSuccesses++;
    
    this.emit('circuit-breaker:closed');
  }

  /**
   * Initialize error classifications
   */
  private initializeErrorClassifications(): void {
    const classifications: Array<[string, ErrorClassification]> = [
      ['connection', {
        category: 'connection',
        severity: 'high',
        strategy: 'retry',
        retryable: true,
        requiresUserNotification: true,
        maxRetries: 5,
        retryDelay: 1000,
      }],
      ['authentication', {
        category: 'authentication',
        severity: 'high',
        strategy: 'escalate',
        retryable: false,
        requiresUserNotification: true,
      }],
      ['rate_limit', {
        category: 'rate_limit',
        severity: 'medium',
        strategy: 'queue',
        retryable: true,
        requiresUserNotification: false,
        maxRetries: 3,
        retryDelay: 5000,
      }],
      ['server_error', {
        category: 'server_error',
        severity: 'high',
        strategy: 'fallback',
        retryable: true,
        requiresUserNotification: true,
        maxRetries: 3,
        retryDelay: 2000,
      }],
      ['client_error', {
        category: 'client_error',
        severity: 'medium',
        strategy: 'ignore',
        retryable: false,
        requiresUserNotification: false,
      }],
      ['network', {
        category: 'network',
        severity: 'high',
        strategy: 'circuit_break',
        retryable: true,
        requiresUserNotification: true,
        maxRetries: 3,
        retryDelay: 2000,
      }],
      ['timeout', {
        category: 'timeout',
        severity: 'medium',
        strategy: 'retry',
        retryable: true,
        requiresUserNotification: false,
        maxRetries: 2,
        retryDelay: 1500,
      }],
    ];

    classifications.forEach(([category, classification]) => {
      this.errorClassifications.set(category, classification);
    });
  }

  /**
   * Initialize fallback modes
   */
  private initializeFallbackModes(): void {
    const modes: Array<[string, FallbackMode]> = [
      ['basic', {
        name: 'basic',
        enabled: false,
        features: {
          chat: 'readonly',
          streaming: 'readonly',
          analytics: 'basic',
          notifications: 'basic',
        },
        userMessage: 'Limited functionality due to connection issues',
        automaticRecovery: true,
        maxDuration: 300000, // 5 minutes
      }],
      ['minimal', {
        name: 'minimal',
        enabled: false,
        features: {
          chat: 'disabled',
          streaming: 'readonly',
          analytics: 'disabled',
          notifications: 'disabled',
        },
        userMessage: 'Viewing mode only - connection problems detected',
        automaticRecovery: true,
        maxDuration: 600000, // 10 minutes
      }],
      ['offline', {
        name: 'offline',
        enabled: false,
        features: {
          chat: 'cached',
          streaming: 'disabled',
          analytics: 'cached',
          notifications: 'cached',
        },
        userMessage: 'Offline mode - showing cached content',
        automaticRecovery: true,
        maxDuration: 1800000, // 30 minutes
      }],
    ];

    modes.forEach(([name, mode]) => {
      this.fallbackModes.set(name, mode);
    });
  }

  /**
   * Helper methods for notifications
   */
  private getNotificationType(severity: ErrorSeverity): UserNotification['type'] {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  private getNotificationTitle(category: ErrorCategory): string {
    switch (category) {
      case 'connection': return 'Connection Issue';
      case 'authentication': return 'Authentication Required';
      case 'rate_limit': return 'Rate Limited';
      case 'server_error': return 'Server Error';
      case 'network': return 'Network Problem';
      case 'timeout': return 'Request Timeout';
      default: return 'Error';
    }
  }

  private getNotificationMessage(errorInstance: ErrorInstance): string {
    const { category, classification } = errorInstance;
    
    if (classification.fallbackAction) {
      return `${errorInstance.message}. ${classification.fallbackAction}`;
    }

    switch (category) {
      case 'connection':
        return 'Attempting to reconnect automatically. Please wait...';
      case 'authentication':
        return 'Please sign in again to continue.';
      case 'rate_limit':
        return 'Please slow down. Your actions are being queued.';
      case 'server_error':
        return 'Server is experiencing issues. Switching to backup mode.';
      case 'network':
        return 'Network connection is unstable. Limited functionality enabled.';
      default:
        return errorInstance.message;
    }
  }

  private getNotificationDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case 'critical': return 0; // No auto-dismiss
      case 'high': return 10000; // 10 seconds
      case 'medium': return 5000; // 5 seconds
      case 'low': return 3000; // 3 seconds
      default: return 5000;
    }
  }

  private getNotificationActions(errorInstance: ErrorInstance): UserNotification['actions'] {
    const actions: UserNotification['actions'] = [];

    if (errorInstance.classification.retryable) {
      actions.push({
        label: 'Retry',
        action: () => this.emit('error:manual-retry', errorInstance),
        style: 'primary',
      });
    }

    if (errorInstance.category === 'authentication') {
      actions.push({
        label: 'Sign In',
        action: () => this.emit('auth:sign-in-required'),
        style: 'primary',
      });
    }

    return actions;
  }

  /**
   * Utility methods
   */
  private determineFallbackMode(errorInstance: ErrorInstance): string {
    switch (errorInstance.severity) {
      case 'critical': return 'offline';
      case 'high': return 'minimal';
      case 'medium': return 'basic';
      default: return 'basic';
    }
  }

  private getDefaultClassification(): ErrorClassification {
    return {
      category: 'unknown',
      severity: 'medium',
      strategy: 'retry',
      retryable: true,
      requiresUserNotification: false,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  private addToHistory(errorInstance: ErrorInstance): void {
    const category = errorInstance.category;
    if (!this.errorHistory.has(category)) {
      this.errorHistory.set(category, []);
    }
    
    const history = this.errorHistory.get(category)!;
    history.push(errorInstance);
    
    // Keep only last 50 errors per category
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  private updateErrorStats(errorInstance: ErrorInstance): void {
    // This would integrate with analytics/monitoring
    console.log('Error stats updated:', {
      category: errorInstance.category,
      severity: errorInstance.severity,
      strategy: errorInstance.classification.strategy,
    });
  }

  private setupCleanupIntervals(): void {
    // Clean up old error history every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      
      for (const [category, errors] of this.errorHistory.entries()) {
        const filtered = errors.filter(error => error.timestamp > oneHourAgo);
        this.errorHistory.set(category, filtered);
      }
    }, 3600000); // 1 hour

    // Clean up old notifications every 5 minutes
    setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 300000);
      
      for (const [id, notification] of this.userNotifications.entries()) {
        // Remove non-persistent notifications older than 5 minutes
        if (!notification.persistent) {
          this.userNotifications.delete(id);
        }
      }
    }, 300000); // 5 minutes
  }

  /**
   * Public API methods
   */
  
  public getCurrentFallbackMode(): FallbackMode | null {
    return this.currentFallbackMode;
  }

  public getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  public getErrorHistory(category?: ErrorCategory): ErrorInstance[] {
    if (category) {
      return this.errorHistory.get(category) || [];
    }
    
    const allErrors: ErrorInstance[] = [];
    for (const errors of this.errorHistory.values()) {
      allErrors.push(...errors);
    }
    
    return allErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public clearErrorHistory(category?: ErrorCategory): void {
    if (category) {
      this.errorHistory.delete(category);
    } else {
      this.errorHistory.clear();
    }
  }

  public dismissNotification(notificationId: string): void {
    this.userNotifications.delete(notificationId);
    this.emit('notification:dismissed', notificationId);
  }

  public updateErrorClassification(
    category: ErrorCategory, 
    classification: Partial<ErrorClassification>
  ): void {
    const existing = this.errorClassifications.get(category) || this.getDefaultClassification();
    this.errorClassifications.set(category, { ...existing, ...classification });
  }
}

// Export singleton instance
export const errorRecoveryManager = ErrorRecoveryManager.getInstance();
