import { VdoEventManager } from './event-manager';
import type { VdoEvent } from './types';

// Statistics types
export interface StreamStatistics {
  // Video stats
  fps: number;
  fpsMin: number;
  fpsMax: number;
  fpsAvg: number;
  
  // Network stats
  bitrate: number;
  bitrateMin: number;
  bitrateMax: number;
  bitrateAvg: number;
  packetLoss: number;
  packetLossMax: number;
  packetLossAvg: number;
  latency: number;
  latencyMin: number;
  latencyMax: number;
  latencyAvg: number;
  jitter: number;
  jitterMax: number;
  jitterAvg: number;
  
  // Connection stats
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  connectionScore: number; // 0-100
  reconnectCount: number;
  totalDisconnectDuration: number;
  
  // Stream duration
  streamStartTime: number | null;
  streamDuration: number;
  recordingDuration: number;
  
  // Data usage
  totalBytesReceived: number;
  totalBytesSent: number;
  averageUploadSpeed: number;
  averageDownloadSpeed: number;
  
  // Viewer stats
  currentViewers: number;
  peakViewers: number;
  totalUniqueViewers: number;
  averageViewDuration: number;
  
  // Resolution stats
  currentResolution: { width: number; height: number } | null;
  resolutionChanges: number;
  
  // Audio stats
  audioLevel: number;
  audioLevelPeak: number;
  audioDropouts: number;
}

export interface StatisticsSnapshot {
  timestamp: number;
  stats: StreamStatistics;
  metadata?: Record<string, any>;
}

export interface TrendData {
  metric: keyof StreamStatistics;
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  samples: number;
}

export interface StatisticsConfig {
  // History settings
  maxHistorySize?: number;
  historyInterval?: number; // ms between snapshots
  
  // Aggregation settings
  aggregationWindow?: number; // ms for moving averages
  trendWindow?: number; // ms for trend analysis
  
  // Memory management
  enableCompression?: boolean;
  compressionInterval?: number; // ms
  compressionRatio?: number; // Keep 1 out of N old samples
  
  // Export settings
  enableExport?: boolean;
  exportFormat?: 'json' | 'csv';
  
  // Thresholds for quality scoring
  qualityThresholds?: {
    excellent: number; // > 90
    good: number;      // > 70
    fair: number;      // > 50
    poor: number;      // > 30
    // critical: <= 30
  };
}

export class RealTimeStatsTracker {
  private config: Required<StatisticsConfig>;
  private stats: StreamStatistics;
  private history: StatisticsSnapshot[] = [];
  private eventManager: VdoEventManager | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private compressionTimer: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = Date.now();
  private eventListeners: Map<string, (...args: any[]) => void> = new Map();
  
  // Moving averages
  private movingWindowData: Map<keyof StreamStatistics, number[]> = new Map();
  private windowSize: number;
  
  // Trend tracking
  private trendData: Map<keyof StreamStatistics, number[]> = new Map();
  private trendWindowSize: number;
  
  constructor(config: StatisticsConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize || 1000,
      historyInterval: config.historyInterval || 1000,
      aggregationWindow: config.aggregationWindow || 10000,
      trendWindow: config.trendWindow || 30000,
      enableCompression: config.enableCompression ?? true,
      compressionInterval: config.compressionInterval || 60000,
      compressionRatio: config.compressionRatio || 10,
      enableExport: config.enableExport ?? true,
      exportFormat: config.exportFormat || 'json',
      qualityThresholds: {
        excellent: 90,
        good: 70,
        fair: 50,
        poor: 30,
        ...config.qualityThresholds
      }
    };
    
    this.windowSize = Math.floor(this.config.aggregationWindow / this.config.historyInterval);
    this.trendWindowSize = Math.floor(this.config.trendWindow / this.config.historyInterval);
    
    this.stats = this.createEmptyStats();
    
    // Start periodic updates
    this.startPeriodicUpdates();
    
    // Start compression if enabled
    if (this.config.enableCompression) {
      this.startCompression();
    }
  }
  
  private createEmptyStats(): StreamStatistics {
    return {
      fps: 0,
      fpsMin: Infinity,
      fpsMax: 0,
      fpsAvg: 0,
      bitrate: 0,
      bitrateMin: Infinity,
      bitrateMax: 0,
      bitrateAvg: 0,
      packetLoss: 0,
      packetLossMax: 0,
      packetLossAvg: 0,
      latency: 0,
      latencyMin: Infinity,
      latencyMax: 0,
      latencyAvg: 0,
      jitter: 0,
      jitterMax: 0,
      jitterAvg: 0,
      connectionQuality: 'good',
      connectionScore: 100,
      reconnectCount: 0,
      totalDisconnectDuration: 0,
      streamStartTime: null,
      streamDuration: 0,
      recordingDuration: 0,
      totalBytesReceived: 0,
      totalBytesSent: 0,
      averageUploadSpeed: 0,
      averageDownloadSpeed: 0,
      currentViewers: 0,
      peakViewers: 0,
      totalUniqueViewers: 0,
      averageViewDuration: 0,
      currentResolution: null,
      resolutionChanges: 0,
      audioLevel: 0,
      audioLevelPeak: 0,
      audioDropouts: 0
    };
  }
  
  /**
   * Initialize with event manager
   */
  public initialize(eventManager: VdoEventManager): void {
    this.eventManager = eventManager;
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.eventManager) return;
    
    // Network stats
    const statsHandler = (event: VdoEvent) => {
      if (event.value || event.stats) {
        this.updateNetworkStats(event.value || event.stats);
      }
    };
    this.eventManager.on('stats', statsHandler);
    this.eventListeners.set('stats', statsHandler);
    
    // Video stats
    const videoStatsHandler = (event: VdoEvent) => {
      if (event.value) {
        this.updateVideoStats(event.value);
      }
    };
    this.eventManager.on('videoStats', videoStatsHandler);
    this.eventListeners.set('videoStats', videoStatsHandler);
    
    // Connection events
    const connectedHandler = () => {
      this.stats.streamStartTime = Date.now();
    };
    this.eventManager.on('connected', connectedHandler);
    this.eventListeners.set('connected', connectedHandler);
    
    const disconnectedHandler = () => {
      this.stats.reconnectCount++;
    };
    this.eventManager.on('disconnected', disconnectedHandler);
    this.eventListeners.set('disconnected', disconnectedHandler);
    
    const reconnectingHandler = () => {
      // Track disconnect duration
    };
    this.eventManager.on('reconnecting', reconnectingHandler);
    this.eventListeners.set('reconnecting', reconnectingHandler);
    
    // Viewer events
    const viewerJoinedHandler = () => {
      this.stats.currentViewers++;
      this.stats.totalUniqueViewers++;
      if (this.stats.currentViewers > this.stats.peakViewers) {
        this.stats.peakViewers = this.stats.currentViewers;
      }
    };
    this.eventManager.on('viewerJoined', viewerJoinedHandler);
    this.eventListeners.set('viewerJoined', viewerJoinedHandler);
    
    const viewerLeftHandler = () => {
      this.stats.currentViewers = Math.max(0, this.stats.currentViewers - 1);
    };
    this.eventManager.on('viewerLeft', viewerLeftHandler);
    this.eventListeners.set('viewerLeft', viewerLeftHandler);
    
    // Resolution changes
    const resolutionChangedHandler = (event: VdoEvent) => {
      if (event.value) {
        this.stats.currentResolution = event.value;
        this.stats.resolutionChanges++;
      }
    };
    this.eventManager.on('resolutionChanged', resolutionChangedHandler);
    this.eventListeners.set('resolutionChanged', resolutionChangedHandler);
    
    // Audio events
    const audioLevelHandler = (event: VdoEvent) => {
      if (event.value && typeof event.value.level === 'number') {
        this.stats.audioLevel = event.value.level;
        if (event.value.level > this.stats.audioLevelPeak) {
          this.stats.audioLevelPeak = event.value.level;
        }
      }
    };
    this.eventManager.on('audioLevel', audioLevelHandler);
    this.eventListeners.set('audioLevel', audioLevelHandler);
    
    const audioDropoutHandler = () => {
      this.stats.audioDropouts++;
    };
    this.eventManager.on('audioDropout', audioDropoutHandler);
    this.eventListeners.set('audioDropout', audioDropoutHandler);
  }
  
  /**
   * Update network statistics
   */
  private updateNetworkStats(data: any): void {
    const now = Date.now();
    const timeDelta = (now - this.lastUpdateTime) / 1000; // seconds
    
    // Update bitrate
    if (data.bitrate !== undefined) {
      this.stats.bitrate = data.bitrate;
      this.stats.bitrateMin = Math.min(this.stats.bitrateMin, data.bitrate);
      this.stats.bitrateMax = Math.max(this.stats.bitrateMax, data.bitrate);
      this.updateMovingAverage('bitrate', data.bitrate);
    }
    
    // Update packet loss
    if (data.packetLoss !== undefined) {
      this.stats.packetLoss = data.packetLoss;
      this.stats.packetLossMax = Math.max(this.stats.packetLossMax, data.packetLoss);
      this.updateMovingAverage('packetLoss', data.packetLoss);
    }
    
    // Update latency
    if (data.latency !== undefined) {
      this.stats.latency = data.latency;
      this.stats.latencyMin = Math.min(this.stats.latencyMin, data.latency);
      this.stats.latencyMax = Math.max(this.stats.latencyMax, data.latency);
      this.updateMovingAverage('latency', data.latency);
    }
    
    // Update jitter
    if (data.jitter !== undefined) {
      this.stats.jitter = data.jitter;
      this.stats.jitterMax = Math.max(this.stats.jitterMax, data.jitter);
      this.updateMovingAverage('jitter', data.jitter);
    }
    
    // Update data usage
    if (data.bytesReceived !== undefined) {
      const bytesDelta = data.bytesReceived - this.stats.totalBytesReceived;
      this.stats.totalBytesReceived = data.bytesReceived;
      if (timeDelta > 0) {
        this.stats.averageDownloadSpeed = bytesDelta / timeDelta;
      }
    }
    
    if (data.bytesSent !== undefined) {
      const bytesDelta = data.bytesSent - this.stats.totalBytesSent;
      this.stats.totalBytesSent = data.bytesSent;
      if (timeDelta > 0) {
        this.stats.averageUploadSpeed = bytesDelta / timeDelta;
      }
    }
    
    // Calculate connection quality
    this.updateConnectionQuality();
    
    this.lastUpdateTime = now;
  }
  
  /**
   * Update video statistics
   */
  private updateVideoStats(data: any): void {
    if (data.fps !== undefined) {
      this.stats.fps = data.fps;
      this.stats.fpsMin = Math.min(this.stats.fpsMin, data.fps);
      this.stats.fpsMax = Math.max(this.stats.fpsMax, data.fps);
      this.updateMovingAverage('fps', data.fps);
    }
  }
  
  /**
   * Update moving average for a metric
   */
  private updateMovingAverage(metric: keyof StreamStatistics, value: number): void {
    if (!this.movingWindowData.has(metric)) {
      this.movingWindowData.set(metric, []);
    }
    
    const window = this.movingWindowData.get(metric)!;
    window.push(value);
    
    // Keep window size limited
    if (window.length > this.windowSize) {
      window.shift();
    }
    
    // Calculate average
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    
    // Update average fields
    switch (metric) {
      case 'fps':
        this.stats.fpsAvg = avg;
        break;
      case 'bitrate':
        this.stats.bitrateAvg = avg;
        break;
      case 'packetLoss':
        this.stats.packetLossAvg = avg;
        break;
      case 'latency':
        this.stats.latencyAvg = avg;
        break;
      case 'jitter':
        this.stats.jitterAvg = avg;
        break;
    }
    
    // Update trend data
    this.updateTrendData(metric, value);
  }
  
  /**
   * Update trend data for a metric
   */
  private updateTrendData(metric: keyof StreamStatistics, value: number): void {
    if (!this.trendData.has(metric)) {
      this.trendData.set(metric, []);
    }
    
    const trend = this.trendData.get(metric)!;
    trend.push(value);
    
    if (trend.length > this.trendWindowSize) {
      trend.shift();
    }
  }
  
  /**
   * Calculate connection quality based on metrics
   */
  private updateConnectionQuality(): void {
    let score = 100;
    
    // Deduct points for poor metrics
    if (this.stats.packetLoss > 5) score -= 20;
    if (this.stats.packetLoss > 10) score -= 20;
    if (this.stats.latency > 100) score -= 10;
    if (this.stats.latency > 200) score -= 15;
    if (this.stats.jitter > 30) score -= 10;
    if (this.stats.jitter > 50) score -= 10;
    if (this.stats.fps < 24) score -= 15;
    if (this.stats.fps < 15) score -= 15;
    if (this.stats.bitrate < 1000000) score -= 10;
    if (this.stats.bitrate < 500000) score -= 10;
    
    score = Math.max(0, Math.min(100, score));
    this.stats.connectionScore = score;
    
    // Determine quality level
    const thresholds = this.config.qualityThresholds;
    if (score > thresholds.excellent) {
      this.stats.connectionQuality = 'excellent';
    } else if (score > thresholds.good) {
      this.stats.connectionQuality = 'good';
    } else if (score > thresholds.fair) {
      this.stats.connectionQuality = 'fair';
    } else if (score > thresholds.poor) {
      this.stats.connectionQuality = 'poor';
    } else {
      this.stats.connectionQuality = 'critical';
    }
  }
  
  /**
   * Start periodic snapshot updates
   */
  private startPeriodicUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.takeSnapshot();
    }, this.config.historyInterval);
  }
  
  /**
   * Take a snapshot of current stats
   */
  private takeSnapshot(): void {
    // Update stream duration
    if (this.stats.streamStartTime) {
      this.stats.streamDuration = Date.now() - this.stats.streamStartTime;
    }
    
    // Update viewer average duration
    if (this.stats.totalUniqueViewers > 0) {
      this.stats.averageViewDuration = this.stats.streamDuration / this.stats.totalUniqueViewers;
    }
    
    const snapshot: StatisticsSnapshot = {
      timestamp: Date.now(),
      stats: { ...this.stats }
    };
    
    this.history.push(snapshot);
    
    // Limit history size
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Start compression timer
   */
  private startCompression(): void {
    this.compressionTimer = setInterval(() => {
      this.compressHistory();
    }, this.config.compressionInterval);
  }
  
  /**
   * Compress old history data
   */
  private compressHistory(): void {
    if (this.history.length < 100) return;
    
    const cutoff = Date.now() - this.config.compressionInterval;
    const oldData: StatisticsSnapshot[] = [];
    const newData: StatisticsSnapshot[] = [];
    
    this.history.forEach(snapshot => {
      if (snapshot.timestamp < cutoff) {
        oldData.push(snapshot);
      } else {
        newData.push(snapshot);
      }
    });
    
    // Keep only every Nth old sample
    const compressedOld = oldData.filter((_, index) => 
      index % this.config.compressionRatio === 0
    );
    
    this.history = [...compressedOld, ...newData];
  }
  
  /**
   * Get current statistics
   */
  public getStats(): StreamStatistics {
    return { ...this.stats };
  }
  
  /**
   * Get statistics history
   */
  public getHistory(limit?: number): StatisticsSnapshot[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }
  
  /**
   * Get trend analysis for metrics
   */
  public getTrends(metrics?: (keyof StreamStatistics)[]): TrendData[] {
    const trends: TrendData[] = [];
    const metricsToAnalyze = metrics || Array.from(this.trendData.keys());
    
    metricsToAnalyze.forEach(metric => {
      const data = this.trendData.get(metric);
      if (!data || data.length < 2) return;
      
      // Calculate trend using linear regression
      const n = data.length;
      const sumX = (n * (n + 1)) / 2;
      const sumY = data.reduce((a, b) => a + b, 0);
      const sumXY = data.reduce((sum, y, x) => sum + (x + 1) * y, 0);
      const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const avgValue = sumY / n;
      const changePercent = avgValue > 0 ? (slope / avgValue) * 100 : 0;
      
      let trend: 'improving' | 'stable' | 'degrading';
      
      // Determine trend based on metric type and slope
      const improvingMetrics = ['fps', 'bitrate', 'connectionScore'];
      const degradingMetrics = ['packetLoss', 'latency', 'jitter', 'audioDropouts'];
      
      if (Math.abs(changePercent) < 5) {
        trend = 'stable';
      } else if (improvingMetrics.includes(metric as string)) {
        trend = slope > 0 ? 'improving' : 'degrading';
      } else if (degradingMetrics.includes(metric as string)) {
        trend = slope < 0 ? 'improving' : 'degrading';
      } else {
        trend = 'stable';
      }
      
      trends.push({
        metric,
        trend,
        changePercent,
        samples: n
      });
    });
    
    return trends;
  }
  
  /**
   * Export statistics to JSON
   */
  public exportToJSON(): string {
    return JSON.stringify({
      currentStats: this.stats,
      history: this.history,
      trends: this.getTrends(),
      metadata: {
        exportTime: Date.now(),
        historySize: this.history.length,
        streamDuration: this.stats.streamDuration
      }
    }, null, 2);
  }
  
  /**
   * Export statistics to CSV
   */
  public exportToCSV(): string {
    const headers = Object.keys(this.stats).filter(key => 
      typeof this.stats[key as keyof StreamStatistics] !== 'object'
    );
    
    const rows = this.history.map(snapshot => {
      return headers.map(header => {
        const value = snapshot.stats[header as keyof StreamStatistics];
        return typeof value === 'number' ? value.toFixed(2) : value;
      }).join(',');
    });
    
    return [
      headers.join(','),
      ...rows
    ].join('\n');
  }
  
  /**
   * Export based on configured format
   */
  public export(): string {
    if (!this.config.enableExport) {
      throw new Error('Export is disabled');
    }
    
    return this.config.exportFormat === 'csv' 
      ? this.exportToCSV() 
      : this.exportToJSON();
  }
  
  /**
   * Reset statistics
   */
  public reset(): void {
    this.stats = this.createEmptyStats();
    this.history = [];
    this.movingWindowData.clear();
    this.trendData.clear();
  }
  
  /**
   * Clear specific metric history
   */
  public clearMetricHistory(metric: keyof StreamStatistics): void {
    this.movingWindowData.delete(metric);
    this.trendData.delete(metric);
    
    // Reset min/max values
    switch (metric) {
      case 'fps':
        this.stats.fpsMin = Infinity;
        this.stats.fpsMax = 0;
        break;
      case 'bitrate':
        this.stats.bitrateMin = Infinity;
        this.stats.bitrateMax = 0;
        break;
      case 'latency':
        this.stats.latencyMin = Infinity;
        this.stats.latencyMax = 0;
        break;
    }
  }
  
  /**
   * Get aggregated statistics for a time window
   */
  public getAggregatedStats(windowMs: number): Partial<StreamStatistics> {
    const cutoff = Date.now() - windowMs;
    const windowData = this.history.filter(s => s.timestamp > cutoff);
    
    if (windowData.length === 0) {
      return {};
    }
    
    const aggregated: Partial<StreamStatistics> = {};
    
    // Calculate averages for numeric fields
    const numericFields: (keyof StreamStatistics)[] = [
      'fps', 'bitrate', 'packetLoss', 'latency', 'jitter',
      'connectionScore', 'currentViewers'
    ];
    
    numericFields.forEach(field => {
      const values = windowData.map(s => s.stats[field] as number);
      const sum = values.reduce((a, b) => a + b, 0);
      (aggregated as any)[field] = sum / values.length;
    });
    
    return aggregated;
  }
  
  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.compressionTimer) {
      clearInterval(this.compressionTimer);
      this.compressionTimer = null;
    }
    
    this.eventListeners.forEach((listener, event) => {
      this.eventManager?.off(event, listener);
    });
    
    this.eventListeners.clear();
    this.movingWindowData.clear();
    this.trendData.clear();
    this.history = [];
  }
}