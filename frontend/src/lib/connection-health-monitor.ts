import { Socket } from 'socket.io-client';

/**
 * Connection quality levels based on metrics
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Connection health metrics
 */
export interface ConnectionMetrics {
  latency: number;
  packetLoss: number;
  jitter: number;
  bandwidth: number;
  quality: ConnectionQuality;
  lastPingTime: number;
  consecutiveFailures: number;
  reconnectAttempts: number;
  connectionDuration: number;
  totalDisconnects: number;
  averageLatency: number;
}

/**
 * Connection health events
 */
export interface HealthEvents {
  'health:quality-changed': (quality: ConnectionQuality, metrics: ConnectionMetrics) => void;
  'health:latency-spike': (latency: number, threshold: number) => void;
  'health:connection-unstable': (metrics: ConnectionMetrics) => void;
  'health:recovery-started': (attempt: number) => void;
  'health:recovery-success': (metrics: ConnectionMetrics) => void;
  'health:metrics-updated': (metrics: ConnectionMetrics) => void;
}

/**
 * Configuration for health monitoring
 */
export interface HealthMonitorConfig {
  pingInterval: number;
  pingTimeout: number;
  qualityThresholds: {
    excellent: { maxLatency: number; maxPacketLoss: number };
    good: { maxLatency: number; maxPacketLoss: number };
    fair: { maxLatency: number; maxPacketLoss: number };
    poor: { maxLatency: number; maxPacketLoss: number };
  };
  latencySpikeThreshold: number;
  instabilityThreshold: number;
  metricsHistorySize: number;
}

/**
 * Default configuration for connection health monitoring
 */
export const DEFAULT_HEALTH_CONFIG: HealthMonitorConfig = {
  pingInterval: 10000, // 10 seconds
  pingTimeout: 5000, // 5 seconds
  qualityThresholds: {
    excellent: { maxLatency: 50, maxPacketLoss: 0.01 },
    good: { maxLatency: 150, maxPacketLoss: 0.03 },
    fair: { maxLatency: 300, maxPacketLoss: 0.05 },
    poor: { maxLatency: 500, maxPacketLoss: 0.10 },
    // critical: anything above poor
  },
  latencySpikeThreshold: 1000, // 1 second
  instabilityThreshold: 3, // 3 consecutive failures
  metricsHistorySize: 50, // Keep last 50 measurements
};

/**
 * Connection Health Monitor
 * Monitors WebSocket connection quality and provides health metrics
 */
export class ConnectionHealthMonitor {
  private socket: Socket | null = null;
  private config: HealthMonitorConfig;
  private metrics: ConnectionMetrics;
  private pingInterval: NodeJS.Timeout | null = null;
  private pingStartTime: number = 0;
  private eventListeners: Map<keyof HealthEvents, Set<Function>> = new Map();
  private latencyHistory: number[] = [];
  private packetLossHistory: number[] = [];
  private connectionStartTime: number = 0;
  private lastQuality: ConnectionQuality = 'good';

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): ConnectionMetrics {
    return {
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      bandwidth: 0,
      quality: 'good',
      lastPingTime: 0,
      consecutiveFailures: 0,
      reconnectAttempts: 0,
      connectionDuration: 0,
      totalDisconnects: 0,
      averageLatency: 0,
    };
  }

  /**
   * Start monitoring a socket connection
   */
  public monitor(socket: Socket): void {
    this.socket = socket;
    this.connectionStartTime = Date.now();
    this.setupSocketListeners();
    this.startPingMonitoring();
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.socket = null;
  }

  /**
   * Get current connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection quality
   */
  public getQuality(): ConnectionQuality {
    return this.metrics.quality;
  }

  /**
   * Check if connection is healthy
   */
  public isHealthy(): boolean {
    return ['excellent', 'good', 'fair'].includes(this.metrics.quality);
  }

  /**
   * Add event listener
   */
  public on<K extends keyof HealthEvents>(event: K, listener: HealthEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof HealthEvents>(event: K, listener?: HealthEvents[K]): void {
    if (!listener) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.get(event)?.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof HealthEvents>(event: K, ...args: Parameters<HealthEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in health monitor listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionStartTime = Date.now();
      this.metrics.consecutiveFailures = 0;
      this.updateConnectionDuration();
    });

    this.socket.on('disconnect', () => {
      this.metrics.totalDisconnects++;
      this.updateConnectionDuration();
    });

    this.socket.on('connect_error', () => {
      this.metrics.consecutiveFailures++;
      this.metrics.reconnectAttempts++;
      
      if (this.metrics.consecutiveFailures >= this.config.instabilityThreshold) {
        this.emit('health:connection-unstable', this.getMetrics());
      }
    });

    // Listen for ping responses
    this.socket.on('pong', (startTime: number) => {
      this.handlePongReceived(startTime);
    });

    // Listen for rate limit events to adjust quality
    this.socket.on('rate_limit_exceeded', () => {
      // Temporarily reduce quality when rate limited
      this.adjustQualityForRateLimit();
    });
  }

  /**
   * Start ping monitoring
   */
  private startPingMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);

    // Send initial ping
    this.sendPing();
  }

  /**
   * Send ping to server
   */
  private sendPing(): void {
    if (!this.socket?.connected) {
      this.handlePingTimeout();
      return;
    }

    this.pingStartTime = Date.now();
    this.metrics.lastPingTime = this.pingStartTime;

    // Send ping with timestamp
    this.socket.emit('ping' as any, this.pingStartTime);

    // Set timeout for ping response
    setTimeout(() => {
      if (Date.now() - this.pingStartTime >= this.config.pingTimeout) {
        this.handlePingTimeout();
      }
    }, this.config.pingTimeout);
  }

  /**
   * Handle ping response (pong)
   */
  private handlePongReceived(startTime: number): void {
    const latency = Date.now() - startTime;
    
    // Update latency metrics
    this.updateLatencyMetrics(latency);
    
    // Reset consecutive failures on successful ping
    this.metrics.consecutiveFailures = 0;
    
    // Calculate other metrics
    this.updateJitter(latency);
    this.updatePacketLoss(false);
    this.updateConnectionQuality();
    
    // Check for latency spikes
    if (latency > this.config.latencySpikeThreshold) {
      this.emit('health:latency-spike', latency, this.config.latencySpikeThreshold);
    }

    this.emit('health:metrics-updated', this.getMetrics());
  }

  /**
   * Handle ping timeout
   */
  private handlePingTimeout(): void {
    this.metrics.consecutiveFailures++;
    this.updatePacketLoss(true);
    this.updateConnectionQuality();

    if (this.metrics.consecutiveFailures >= this.config.instabilityThreshold) {
      this.emit('health:connection-unstable', this.getMetrics());
    }

    this.emit('health:metrics-updated', this.getMetrics());
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    this.metrics.latency = latency;
    this.latencyHistory.push(latency);

    // Keep history size manageable
    if (this.latencyHistory.length > this.config.metricsHistorySize) {
      this.latencyHistory.shift();
    }

    // Calculate average latency
    this.metrics.averageLatency = this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length;
  }

  /**
   * Update jitter (latency variation)
   */
  private updateJitter(currentLatency: number): void {
    if (this.latencyHistory.length > 1) {
      const previousLatency = this.latencyHistory[this.latencyHistory.length - 2];
      this.metrics.jitter = Math.abs(currentLatency - previousLatency);
    }
  }

  /**
   * Update packet loss metrics
   */
  private updatePacketLoss(wasLost: boolean): void {
    this.packetLossHistory.push(wasLost ? 1 : 0);

    // Keep history size manageable
    if (this.packetLossHistory.length > this.config.metricsHistorySize) {
      this.packetLossHistory.shift();
    }

    // Calculate packet loss percentage
    const lostPackets = this.packetLossHistory.reduce((sum, lost) => sum + lost, 0);
    this.metrics.packetLoss = lostPackets / this.packetLossHistory.length;
  }

  /**
   * Update connection quality based on metrics
   */
  private updateConnectionQuality(): void {
    const { latency, packetLoss } = this.metrics;
    const { qualityThresholds } = this.config;

    let newQuality: ConnectionQuality;

    if (latency <= qualityThresholds.excellent.maxLatency && packetLoss <= qualityThresholds.excellent.maxPacketLoss) {
      newQuality = 'excellent';
    } else if (latency <= qualityThresholds.good.maxLatency && packetLoss <= qualityThresholds.good.maxPacketLoss) {
      newQuality = 'good';
    } else if (latency <= qualityThresholds.fair.maxLatency && packetLoss <= qualityThresholds.fair.maxPacketLoss) {
      newQuality = 'fair';
    } else if (latency <= qualityThresholds.poor.maxLatency && packetLoss <= qualityThresholds.poor.maxPacketLoss) {
      newQuality = 'poor';
    } else {
      newQuality = 'critical';
    }

    if (newQuality !== this.lastQuality) {
      this.lastQuality = newQuality;
      this.metrics.quality = newQuality;
      this.emit('health:quality-changed', newQuality, this.getMetrics());
    } else {
      this.metrics.quality = newQuality;
    }
  }

  /**
   * Temporarily adjust quality when rate limited
   */
  private adjustQualityForRateLimit(): void {
    // Temporarily reduce quality to indicate rate limiting impact
    if (this.metrics.quality === 'excellent') {
      this.metrics.quality = 'good';
    } else if (this.metrics.quality === 'good') {
      this.metrics.quality = 'fair';
    }
    
    this.emit('health:quality-changed', this.metrics.quality, this.getMetrics());
  }

  /**
   * Update connection duration
   */
  private updateConnectionDuration(): void {
    if (this.connectionStartTime > 0) {
      this.metrics.connectionDuration = Date.now() - this.connectionStartTime;
    }
  }

  /**
   * Reset metrics (useful for reconnection)
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.latencyHistory = [];
    this.packetLossHistory = [];
    this.connectionStartTime = Date.now();
  }

  /**
   * Get human-readable quality description
   */
  public getQualityDescription(quality: ConnectionQuality = this.metrics.quality): string {
    const descriptions = {
      excellent: 'Excellent connection quality',
      good: 'Good connection quality',
      fair: 'Fair connection quality - some delays possible',
      poor: 'Poor connection quality - delays likely',
      critical: 'Critical connection issues - functionality may be limited'
    };
    return descriptions[quality];
  }

  /**
   * Get quality color for UI
   */
  public getQualityColor(quality: ConnectionQuality = this.metrics.quality): string {
    const colors = {
      excellent: '#22c55e', // green
      good: '#84cc16', // lime
      fair: '#eab308', // yellow
      poor: '#f97316', // orange
      critical: '#ef4444' // red
    };
    return colors[quality];
  }
}
