import { VdoStats } from './types';

export interface StatsHistory {
  timestamp: number;
  stats: VdoStats;
}

export interface AggregatedStats {
  avgBitrate: {
    audio: number;
    video: number;
    total: number;
  };
  avgFramerate: number;
  avgPacketLoss: number;
  avgLatency: number;
  avgJitter: number;
  peakBitrate: {
    audio: number;
    video: number;
    total: number;
  };
  connectionStability: number; // 0-100
}

export class VdoStatsTracker {
  private history: StatsHistory[] = [];
  private maxHistorySize: number;
  private listeners: Set<(stats: AggregatedStats) => void> = new Set();

  constructor(maxHistorySize: number = 300) { // 5 minutes at 1 update per second
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Add new stats to history
   */
  addStats(stats: VdoStats): void {
    this.history.push({
      timestamp: Date.now(),
      stats,
    });

    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get aggregated stats over a time window
   */
  getAggregatedStats(windowMs: number = 30000): AggregatedStats | null {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const recentStats = this.history.filter(h => h.timestamp >= windowStart);
    
    if (recentStats.length === 0) {
      return null;
    }

    // Calculate averages
    const avgBitrate = {
      audio: this.average(recentStats.map(h => h.stats.bitrate.audio)),
      video: this.average(recentStats.map(h => h.stats.bitrate.video)),
      total: this.average(recentStats.map(h => h.stats.bitrate.total)),
    };

    const avgFramerate = this.average(recentStats.map(h => h.stats.framerate));
    const avgPacketLoss = this.average(recentStats.map(h => h.stats.packetLoss));
    const avgLatency = this.average(recentStats.map(h => h.stats.latency));
    const avgJitter = this.average(recentStats.map(h => h.stats.jitter));

    // Calculate peaks
    const peakBitrate = {
      audio: Math.max(...recentStats.map(h => h.stats.bitrate.audio)),
      video: Math.max(...recentStats.map(h => h.stats.bitrate.video)),
      total: Math.max(...recentStats.map(h => h.stats.bitrate.total)),
    };

    // Calculate connection stability (based on packet loss and jitter)
    const connectionStability = this.calculateStability(avgPacketLoss, avgJitter);

    return {
      avgBitrate,
      avgFramerate,
      avgPacketLoss,
      avgLatency,
      avgJitter,
      peakBitrate,
      connectionStability,
    };
  }

  /**
   * Get raw stats history
   */
  getHistory(limit?: number): StatsHistory[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get latest stats
   */
  getLatestStats(): VdoStats | null {
    if (this.history.length === 0) {
      return null;
    }
    return this.history[this.history.length - 1].stats;
  }

  /**
   * Subscribe to aggregated stats updates
   */
  onAggregatedStats(listener: (stats: AggregatedStats) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Unsubscribe from aggregated stats updates
   */
  offAggregatedStats(listener: (stats: AggregatedStats) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Calculate connection stability score (0-100)
   */
  private calculateStability(packetLoss: number, jitter: number): number {
    // Weight packet loss more heavily than jitter
    const packetLossScore = Math.max(0, 100 - packetLoss * 20); // 5% loss = 0 score
    const jitterScore = Math.max(0, 100 - jitter * 2); // 50ms jitter = 0 score
    
    return Math.round(packetLossScore * 0.7 + jitterScore * 0.3);
  }

  /**
   * Notify listeners of new aggregated stats
   */
  private notifyListeners(): void {
    const aggregated = this.getAggregatedStats();
    if (aggregated) {
      this.listeners.forEach(listener => {
        try {
          listener(aggregated);
        } catch (error) {
          console.error('VDO.ninja: Stats listener error', error);
        }
      });
    }
  }

  /**
   * Export stats to CSV format
   */
  exportToCSV(): string {
    const headers = [
      'timestamp',
      'connectionState',
      'iceConnectionState',
      'signalingState',
      'audioBitrate',
      'videoBitrate',
      'totalBitrate',
      'width',
      'height',
      'framerate',
      'packetLoss',
      'latency',
      'jitter',
      'audioLevel',
    ];

    const rows = this.history.map(h => [
      h.timestamp,
      h.stats.connectionState,
      h.stats.iceConnectionState,
      h.stats.signalingState,
      h.stats.bitrate.audio,
      h.stats.bitrate.video,
      h.stats.bitrate.total,
      h.stats.resolution.width,
      h.stats.resolution.height,
      h.stats.framerate,
      h.stats.packetLoss,
      h.stats.latency,
      h.stats.jitter,
      h.stats.audioLevel,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csv;
  }
}