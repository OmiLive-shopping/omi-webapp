import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useRealTimeStats, useViewerStats, useStreamerStats } from '../useRealTimeStats';
import { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import { RealTimeStatsTracker } from '@/lib/vdo-ninja/real-time-stats';

// Mock the RealTimeStatsTracker
vi.mock('@/lib/vdo-ninja/real-time-stats', () => ({
  RealTimeStatsTracker: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      fps: 30,
      bitrate: 2500000,
      packetLoss: 0.5,
      latency: 45,
      jitter: 10,
      connectionQuality: 'good',
      connectionScore: 85,
      currentViewers: 5,
      streamDuration: 120000,
      fpsMin: 25,
      fpsMax: 30,
      fpsAvg: 28,
      bitrateMin: 2000000,
      bitrateMax: 3000000,
      bitrateAvg: 2500000,
      packetLossMax: 1,
      packetLossAvg: 0.3,
      latencyMin: 30,
      latencyMax: 60,
      latencyAvg: 45,
      jitterMax: 15,
      jitterAvg: 8,
      reconnectCount: 0,
      totalDisconnectDuration: 0,
      streamStartTime: Date.now() - 120000,
      recordingDuration: 0,
      totalBytesReceived: 37500000,
      totalBytesSent: 0,
      averageUploadSpeed: 0,
      averageDownloadSpeed: 312500,
      peakViewers: 8,
      totalUniqueViewers: 12,
      averageViewDuration: 60000,
      currentResolution: { width: 1920, height: 1080 },
      resolutionChanges: 1,
      audioLevel: 0.6,
      audioLevelPeak: 0.8,
      audioDropouts: 0
    }),
    getHistory: vi.fn().mockReturnValue([
      {
        timestamp: Date.now() - 2000,
        stats: { fps: 28, bitrate: 2400000, packetLoss: 0.3 }
      },
      {
        timestamp: Date.now() - 1000,
        stats: { fps: 29, bitrate: 2450000, packetLoss: 0.4 }
      },
      {
        timestamp: Date.now(),
        stats: { fps: 30, bitrate: 2500000, packetLoss: 0.5 }
      }
    ]),
    getTrends: vi.fn().mockReturnValue([
      {
        metric: 'fps',
        trend: 'improving',
        changePercent: 5,
        samples: 10
      },
      {
        metric: 'bitrate',
        trend: 'stable',
        changePercent: 1,
        samples: 10
      }
    ]),
    getAggregatedStats: vi.fn().mockImplementation((windowMs) => {
      if (windowMs === 60000) {
        return { fps: 29, bitrate: 2450000, packetLoss: 0.4 };
      } else if (windowMs === 300000) {
        return { fps: 28, bitrate: 2400000, packetLoss: 0.5 };
      } else {
        return { fps: 27, bitrate: 2350000, packetLoss: 0.6 };
      }
    }),
    reset: vi.fn(),
    clearMetricHistory: vi.fn(),
    exportToJSON: vi.fn().mockReturnValue('{"stats": {}}'),
    exportToCSV: vi.fn().mockReturnValue('fps,bitrate\n30,2500000'),
    cleanup: vi.fn()
  }))
}));

describe('useRealTimeStats', () => {
  let eventManager: VdoEventManager;
  
  beforeEach(() => {
    vi.useFakeTimers();
    eventManager = new VdoEventManager();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });
  
  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRealTimeStats());
      
      expect(result.current.stats.fps).toBe(0);
      expect(result.current.stats.bitrate).toBe(0);
      expect(result.current.stats.connectionQuality).toBe('good');
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isTracking).toBe(false);
    });
    
    it('should auto-initialize when event manager provided', () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          enableAutoStart: true 
        })
      );
      
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isTracking).toBe(true);
    });
    
    it('should not auto-initialize when disabled', () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          enableAutoStart: false 
        })
      );
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isTracking).toBe(false);
    });
    
    it('should initialize manually', () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ enableAutoStart: false })
      );
      
      act(() => {
        result.current.initialize(eventManager);
      });
      
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isTracking).toBe(true);
    });
  });
  
  describe('Statistics Updates', () => {
    it('should update statistics at refresh interval', async () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          refreshInterval: 100
        })
      );
      
      // Initial state
      expect(result.current.stats.fps).toBe(0);
      
      // Wait for first update
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(result.current.stats.fps).toBe(30);
      expect(result.current.stats.bitrate).toBe(2500000);
      expect(result.current.updateCount).toBe(1);
    });
    
    it('should use different interval for viewers', async () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          isViewer: true,
          refreshInterval: 100,
          viewerRefreshInterval: 500
        })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Should not update yet (viewer uses 500ms interval)
      expect(result.current.updateCount).toBe(1); // Only initial update
      
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      
      expect(result.current.updateCount).toBe(2);
    });
    
    it('should throttle updates when enabled', async () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          refreshInterval: 50,
          throttleUpdates: true,
          throttleDelay: 200
        })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      
      // Should be throttled
      expect(result.current.updateCount).toBe(0);
      
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      
      // Now should update
      expect(result.current.updateCount).toBe(1);
    });
  });
  
  describe('Callbacks', () => {
    it('should call onStatsUpdate callback', async () => {
      const onStatsUpdate = vi.fn();
      
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          refreshInterval: 100,
          onStatsUpdate
        })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(onStatsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 30,
          bitrate: 2500000
        })
      );
    });
    
    it('should call onQualityChange callback', async () => {
      const onQualityChange = vi.fn();
      const mockTracker = RealTimeStatsTracker as any;
      
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          refreshInterval: 100,
          onQualityChange
        })
      );
      
      // Change quality in mock
      mockTracker.mock.results[0].value.getStats.mockReturnValueOnce({
        ...mockTracker.mock.results[0].value.getStats(),
        connectionQuality: 'excellent',
        connectionScore: 95
      });
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(onQualityChange).toHaveBeenCalledWith('excellent', 95);
    });
    
    it('should call connection callbacks', async () => {
      const onConnectionLost = vi.fn();
      const onConnectionRestored = vi.fn();
      const mockTracker = RealTimeStatsTracker as any;
      
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          refreshInterval: 100,
          onConnectionLost,
          onConnectionRestored
        })
      );
      
      // Simulate connection loss
      mockTracker.mock.results[0].value.getStats.mockReturnValueOnce({
        ...mockTracker.mock.results[0].value.getStats(),
        connectionScore: 20
      });
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(onConnectionLost).toHaveBeenCalled();
      
      // Simulate connection restored
      mockTracker.mock.results[0].value.getStats.mockReturnValueOnce({
        ...mockTracker.mock.results[0].value.getStats(),
        connectionScore: 85
      });
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(onConnectionRestored).toHaveBeenCalled();
    });
  });
  
  describe('Aggregated Data', () => {
    it('should provide aggregated statistics', async () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          refreshInterval: 100
        })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(result.current.aggregatedStats.lastMinute).toEqual({
        fps: 29,
        bitrate: 2450000,
        packetLoss: 0.4
      });
      
      expect(result.current.aggregatedStats.last5Minutes).toEqual({
        fps: 28,
        bitrate: 2400000,
        packetLoss: 0.5
      });
      
      expect(result.current.aggregatedStats.last15Minutes).toEqual({
        fps: 27,
        bitrate: 2350000,
        packetLoss: 0.6
      });
    });
  });
  
  describe('Quality Metrics', () => {
    it('should calculate quality metrics and issues', async () => {
      const mockTracker = RealTimeStatsTracker as any;
      
      // Set poor stats
      mockTracker.mock.results[0].value.getStats.mockReturnValueOnce({
        ...mockTracker.mock.results[0].value.getStats(),
        packetLoss: 10,
        latency: 250,
        jitter: 60,
        fps: 15,
        bitrate: 500000,
        audioDropouts: 10,
        connectionScore: 40,
        connectionQuality: 'poor'
      });
      
      const { result } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      const { qualityMetrics } = result.current;
      
      expect(qualityMetrics.score).toBe(40);
      expect(qualityMetrics.level).toBe('poor');
      expect(qualityMetrics.issues).toContain('High packet loss: 10.0%');
      expect(qualityMetrics.issues).toContain('High latency: 250ms');
      expect(qualityMetrics.issues).toContain('High jitter: 60ms');
      expect(qualityMetrics.issues).toContain('Low framerate: 15fps');
      expect(qualityMetrics.recommendations).toContain('Check network connection stability');
    });
  });
  
  describe('Network Health', () => {
    it('should calculate network health status', async () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      const { networkHealth } = result.current;
      
      expect(networkHealth.status).toBe('healthy');
      expect(networkHealth.latencyStatus).toBe('low');
      expect(networkHealth.packetLossStatus).toBe('minimal');
      expect(networkHealth.jitterStatus).toBe('stable');
    });
  });
  
  describe('Actions', () => {
    it('should reset statistics', async () => {
      const mockTracker = RealTimeStatsTracker as any;
      
      const { result } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      expect(result.current.updateCount).toBe(1);
      
      act(() => {
        result.current.reset();
      });
      
      expect(mockTracker.mock.results[0].value.reset).toHaveBeenCalled();
      expect(result.current.updateCount).toBe(0);
    });
    
    it('should export statistics', () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ 
          eventManager,
          enableExport: true 
        })
      );
      
      const jsonExport = result.current.exportStats('json');
      expect(jsonExport).toBe('{"stats": {}}');
      
      const csvExport = result.current.exportStats('csv');
      expect(csvExport).toBe('fps,bitrate\n30,2500000');
    });
    
    it('should clear metric history', () => {
      const mockTracker = RealTimeStatsTracker as any;
      
      const { result } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      act(() => {
        result.current.clearMetric('fps');
      });
      
      expect(mockTracker.mock.results[0].value.clearMetricHistory)
        .toHaveBeenCalledWith('fps');
    });
    
    it('should get metric trend', () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      const trend = result.current.getMetricTrend('fps');
      
      expect(trend).toEqual({
        metric: 'fps',
        trend: 'improving',
        changePercent: 5,
        samples: 10
      });
    });
    
    it('should get metric history', () => {
      const { result } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      const history = result.current.getMetricHistory('fps', 3);
      
      expect(history).toEqual([28, 29, 30]);
    });
  });
  
  describe('Convenience Hooks', () => {
    it('should configure useViewerStats for viewers', () => {
      const { result } = renderHook(() => useViewerStats(eventManager));
      
      expect(result.current.isInitialized).toBe(true);
      // Viewer stats have optimized settings
    });
    
    it('should configure useStreamerStats for streamers', () => {
      const { result } = renderHook(() => useStreamerStats(eventManager));
      
      expect(result.current.isInitialized).toBe(true);
      // Streamer stats have full features
    });
  });
  
  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const mockTracker = RealTimeStatsTracker as any;
      
      const { unmount } = renderHook(() => 
        useRealTimeStats({ eventManager })
      );
      
      unmount();
      
      expect(mockTracker.mock.results[0].value.cleanup).toHaveBeenCalled();
    });
  });
});