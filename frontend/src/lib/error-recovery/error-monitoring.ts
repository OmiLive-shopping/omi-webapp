/**
 * Error monitoring and reporting integration
 * Provides centralized error reporting to external services
 */

export type MonitoringService = 'sentry' | 'logrocket' | 'bugsnag' | 'rollbar' | 'custom';

export interface ErrorMonitoringConfig {
  service: MonitoringService;
  apiKey?: string;
  environment: 'development' | 'staging' | 'production';
  enabledInDevelopment: boolean;
  sampleRate: number; // 0.0 to 1.0
  customEndpoint?: string;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

export interface MonitoringContext {
  userId?: string;
  sessionId?: string;
  streamId?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  connectionQuality?: string;
  isInFallbackMode?: boolean;
  circuitBreakerState?: string;
  queuedMessages?: number;
}

export interface MonitoringBreadcrumb {
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: any;
  timestamp: Date;
}

/**
 * Error Monitoring Manager
 */
export class ErrorMonitoringManager {
  private static instance: ErrorMonitoringManager;
  private config: ErrorMonitoringConfig;
  private breadcrumbs: MonitoringBreadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private isInitialized = false;

  private constructor(config: ErrorMonitoringConfig) {
    this.config = config;
  }

  public static getInstance(config?: ErrorMonitoringConfig): ErrorMonitoringManager {
    if (!ErrorMonitoringManager.instance) {
      if (!config) {
        throw new Error('ErrorMonitoringManager requires config on first instantiation');
      }
      ErrorMonitoringManager.instance = new ErrorMonitoringManager(config);
    }
    return ErrorMonitoringManager.instance;
  }

  /**
   * Initialize the monitoring service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Don't initialize in development unless explicitly enabled
    if (this.config.environment === 'development' && !this.config.enabledInDevelopment) {
      console.log('Error monitoring disabled in development');
      return;
    }

    try {
      await this.initializeService();
      this.isInitialized = true;
      console.log(`Error monitoring initialized: ${this.config.service}`);
    } catch (error) {
      console.error('Failed to initialize error monitoring:', error);
    }
  }

  /**
   * Report an error to the monitoring service
   */
  public reportError(
    error: Error | string,
    context: Partial<MonitoringContext> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    if (!this.shouldReport(severity)) return;

    const enrichedContext = this.enrichContext(context);
    const errorData = this.prepareErrorData(error, enrichedContext, severity);

    this.addBreadcrumb({
      message: `Error reported: ${this.getErrorMessage(error)}`,
      category: 'error',
      level: 'error',
      data: { severity, context: enrichedContext },
      timestamp: new Date(),
    });

    this.sendToService(errorData);
  }

  /**
   * Report a warning or info event
   */
  public reportEvent(
    message: string,
    level: 'info' | 'warning' = 'info',
    context: Partial<MonitoringContext> = {}
  ): void {
    if (!this.isInitialized) return;

    const enrichedContext = this.enrichContext(context);

    this.addBreadcrumb({
      message,
      category: 'event',
      level,
      data: enrichedContext,
      timestamp: new Date(),
    });

    // Only send warnings and above to external service
    if (level === 'warning') {
      this.sendToService({
        message,
        level,
        context: enrichedContext,
        breadcrumbs: this.getBreadcrumbs(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Add a breadcrumb for context tracking
   */
  public addBreadcrumb(breadcrumb: MonitoringBreadcrumb): void {
    this.breadcrumbs.push(breadcrumb);

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Set user context
   */
  public setUser(user: ErrorMonitoringConfig['user']): void {
    this.config.user = user;
  }

  /**
   * Set custom tags
   */
  public setTags(tags: Record<string, string>): void {
    this.config.tags = { ...this.config.tags, ...tags };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ErrorMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Private helper methods
   */

  private async initializeService(): Promise<void> {
    switch (this.config.service) {
      case 'sentry':
        await this.initializeSentry();
        break;
      case 'logrocket':
        await this.initializeLogRocket();
        break;
      case 'custom':
        await this.initializeCustomService();
        break;
      default:
        console.log(`Monitoring service ${this.config.service} not implemented`);
    }
  }

  private async initializeSentry(): Promise<void> {
    // In a real implementation, you would dynamically import Sentry
    console.log('Initializing Sentry error monitoring');
    
    // Example Sentry initialization
    /*
    const { init, configureScope } = await import('@sentry/browser');
    
    init({
      dsn: this.config.apiKey,
      environment: this.config.environment,
      sampleRate: this.config.sampleRate,
      integrations: [
        new BrowserTracing(),
      ],
      tracesSampleRate: 0.1,
    });

    configureScope((scope) => {
      if (this.config.user) {
        scope.setUser(this.config.user);
      }
      if (this.config.tags) {
        Object.entries(this.config.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
    });
    */
  }

  private async initializeLogRocket(): Promise<void> {
    console.log('Initializing LogRocket error monitoring');
    
    // Example LogRocket initialization
    /*
    const LogRocket = await import('logrocket');
    
    LogRocket.init(this.config.apiKey!);
    
    if (this.config.user) {
      LogRocket.identify(this.config.user.id!, this.config.user);
    }
    */
  }

  private async initializeCustomService(): Promise<void> {
    console.log('Initializing custom error monitoring service');
    // Custom service initialization would go here
  }

  private shouldReport(severity: string): boolean {
    if (!this.isInitialized) return false;

    // Sample rate check
    if (Math.random() > this.config.sampleRate) return false;

    // Always report critical errors
    if (severity === 'critical') return true;

    // Environment-based filtering
    if (this.config.environment === 'development') {
      return this.config.enabledInDevelopment;
    }

    return true;
  }

  private enrichContext(context: Partial<MonitoringContext>): MonitoringContext {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      ...context,
    };
  }

  private prepareErrorData(
    error: Error | string,
    context: MonitoringContext,
    severity: string
  ): any {
    const errorMessage = this.getErrorMessage(error);
    const stack = error instanceof Error ? error.stack : undefined;

    return {
      message: errorMessage,
      stack,
      severity,
      context,
      breadcrumbs: this.getBreadcrumbs(),
      timestamp: new Date().toISOString(),
      fingerprint: this.generateFingerprint(errorMessage, stack),
    };
  }

  private getErrorMessage(error: Error | string): string {
    return error instanceof Error ? error.message : error;
  }

  private generateFingerprint(message: string, stack?: string): string {
    // Simple fingerprint generation for error grouping
    const content = stack || message;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private getBreadcrumbs(): MonitoringBreadcrumb[] {
    return this.breadcrumbs.slice(); // Return copy
  }

  private sendToService(data: any): void {
    switch (this.config.service) {
      case 'sentry':
        this.sendToSentry(data);
        break;
      case 'logrocket':
        this.sendToLogRocket(data);
        break;
      case 'custom':
        this.sendToCustomService(data);
        break;
      default:
        console.log('Error data (no service configured):', data);
    }
  }

  private sendToSentry(data: any): void {
    // Example Sentry error reporting
    console.log('Sending to Sentry:', data);
    
    /*
    import * as Sentry from '@sentry/browser';
    
    if (data.stack) {
      Sentry.captureException(new Error(data.message));
    } else {
      Sentry.captureMessage(data.message, data.severity);
    }
    */
  }

  private sendToLogRocket(data: any): void {
    console.log('Sending to LogRocket:', data);
    
    /*
    import LogRocket from 'logrocket';
    
    LogRocket.captureException(new Error(data.message));
    */
  }

  private sendToCustomService(data: any): void {
    if (!this.config.customEndpoint) {
      console.warn('Custom monitoring service configured but no endpoint provided');
      return;
    }

    fetch(this.config.customEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(data),
    }).catch(error => {
      console.error('Failed to send error to custom monitoring service:', error);
    });
  }

  /**
   * Public utility methods
   */

  /**
   * Get current breadcrumbs for debugging
   */
  public getBreadcrumbsForDebug(): MonitoringBreadcrumb[] {
    return this.getBreadcrumbs();
  }

  /**
   * Clear all breadcrumbs
   */
  public clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Test the monitoring service
   */
  public testMonitoring(): void {
    this.reportEvent('Error monitoring test event', 'info');
    this.reportError(new Error('Test error for monitoring service'), {}, 'low');
  }

  /**
   * Get monitoring statistics
   */
  public getStats(): {
    isInitialized: boolean;
    service: MonitoringService;
    environment: string;
    breadcrumbCount: number;
    sampleRate: number;
  } {
    return {
      isInitialized: this.isInitialized,
      service: this.config.service,
      environment: this.config.environment,
      breadcrumbCount: this.breadcrumbs.length,
      sampleRate: this.config.sampleRate,
    };
  }
}

/**
 * Default configuration factory
 */
export function createDefaultMonitoringConfig(
  environment: 'development' | 'staging' | 'production' = 'development'
): ErrorMonitoringConfig {
  return {
    service: 'custom',
    environment,
    enabledInDevelopment: false,
    sampleRate: environment === 'production' ? 0.1 : 1.0,
    tags: {
      feature: 'websocket-error-recovery',
      version: '1.0.0',
    },
  };
}

/**
 * Helper function to integrate with error recovery manager
 */
export function integrateWithErrorRecovery(
  errorRecoveryManager: any,
  monitoringManager: ErrorMonitoringManager
): void {
  // Listen to error recovery events and report to monitoring service
  errorRecoveryManager.on('error:classified', (errorInstance: any) => {
    monitoringManager.reportError(
      errorInstance.originalError,
      {
        userId: errorInstance.context?.userId,
        streamId: errorInstance.context?.streamId,
        connectionQuality: errorInstance.context?.connectionQuality,
      },
      errorInstance.severity
    );

    monitoringManager.addBreadcrumb({
      message: `Error classified: ${errorInstance.category}`,
      category: 'error-recovery',
      level: 'info',
      data: {
        category: errorInstance.category,
        severity: errorInstance.severity,
        strategy: errorInstance.classification.strategy,
      },
      timestamp: new Date(),
    });
  });

  errorRecoveryManager.on('circuit-breaker:opened', () => {
    monitoringManager.reportEvent('Circuit breaker opened', 'warning', {
      circuitBreakerState: 'open',
    });
  });

  errorRecoveryManager.on('fallback:activated', (mode: any) => {
    monitoringManager.reportEvent(`Fallback mode activated: ${mode.name}`, 'warning', {
      isInFallbackMode: true,
    });
  });

  errorRecoveryManager.on('error:recovery:failed', (errorInstance: any) => {
    monitoringManager.reportError(
      `Recovery failed for ${errorInstance.category}: ${errorInstance.message}`,
      {
        userId: errorInstance.context?.userId,
        streamId: errorInstance.context?.streamId,
      },
      'high'
    );
  });
}

// Export a default instance
export const errorMonitoring = ErrorMonitoringManager.getInstance(
  createDefaultMonitoringConfig()
);
