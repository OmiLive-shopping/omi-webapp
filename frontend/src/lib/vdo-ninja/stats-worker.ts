/**
 * VDO.Ninja Statistics Web Worker
 * Offloads heavy statistics processing to a separate thread
 */

// Worker message types
export interface WorkerRequest {
  id: string;
  type: 'process_stats' | 'aggregate_stats' | 'calculate_quality' | 'analyze_trends';
  data: any;
  config?: any;
}

export interface WorkerResponse {
  id: string;
  type: string;
  result?: any;
  error?: string;
}

// Statistics interfaces
interface StreamStats {
  timestamp: number;
  fps: number;
  bitrate: number;
  resolution: { width: number; height: number };
  latency: number;
  packetLoss: number;
  jitter: number;
  audioLevel: number;
}

interface AggregatedStats {
  period: string;
  startTime: number;
  endTime: number;
  sampleCount: number;
  fps: {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
  };
  bitrate: {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
  };
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  packetLoss: {
    min: number;
    max: number;
    avg: number;
    total: number;
  };
  quality: {
    score: number;
    rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    issues: string[];
  };
}

// Worker implementation (runs in separate thread)
const workerCode = `
// Statistics buffer
let statsBuffer = [];
const MAX_BUFFER_SIZE = 10000;

// Helper functions
function calculateAverage(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateStdDev(values, avg) {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(calculateAverage(squaredDiffs));
}

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateQualityScore(stats) {
  let score = 100;
  const issues = [];
  
  // FPS scoring (weight: 25%)
  if (stats.fps.avg < 15) {
    score -= 25;
    issues.push('Very low FPS');
  } else if (stats.fps.avg < 24) {
    score -= 15;
    issues.push('Low FPS');
  } else if (stats.fps.avg < 30) {
    score -= 5;
  }
  
  // Bitrate scoring (weight: 20%)
  if (stats.bitrate.avg < 1000000) { // Less than 1 Mbps
    score -= 20;
    issues.push('Low bitrate');
  } else if (stats.bitrate.avg < 2000000) { // Less than 2 Mbps
    score -= 10;
  }
  
  // Latency scoring (weight: 25%)
  if (stats.latency.avg > 500) {
    score -= 25;
    issues.push('Very high latency');
  } else if (stats.latency.avg > 200) {
    score -= 15;
    issues.push('High latency');
  } else if (stats.latency.avg > 100) {
    score -= 5;
  }
  
  // Packet loss scoring (weight: 30%)
  if (stats.packetLoss.avg > 5) {
    score -= 30;
    issues.push('Severe packet loss');
  } else if (stats.packetLoss.avg > 2) {
    score -= 20;
    issues.push('High packet loss');
  } else if (stats.packetLoss.avg > 0.5) {
    score -= 10;
    issues.push('Moderate packet loss');
  }
  
  // Determine rating
  let rating;
  if (score >= 90) rating = 'excellent';
  else if (score >= 75) rating = 'good';
  else if (score >= 60) rating = 'fair';
  else if (score >= 40) rating = 'poor';
  else rating = 'critical';
  
  return { score: Math.max(0, score), rating, issues };
}

function processStats(data) {
  const { stats, config } = data;
  
  // Add to buffer
  statsBuffer.push(...stats);
  
  // Trim buffer if too large
  if (statsBuffer.length > MAX_BUFFER_SIZE) {
    statsBuffer = statsBuffer.slice(-MAX_BUFFER_SIZE);
  }
  
  // Process stats based on config
  const processed = stats.map(stat => {
    // Calculate derived metrics
    const bandwidth = stat.bitrate / 8; // Convert to bytes/sec
    const qualityIndex = (stat.fps / 30) * (1 - stat.packetLoss / 100);
    
    return {
      ...stat,
      bandwidth,
      qualityIndex,
      isKeyFrame: stat.bitrate > (config?.keyFrameThreshold || 5000000)
    };
  });
  
  return processed;
}

function aggregateStats(data) {
  const { stats, period } = data;
  
  if (!stats || stats.length === 0) {
    return null;
  }
  
  // Extract values
  const fpsValues = stats.map(s => s.fps).filter(v => v > 0);
  const bitrateValues = stats.map(s => s.bitrate).filter(v => v > 0);
  const latencyValues = stats.map(s => s.latency).filter(v => v >= 0);
  const packetLossValues = stats.map(s => s.packetLoss).filter(v => v >= 0);
  
  // Calculate aggregates
  const aggregated = {
    period,
    startTime: Math.min(...stats.map(s => s.timestamp)),
    endTime: Math.max(...stats.map(s => s.timestamp)),
    sampleCount: stats.length,
    fps: {
      min: Math.min(...fpsValues),
      max: Math.max(...fpsValues),
      avg: calculateAverage(fpsValues),
      stdDev: 0
    },
    bitrate: {
      min: Math.min(...bitrateValues),
      max: Math.max(...bitrateValues),
      avg: calculateAverage(bitrateValues),
      stdDev: 0
    },
    latency: {
      min: Math.min(...latencyValues),
      max: Math.max(...latencyValues),
      avg: calculateAverage(latencyValues),
      p50: calculatePercentile(latencyValues, 50),
      p95: calculatePercentile(latencyValues, 95),
      p99: calculatePercentile(latencyValues, 99)
    },
    packetLoss: {
      min: Math.min(...packetLossValues),
      max: Math.max(...packetLossValues),
      avg: calculateAverage(packetLossValues),
      total: packetLossValues.reduce((sum, val) => sum + val, 0)
    }
  };
  
  // Calculate standard deviations
  aggregated.fps.stdDev = calculateStdDev(fpsValues, aggregated.fps.avg);
  aggregated.bitrate.stdDev = calculateStdDev(bitrateValues, aggregated.bitrate.avg);
  
  // Calculate quality score
  aggregated.quality = calculateQualityScore(aggregated);
  
  return aggregated;
}

function analyzeTrends(data) {
  const { stats, windowSize = 10 } = data;
  
  if (!stats || stats.length < windowSize) {
    return null;
  }
  
  const trends = {
    fps: { direction: 'stable', change: 0, volatility: 0 },
    bitrate: { direction: 'stable', change: 0, volatility: 0 },
    latency: { direction: 'stable', change: 0, volatility: 0 },
    packetLoss: { direction: 'stable', change: 0, volatility: 0 }
  };
  
  // Analyze each metric
  ['fps', 'bitrate', 'latency', 'packetLoss'].forEach(metric => {
    const values = stats.slice(-windowSize).map(s => s[metric]);
    const recentAvg = calculateAverage(values.slice(-Math.floor(windowSize / 2)));
    const olderAvg = calculateAverage(values.slice(0, Math.floor(windowSize / 2)));
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    const volatility = calculateStdDev(values, calculateAverage(values));
    
    trends[metric] = {
      direction: change > 5 ? 'improving' : change < -5 ? 'degrading' : 'stable',
      change: Math.round(change * 100) / 100,
      volatility: Math.round(volatility * 100) / 100
    };
  });
  
  return trends;
}

// Message handler
self.onmessage = function(e) {
  const request = e.data;
  let result;
  let error;
  
  try {
    switch (request.type) {
      case 'process_stats':
        result = processStats(request.data);
        break;
      
      case 'aggregate_stats':
        result = aggregateStats(request.data);
        break;
      
      case 'calculate_quality':
        result = calculateQualityScore(request.data);
        break;
      
      case 'analyze_trends':
        result = analyzeTrends(request.data);
        break;
      
      default:
        error = 'Unknown request type: ' + request.type;
    }
  } catch (err) {
    error = err.message || 'Processing error';
    console.error('Worker error:', err);
  }
  
  // Send response
  self.postMessage({
    id: request.id,
    type: request.type,
    result,
    error
  });
};

// Periodic cleanup
setInterval(() => {
  // Trim buffer if needed
  if (statsBuffer.length > MAX_BUFFER_SIZE) {
    statsBuffer = statsBuffer.slice(-MAX_BUFFER_SIZE / 2);
  }
}, 60000);
`;

// Create worker blob
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

// Worker manager class
export class StatsWorkerManager {
  private worker: Worker | null = null;
  private requestId: number = 0;
  private pendingRequests: Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  constructor(private timeout: number = 5000) {
    this.initializeWorker();
  }
  
  private initializeWorker(): void {
    try {
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, result, error } = e.data;
        const pending = this.pendingRequests.get(id);
        
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(id);
          
          if (error) {
            pending.reject(new Error(error));
          } else {
            pending.resolve(result);
          }
        }
      };
      
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests.entries()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Worker error'));
        }
        this.pendingRequests.clear();
        
        // Restart worker
        this.restartWorker();
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
    }
  }
  
  private restartWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    setTimeout(() => {
      this.initializeWorker();
    }, 1000);
  }
  
  private async sendRequest(type: string, data: any, config?: any): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    
    const id = `req-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Worker request timeout'));
      }, this.timeout);
      
      this.pendingRequests.set(id, { resolve, reject, timeout });
      
      this.worker!.postMessage({
        id,
        type,
        data,
        config
      });
    });
  }
  
  async processStats(stats: StreamStats[], config?: any): Promise<any> {
    return this.sendRequest('process_stats', { stats, config });
  }
  
  async aggregateStats(stats: StreamStats[], period: string): Promise<AggregatedStats> {
    return this.sendRequest('aggregate_stats', { stats, period });
  }
  
  async calculateQuality(stats: any): Promise<{
    score: number;
    rating: string;
    issues: string[];
  }> {
    return this.sendRequest('calculate_quality', stats);
  }
  
  async analyzeTrends(stats: StreamStats[], windowSize?: number): Promise<any> {
    return this.sendRequest('analyze_trends', { stats, windowSize });
  }
  
  terminate(): void {
    // Clear pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
    
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let statsWorker: StatsWorkerManager | null = null;

export function getStatsWorker(): StatsWorkerManager {
  if (!statsWorker) {
    statsWorker = new StatsWorkerManager();
  }
  return statsWorker;
}