import { EventEmitter } from 'events';

/**
 * WebSocket Performance Metrics
 */
export interface WebSocketMetrics {
  // Connection metrics
  connectionTime: number;
  reconnectionCount: number;
  disconnectionCount: number;
  averageReconnectionTime: number;
  lastConnectionAt: Date | null;
  uptime: number;
  
  // Message metrics
  messagesSent: number;
  messagesReceived: number;
  messagesDropped: number;
  averageMessageSize: number;
  totalBytesTransferred: number;
  messageRate: number; // messages per second
  
  // Latency metrics
  currentLatency: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  jitter: number;
  
  // Error metrics
  errorCount: number;
  errorRate: number;
  lastError: Error | null;
  errorTypes: Map<string, number>;
  
  // Performance metrics
  cpuUsage: number;
  memoryUsage: number;
  throughput: number; // bytes per second
  queueSize: number;
  processingTime: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  maxLatency: number;
  maxJitter: number;
  maxErrorRate: number;
  minThroughput: number;
  maxQueueSize: number;
  maxReconnectionTime: number;
  maxMessageRate: number;
  maxMemoryUsage: number;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Performance snapshot for historical tracking
 */
export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: WebSocketMetrics;
  alerts: PerformanceAlert[];
  health: 'healthy' | 'degraded' | 'critical';
}

/**
 * WebSocket Performance Monitor
 * Tracks and analyzes WebSocket connection performance
 */
export class WebSocketPerformanceMonitor extends EventEmitter {
  private metrics: WebSocketMetrics;
  private thresholds: PerformanceThresholds;
  private history: PerformanceSnapshot[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private monitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private latencyCheckInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private lastMessageTime: number = 0;
  private messageTimestamps: number[] = [];
  private latencyMeasurements: number[] = [];
  private bytesTransferred: number = 0;
  private performanceObserver: PerformanceObserver | null = null;
  
  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super();
    
    this.metrics = this.initializeMetrics();
    this.thresholds = {
      maxLatency: 100, // ms
      maxJitter: 50, // ms
      maxErrorRate: 0.01, // 1%
      minThroughput: 100000, // 100KB/s
      maxQueueSize: 100,
      maxReconnectionTime: 5000, // 5s
      maxMessageRate: 1000, // messages per second
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      ...thresholds
    };
    
    this.setupPerformanceObserver();
  }
  
  /**
   * Initialize metrics
   */
  private initializeMetrics(): WebSocketMetrics {
    return {
      connectionTime: 0,
      reconnectionCount: 0,
      disconnectionCount: 0,
      averageReconnectionTime: 0,
      lastConnectionAt: null,
      uptime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      averageMessageSize: 0,
      totalBytesTransferred: 0,
      messageRate: 0,
      currentLatency: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      jitter: 0,
      errorCount: 0,
      errorRate: 0,
      lastError: null,
      errorTypes: new Map(),
      cpuUsage: 0,
      memoryUsage: 0,
      throughput: 0,
      queueSize: 0,
      processingTime: 0
    };
  }
  
  /**
   * Setup performance observer for resource timing
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('ws://')) {
            this.updateResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });
      
      this.performanceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('PerformanceObserver not available:', error);
    }
  }
  
  /**
   * Start monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
      this.updateHistory();
    }, intervalMs);
    
    // Start latency check interval
    this.latencyCheckInterval = setInterval(() => {
      this.measureLatency();
    }, 5000);
    
    this.emit('monitoring:started');
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }
    
    this.emit('monitoring:stopped');
  }
  
  /**
   * Record connection event
   */
  recordConnection(): void {
    this.connectionStartTime = Date.now();
    this.metrics.lastConnectionAt = new Date();
    
    if (this.metrics.reconnectionCount > 0) {
      const reconnectionTime = Date.now() - this.lastMessageTime;
      this.updateAverageReconnectionTime(reconnectionTime);
    }
    
    this.emit('connection:established', {
      timestamp: new Date(),
      reconnectionCount: this.metrics.reconnectionCount
    });
  }
  
  /**
   * Record disconnection event
   */
  recordDisconnection(error?: Error): void {
    this.metrics.disconnectionCount++;
    
    if (error) {
      this.recordError(error);
    }
    
    const sessionDuration = Date.now() - this.connectionStartTime;
    this.metrics.uptime += sessionDuration;
    
    this.emit('connection:lost', {
      timestamp: new Date(),
      sessionDuration,
      error
    });
  }
  
  /**
   * Record reconnection
   */
  recordReconnection(): void {
    this.metrics.reconnectionCount++;
    this.recordConnection();
  }
  
  /**
   * Record message sent
   */
  recordMessageSent(message: any): void {
    this.metrics.messagesSent++;
    this.updateMessageMetrics(message);
    this.messageTimestamps.push(Date.now());
    this.cleanOldTimestamps();
  }
  
  /**
   * Record message received
   */
  recordMessageReceived(message: any): void {
    this.metrics.messagesReceived++;
    this.updateMessageMetrics(message);
    this.lastMessageTime = Date.now();
  }
  
  /**
   * Record message dropped
   */
  recordMessageDropped(): void {
    this.metrics.messagesDropped++;
  }
  
  /**
   * Record latency measurement
   */
  recordLatency(latency: number): void {
    this.metrics.currentLatency = latency;
    this.latencyMeasurements.push(latency);
    
    // Keep only last 100 measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }
    
    this.updateLatencyMetrics();
  }
  
  /**
   * Record error
   */
  recordError(error: Error): void {
    this.metrics.errorCount++;
    this.metrics.lastError = error;
    
    const errorType = error.name || 'Unknown';
    const count = this.metrics.errorTypes.get(errorType) || 0;
    this.metrics.errorTypes.set(errorType, count + 1);
    
    this.updateErrorRate();
    
    this.emit('error:occurred', {
      error,
      timestamp: new Date(),
      errorCount: this.metrics.errorCount
    });
  }
  
  /**
   * Update queue size
   */
  updateQueueSize(size: number): void {
    this.metrics.queueSize = size;
  }
  
  /**
   * Update processing time
   */
  updateProcessingTime(time: number): void {
    this.metrics.processingTime = time;
  }
  
  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    // Update message rate
    this.updateMessageRate();
    
    // Update throughput
    this.updateThroughput();
    
    // Update memory usage
    this.updateMemoryUsage();
    
    // Update CPU usage (simplified)
    this.updateCPUUsage();
    
    // Update uptime
    if (this.connectionStartTime > 0) {
      this.metrics.uptime = Date.now() - this.connectionStartTime;
    }
  }
  
  /**
   * Update message metrics
   */
  private updateMessageMetrics(message: any): void {
    const size = this.getMessageSize(message);
    this.bytesTransferred += size;
    this.metrics.totalBytesTransferred = this.bytesTransferred;
    
    // Update average message size
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    this.metrics.averageMessageSize = 
      (this.metrics.averageMessageSize * (totalMessages - 1) + size) / totalMessages;
  }
  
  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(): void {
    if (this.latencyMeasurements.length === 0) return;
    
    // Calculate average
    const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / this.latencyMeasurements.length;
    
    // Update min/max
    this.metrics.minLatency = Math.min(...this.latencyMeasurements);
    this.metrics.maxLatency = Math.max(...this.latencyMeasurements);
    
    // Calculate jitter (standard deviation)
    const mean = this.metrics.averageLatency;
    const squaredDiffs = this.latencyMeasurements.map(l => Math.pow(l - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    this.metrics.jitter = Math.sqrt(avgSquaredDiff);
  }
  
  /**
   * Update average reconnection time
   */
  private updateAverageReconnectionTime(time: number): void {
    const count = this.metrics.reconnectionCount;
    this.metrics.averageReconnectionTime = 
      (this.metrics.averageReconnectionTime * (count - 1) + time) / count;
  }
  
  /**
   * Update error rate
   */
  private updateErrorRate(): void {
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    if (totalMessages > 0) {
      this.metrics.errorRate = this.metrics.errorCount / totalMessages;
    }
  }
  
  /**
   * Update message rate
   */
  private updateMessageRate(): void {
    const now = Date.now();
    const recentTimestamps = this.messageTimestamps.filter(t => now - t < 1000);
    this.metrics.messageRate = recentTimestamps.length;
  }
  
  /**
   * Update throughput
   */
  private updateThroughput(): void {
    const duration = (Date.now() - this.connectionStartTime) / 1000; // seconds
    if (duration > 0) {
      this.metrics.throughput = this.metrics.totalBytesTransferred / duration;
    }
  }
  
  /**
   * Update memory usage
   */
  private updateMemoryUsage(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }
  
  /**
   * Update CPU usage (simplified estimation)
   */
  private updateCPUUsage(): void {
    // This is a simplified estimation based on message processing rate
    // In a real implementation, you might use the Performance API or a worker
    const processingLoad = this.metrics.messageRate * this.metrics.processingTime;
    this.metrics.cpuUsage = Math.min(processingLoad / 1000, 100); // Percentage
  }
  
  /**
   * Update resource metrics from Performance API
   */
  private updateResourceMetrics(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.requestStart;
    this.recordLatency(duration);
  }
  
  /**
   * Measure latency with ping
   */
  private measureLatency(): void {
    const timestamp = Date.now();
    this.emit('ping:request', timestamp);
  }
  
  /**
   * Handle pong response
   */
  handlePong(timestamp: number): void {
    const latency = Date.now() - timestamp;
    this.recordLatency(latency);
  }
  
  /**
   * Check performance thresholds
   */
  private checkThresholds(): void {
    // Check latency
    if (this.metrics.currentLatency > this.thresholds.maxLatency) {
      this.createAlert('latency', 'High latency detected', 'warning');
    }
    
    // Check jitter
    if (this.metrics.jitter > this.thresholds.maxJitter) {
      this.createAlert('jitter', 'High jitter detected', 'warning');
    }
    
    // Check error rate
    if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
      this.createAlert('errorRate', 'High error rate', 'critical');
    }
    
    // Check throughput
    if (this.metrics.throughput < this.thresholds.minThroughput && this.metrics.throughput > 0) {
      this.createAlert('throughput', 'Low throughput', 'warning');
    }
    
    // Check queue size
    if (this.metrics.queueSize > this.thresholds.maxQueueSize) {
      this.createAlert('queueSize', 'Queue size exceeded', 'critical');
    }
    
    // Check message rate
    if (this.metrics.messageRate > this.thresholds.maxMessageRate) {
      this.createAlert('messageRate', 'High message rate', 'warning');
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.createAlert('memoryUsage', 'High memory usage', 'critical');
    }
    
    // Resolve alerts that are no longer triggered
    this.resolveAlerts();
  }
  
  /**
   * Create performance alert
   */
  private createAlert(metric: string, message: string, type: 'warning' | 'critical'): void {
    const alertId = `alert_${metric}`;
    
    if (this.alerts.has(alertId)) {
      // Alert already exists
      return;
    }
    
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      metric,
      threshold: this.thresholds[metric as keyof PerformanceThresholds] as number,
      currentValue: this.metrics[metric as keyof WebSocketMetrics] as number,
      message,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.set(alertId, alert);
    this.emit('alert:triggered', alert);
  }
  
  /**
   * Resolve alerts
   */
  private resolveAlerts(): void {
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved) continue;
      
      const currentValue = this.metrics[alert.metric as keyof WebSocketMetrics] as number;
      const threshold = alert.threshold;
      
      let shouldResolve = false;
      
      // Check if alert should be resolved
      switch (alert.metric) {
        case 'latency':
          shouldResolve = this.metrics.currentLatency <= this.thresholds.maxLatency;
          break;
        case 'jitter':
          shouldResolve = this.metrics.jitter <= this.thresholds.maxJitter;
          break;
        case 'errorRate':
          shouldResolve = this.metrics.errorRate <= this.thresholds.maxErrorRate;
          break;
        case 'throughput':
          shouldResolve = this.metrics.throughput >= this.thresholds.minThroughput;
          break;
        case 'queueSize':
          shouldResolve = this.metrics.queueSize <= this.thresholds.maxQueueSize;
          break;
        case 'messageRate':
          shouldResolve = this.metrics.messageRate <= this.thresholds.maxMessageRate;
          break;
        case 'memoryUsage':
          shouldResolve = this.metrics.memoryUsage <= this.thresholds.maxMemoryUsage;
          break;
      }
      
      if (shouldResolve) {
        alert.resolved = true;
        this.emit('alert:resolved', alert);
        this.alerts.delete(alertId);
      }
    }
  }
  
  /**
   * Update history
   */
  private updateHistory(): void {
    const health = this.calculateHealth();
    
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      metrics: { ...this.metrics },
      alerts: Array.from(this.alerts.values()),
      health
    };
    
    this.history.push(snapshot);
    
    // Keep only last hour of history (assuming 1s intervals)
    if (this.history.length > 3600) {
      this.history.shift();
    }
    
    this.emit('snapshot:created', snapshot);
  }
  
  /**
   * Calculate overall health
   */
  private calculateHealth(): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = Array.from(this.alerts.values())
      .filter(a => a.type === 'critical' && !a.resolved);
    
    const warningAlerts = Array.from(this.alerts.values())
      .filter(a => a.type === 'warning' && !a.resolved);
    
    if (criticalAlerts.length > 0) {
      return 'critical';
    } else if (warningAlerts.length > 2) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
  
  /**
   * Clean old timestamps
   */
  private cleanOldTimestamps(): void {
    const now = Date.now();
    this.messageTimestamps = this.messageTimestamps.filter(t => now - t < 60000);
  }
  
  /**
   * Get message size
   */
  private getMessageSize(message: any): number {
    try {
      return JSON.stringify(message).length;
    } catch {
      return 0;
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get performance history
   */
  getHistory(duration?: number): PerformanceSnapshot[] {
    if (!duration) {
      return [...this.history];
    }
    
    const cutoff = Date.now() - duration;
    return this.history.filter(s => s.timestamp.getTime() > cutoff);
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }
  
  /**
   * Get health status
   */
  getHealth(): 'healthy' | 'degraded' | 'critical' {
    return this.calculateHealth();
  }
  
  /**
   * Export metrics for analytics
   */
  exportMetrics(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      health: this.getHealth(),
      alerts: this.getActiveAlerts(),
      thresholds: this.thresholds
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.history = [];
    this.alerts.clear();
    this.messageTimestamps = [];
    this.latencyMeasurements = [];
    this.bytesTransferred = 0;
    
    this.emit('metrics:reset');
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopMonitoring();
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    this.removeAllListeners();
  }
}

// Export singleton instance
export const wsPerformanceMonitor = new WebSocketPerformanceMonitor();