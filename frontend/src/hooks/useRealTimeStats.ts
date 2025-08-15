import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealTimeStatsTracker } from '@/lib/vdo-ninja/real-time-stats';
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import type { 
  StreamStatistics, 
  StatisticsSnapshot, 
  TrendData,
  StatisticsConfig 
} from '@/lib/vdo-ninja/real-time-stats';

// Hook configuration options
export interface UseRealTimeStatsOptions {
  // Event manager instance
  eventManager?: VdoEventManager;
  
  // Refresh intervals
  refreshInterval?: number; // Default: 1000ms
  viewerRefreshInterval?: number; // Default: 5000ms
  isViewer?: boolean; // Determines which refresh interval to use
  
  // Statistics configuration
  statsConfig?: StatisticsConfig;
  
  // Features
  enableTrends?: boolean;
  enableHistory?: boolean;
  enableExport?: boolean;
  enableAutoStart?: boolean;
  
  // Performance
  maxHistorySize?: number;
  throttleUpdates?: boolean;
  throttleDelay?: number;
  
  // Callbacks
  onStatsUpdate?: (stats: StreamStatistics) => void;
  onQualityChange?: (quality: string, score: number) => void;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
}

// Hook return interface
export interface UseRealTimeStatsReturn {
  // Current statistics
  stats: StreamStatistics;
  
  // History and trends
  history: StatisticsSnapshot[];
  trends: TrendData[];
  
  // Aggregated data
  aggregatedStats: {
    lastMinute: Partial<StreamStatistics>;
    last5Minutes: Partial<StreamStatistics>;
    last15Minutes: Partial<StreamStatistics>;
  };
  
  // Quality metrics
  qualityMetrics: {
    score: number;
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    issues: string[];
    recommendations: string[];
  };
  
  // Network health
  networkHealth: {
    status: 'healthy' | 'degraded' | 'poor' | 'offline';
    latencyStatus: 'low' | 'medium' | 'high';
    packetLossStatus: 'none' | 'minimal' | 'moderate' | 'severe';
    jitterStatus: 'stable' | 'acceptable' | 'unstable';
  };
  
  // Actions
  initialize: (eventManager: VdoEventManager) => void;
  reset: () => void;
  clearHistory: () => void;
  exportStats: (format?: 'json' | 'csv') => string;
  
  // Metric-specific actions
  clearMetric: (metric: keyof StreamStatistics) => void;
  getMetricTrend: (metric: keyof StreamStatistics) => TrendData | null;
  getMetricHistory: (metric: keyof StreamStatistics, limit?: number) => number[];
  
  // State
  isInitialized: boolean;
  isTracking: boolean;
  lastUpdateTime: number;
  updateCount: number;
}

/**
 * Custom hook for real-time streaming statistics
 */
export function useRealTimeStats(options: UseRealTimeStatsOptions = {}): UseRealTimeStatsReturn {
  const {
    eventManager: initialEventManager,
    refreshInterval = 1000,
    viewerRefreshInterval = 5000,
    isViewer = false,
    statsConfig,
    enableTrends = true,
    enableHistory = true,
    enableExport = true,
    enableAutoStart = true,
    maxHistorySize = 100,
    throttleUpdates = false,
    throttleDelay = 100,
    onStatsUpdate,
    onQualityChange,
    onConnectionLost,
    onConnectionRestored
  } = options;
  
  // State
  const [stats, setStats] = useState<StreamStatistics>({
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
  });
  
  const [history, setHistory] = useState<StatisticsSnapshot[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [updateCount, setUpdateCount] = useState(0);
  
  // Refs
  const trackerRef = useRef<RealTimeStatsTracker | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectionStateRef = useRef<boolean>(true);
  
  // Initialize tracker
  useEffect(() => {
    const config: StatisticsConfig = {
      maxHistorySize,
      historyInterval: isViewer ? viewerRefreshInterval : refreshInterval,
      enableExport,
      ...statsConfig
    };
    
    trackerRef.current = new RealTimeStatsTracker(config);
    
    // Auto-start if event manager provided
    if (enableAutoStart && initialEventManager) {
      trackerRef.current.initialize(initialEventManager);
      setIsInitialized(true);
      setIsTracking(true);
    }
    
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      trackerRef.current?.cleanup();
    };
  }, []);
  
  // Update statistics periodically
  useEffect(() => {
    if (!isTracking || !trackerRef.current) return;
    
    const interval = isViewer ? viewerRefreshInterval : refreshInterval;
    
    const updateStats = () => {
      if (!trackerRef.current) return;
      
      const newStats = trackerRef.current.getStats();
      
      // Check for connection state changes
      const isConnected = newStats.connectionScore > 30;
      if (isConnected !== lastConnectionStateRef.current) {
        if (!isConnected && onConnectionLost) {
          onConnectionLost();
        } else if (isConnected && onConnectionRestored) {
          onConnectionRestored();
        }
        lastConnectionStateRef.current = isConnected;
      }
      
      // Check for quality changes
      if (onQualityChange && newStats.connectionQuality !== stats.connectionQuality) {
        onQualityChange(newStats.connectionQuality, newStats.connectionScore);
      }
      
      // Update state
      if (throttleUpdates) {
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setTimeout(() => {
            setStats(newStats);
            setLastUpdateTime(Date.now());
            setUpdateCount(prev => prev + 1);
            throttleTimerRef.current = null;
            
            if (onStatsUpdate) {
              onStatsUpdate(newStats);
            }
          }, throttleDelay);
        }
      } else {
        setStats(newStats);
        setLastUpdateTime(Date.now());
        setUpdateCount(prev => prev + 1);
        
        if (onStatsUpdate) {
          onStatsUpdate(newStats);
        }
      }
      
      // Update history and trends
      if (enableHistory) {
        const newHistory = trackerRef.current.getHistory(maxHistorySize);
        setHistory(newHistory);
      }
      
      if (enableTrends) {
        const newTrends = trackerRef.current.getTrends();
        setTrends(newTrends);
      }
    };
    
    updateStats(); // Initial update
    updateTimerRef.current = setInterval(updateStats, interval);
    
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [
    isTracking, 
    isViewer, 
    refreshInterval, 
    viewerRefreshInterval,
    throttleUpdates,
    throttleDelay,
    enableHistory,
    enableTrends,
    maxHistorySize
  ]);
  
  // Calculate aggregated statistics
  const aggregatedStats = useMemo(() => {
    if (!trackerRef.current) {
      return {
        lastMinute: {},
        last5Minutes: {},
        last15Minutes: {}
      };
    }
    
    return {
      lastMinute: trackerRef.current.getAggregatedStats(60000),
      last5Minutes: trackerRef.current.getAggregatedStats(300000),
      last15Minutes: trackerRef.current.getAggregatedStats(900000)
    };
  }, [updateCount]);
  
  // Calculate quality metrics
  const qualityMetrics = useMemo(() => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for issues
    if (stats.packetLoss > 5) {
      issues.push(`High packet loss: ${stats.packetLoss.toFixed(1)}%`);
      recommendations.push('Check network connection stability');
    }
    
    if (stats.latency > 200) {
      issues.push(`High latency: ${stats.latency}ms`);
      recommendations.push('Consider using a server closer to your location');
    }
    
    if (stats.jitter > 50) {
      issues.push(`High jitter: ${stats.jitter}ms`);
      recommendations.push('Close bandwidth-intensive applications');
    }
    
    if (stats.fps < 24 && stats.fps > 0) {
      issues.push(`Low framerate: ${stats.fps}fps`);
      recommendations.push('Reduce video resolution or quality settings');
    }
    
    if (stats.bitrate < 1000000 && stats.bitrate > 0) {
      issues.push(`Low bitrate: ${(stats.bitrate / 1000).toFixed(0)}kbps`);
      recommendations.push('Increase bitrate in stream settings');
    }
    
    if (stats.audioDropouts > 5) {
      issues.push(`Audio dropouts detected: ${stats.audioDropouts}`);
      recommendations.push('Check audio device connection');
    }
    
    return {
      score: stats.connectionScore,
      level: stats.connectionQuality,
      issues,
      recommendations
    };
  }, [stats]);
  
  // Calculate network health
  const networkHealth = useMemo(() => {
    let status: 'healthy' | 'degraded' | 'poor' | 'offline';
    
    if (stats.connectionScore > 80) {
      status = 'healthy';
    } else if (stats.connectionScore > 50) {
      status = 'degraded';
    } else if (stats.connectionScore > 0) {
      status = 'poor';
    } else {
      status = 'offline';
    }
    
    const latencyStatus = stats.latency < 50 ? 'low' : stats.latency < 150 ? 'medium' : 'high';
    const packetLossStatus = stats.packetLoss === 0 ? 'none' : 
      stats.packetLoss < 1 ? 'minimal' : 
      stats.packetLoss < 5 ? 'moderate' : 'severe';
    const jitterStatus = stats.jitter < 30 ? 'stable' : 
      stats.jitter < 50 ? 'acceptable' : 'unstable';
    
    return {
      status,
      latencyStatus,
      packetLossStatus,
      jitterStatus
    };
  }, [stats]);
  
  // Actions
  const initialize = useCallback((eventManager: VdoEventManager) => {
    if (trackerRef.current) {
      trackerRef.current.initialize(eventManager);
      setIsInitialized(true);
      setIsTracking(true);
    }
  }, []);
  
  const reset = useCallback(() => {
    trackerRef.current?.reset();
    setUpdateCount(0);
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);
  
  const exportStats = useCallback((format: 'json' | 'csv' = 'json') => {
    if (!trackerRef.current || !enableExport) {
      return '';
    }
    
    if (format === 'csv') {
      return trackerRef.current.exportToCSV();
    } else {
      return trackerRef.current.exportToJSON();
    }
  }, [enableExport]);
  
  const clearMetric = useCallback((metric: keyof StreamStatistics) => {
    trackerRef.current?.clearMetricHistory(metric);
  }, []);
  
  const getMetricTrend = useCallback((metric: keyof StreamStatistics): TrendData | null => {
    if (!trackerRef.current) return null;
    
    const trends = trackerRef.current.getTrends([metric]);
    return trends.length > 0 ? trends[0] : null;
  }, []);
  
  const getMetricHistory = useCallback((metric: keyof StreamStatistics, limit?: number): number[] => {
    if (!trackerRef.current) return [];
    
    const history = trackerRef.current.getHistory(limit);
    return history.map(snapshot => {
      const value = snapshot.stats[metric];
      return typeof value === 'number' ? value : 0;
    });
  }, []);
  
  return {
    stats,
    history,
    trends,
    aggregatedStats,
    qualityMetrics,
    networkHealth,
    initialize,
    reset,
    clearHistory,
    exportStats,
    clearMetric,
    getMetricTrend,
    getMetricHistory,
    isInitialized,
    isTracking,
    lastUpdateTime,
    updateCount
  };
}

// Convenience hook for viewers (with optimized settings)
export function useViewerStats(eventManager?: VdoEventManager) {
  return useRealTimeStats({
    eventManager,
    isViewer: true,
    enableTrends: false,
    maxHistorySize: 20,
    throttleUpdates: true,
    throttleDelay: 500
  });
}

// Convenience hook for streamers (with full features)
export function useStreamerStats(eventManager?: VdoEventManager) {
  return useRealTimeStats({
    eventManager,
    isViewer: false,
    enableTrends: true,
    enableHistory: true,
    enableExport: true,
    maxHistorySize: 100
  });
}