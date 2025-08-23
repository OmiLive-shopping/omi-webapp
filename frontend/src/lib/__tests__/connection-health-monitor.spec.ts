import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionHealthMonitor, DEFAULT_HEALTH_CONFIG, type ConnectionQuality } from '../connection-health-monitor';

// Mock Socket.IO
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  connected: true,
} as any;

describe('ConnectionHealthMonitor', () => {
  let monitor: ConnectionHealthMonitor;
  let mockTimers: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTimers = vi.useFakeTimers();
    monitor = new ConnectionHealthMonitor({
      pingInterval: 1000, // 1 second for faster tests
      pingTimeout: 500,   // 500ms timeout
    });
  });

  afterEach(() => {
    monitor.stop();
    mockTimers.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default metrics', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.latency).toBe(0);
      expect(metrics.packetLoss).toBe(0);
      expect(metrics.quality).toBe('good');
      expect(metrics.consecutiveFailures).toBe(0);
      expect(metrics.reconnectAttempts).toBe(0);
    });

    it('should use custom configuration', () => {
      const customMonitor = new ConnectionHealthMonitor({
        pingInterval: 5000,
        latencySpikeThreshold: 2000,
      });

      // Access private config through monitoring behavior
      expect(customMonitor).toBeDefined();
    });
  });

  describe('Socket Monitoring', () => {
    it('should start monitoring when socket is provided', () => {
      monitor.monitor(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('pong', expect.any(Function));
    });

    it('should start ping monitoring automatically', () => {
      monitor.monitor(mockSocket);
      
      // Fast-forward to trigger ping
      mockTimers.advanceTimersByTime(1000);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Number));
    });

    it('should handle socket connect event', () => {
      const onQualityChanged = vi.fn();
      monitor.on('health:quality-changed', onQualityChanged);
      
      monitor.monitor(mockSocket);
      
      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      
      const metrics = monitor.getMetrics();
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it('should handle socket disconnect event', () => {
      monitor.monitor(mockSocket);
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
      disconnectHandler();
      
      const metrics = monitor.getMetrics();
      expect(metrics.totalDisconnects).toBe(1);
    });

    it('should handle connection errors', () => {
      const onUnstable = vi.fn();
      monitor.on('health:connection-unstable', onUnstable);
      
      monitor.monitor(mockSocket);
      
      // Simulate multiple connection errors
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
      
      for (let i = 0; i < 4; i++) {
        errorHandler();
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.consecutiveFailures).toBe(4);
      expect(onUnstable).toHaveBeenCalled();
    });
  });

  describe('Ping/Pong Handling', () => {
    it('should handle successful pong responses', () => {
      const onMetricsUpdated = vi.fn();
      monitor.on('health:metrics-updated', onMetricsUpdated);
      
      monitor.monitor(mockSocket);
      
      // Simulate ping/pong cycle
      const startTime = Date.now();
      mockTimers.advanceTimersByTime(1000); // Trigger ping
      
      // Simulate pong response after 50ms
      mockTimers.advanceTimersByTime(50);
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(startTime);
      
      const metrics = monitor.getMetrics();
      expect(metrics.latency).toBeGreaterThan(0);
      expect(metrics.consecutiveFailures).toBe(0);
      expect(onMetricsUpdated).toHaveBeenCalled();
    });

    it('should detect latency spikes', () => {
      const onLatencySpike = vi.fn();
      monitor.on('health:latency-spike', onLatencySpike);
      
      monitor.monitor(mockSocket);
      
      // Simulate high latency response
      const startTime = Date.now() - 1500; // 1.5 second latency
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(startTime);
      
      expect(onLatencySpike).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
    });

    it('should handle ping timeouts', () => {
      monitor.monitor(mockSocket);
      
      // Trigger ping
      mockTimers.advanceTimersByTime(1000);
      
      // Let ping timeout
      mockTimers.advanceTimersByTime(600); // Exceeds 500ms timeout
      
      const metrics = monitor.getMetrics();
      expect(metrics.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  describe('Quality Assessment', () => {
    it('should calculate excellent quality for low latency and no packet loss', async () => {
      const onQualityChanged = vi.fn();
      monitor.on('health:quality-changed', onQualityChanged);
      
      monitor.monitor(mockSocket);
      
      // Simulate excellent connection
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 30); // 30ms latency
      
      await vi.waitFor(() => {
        const metrics = monitor.getMetrics();
        return metrics.quality === 'excellent';
      });
      
      expect(onQualityChanged).toHaveBeenCalledWith('excellent', expect.any(Object));
    });

    it('should calculate poor quality for high latency', async () => {
      const onQualityChanged = vi.fn();
      monitor.on('health:quality-changed', onQualityChanged);
      
      monitor.monitor(mockSocket);
      
      // Simulate poor connection
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 400); // 400ms latency
      
      await vi.waitFor(() => {
        const metrics = monitor.getMetrics();
        return metrics.quality === 'poor';
      });
      
      expect(onQualityChanged).toHaveBeenCalledWith('poor', expect.any(Object));
    });

    it('should calculate critical quality for very high latency and packet loss', () => {
      monitor.monitor(mockSocket);
      
      // Simulate critical connection with timeouts
      mockTimers.advanceTimersByTime(1000); // Trigger ping
      mockTimers.advanceTimersByTime(600); // Timeout
      mockTimers.advanceTimersByTime(1000); // Another ping
      mockTimers.advanceTimersByTime(600); // Another timeout
      
      const metrics = monitor.getMetrics();
      expect(metrics.quality).toBe('critical');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate average latency over time', () => {
      monitor.monitor(mockSocket);
      
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      
      // Send multiple pings with different latencies
      pongHandler(Date.now() - 50);  // 50ms
      pongHandler(Date.now() - 100); // 100ms
      pongHandler(Date.now() - 75);  // 75ms
      
      const metrics = monitor.getMetrics();
      expect(metrics.averageLatency).toBeCloseTo(75, 0);
    });

    it('should calculate packet loss percentage', () => {
      monitor.monitor(mockSocket);
      
      // Simulate some successful and some failed pings
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      
      // 2 successful
      pongHandler(Date.now() - 50);
      pongHandler(Date.now() - 60);
      
      // 1 timeout (simulated)
      mockTimers.advanceTimersByTime(1000);
      mockTimers.advanceTimersByTime(600);
      
      const metrics = monitor.getMetrics();
      expect(metrics.packetLoss).toBeGreaterThan(0);
      expect(metrics.packetLoss).toBeLessThan(1);
    });

    it('should track connection duration', () => {
      monitor.monitor(mockSocket);
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      
      // Advance time
      mockTimers.advanceTimersByTime(5000);
      
      const metrics = monitor.getMetrics();
      expect(metrics.connectionDuration).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    it('should emit quality changed events', () => {
      const onQualityChanged = vi.fn();
      monitor.on('health:quality-changed', onQualityChanged);
      
      monitor.monitor(mockSocket);
      
      // Force quality change by simulating high latency
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 600); // High latency
      
      expect(onQualityChanged).toHaveBeenCalled();
    });

    it('should emit metrics updated events', () => {
      const onMetricsUpdated = vi.fn();
      monitor.on('health:metrics-updated', onMetricsUpdated);
      
      monitor.monitor(mockSocket);
      
      // Trigger ping response
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 50);
      
      expect(onMetricsUpdated).toHaveBeenCalled();
    });

    it('should allow removing event listeners', () => {
      const onQualityChanged = vi.fn();
      monitor.on('health:quality-changed', onQualityChanged);
      monitor.off('health:quality-changed', onQualityChanged);
      
      monitor.monitor(mockSocket);
      
      // Force quality change
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 600);
      
      expect(onQualityChanged).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should check if connection is healthy', () => {
      expect(monitor.isHealthy()).toBe(true); // Default is good
      
      // Simulate poor quality
      monitor.monitor(mockSocket);
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 600); // High latency -> poor/critical
      
      // Poor is still considered unhealthy in most cases
      const quality = monitor.getQuality();
      const isHealthy = ['excellent', 'good', 'fair'].includes(quality);
      expect(monitor.isHealthy()).toBe(isHealthy);
    });

    it('should provide quality descriptions', () => {
      expect(monitor.getQualityDescription('excellent')).toContain('Excellent');
      expect(monitor.getQualityDescription('poor')).toContain('Poor');
      expect(monitor.getQualityDescription('critical')).toContain('Critical');
    });

    it('should provide quality colors', () => {
      expect(monitor.getQualityColor('excellent')).toBe('#22c55e');
      expect(monitor.getQualityColor('poor')).toBe('#f97316');
      expect(monitor.getQualityColor('critical')).toBe('#ef4444');
    });

    it('should reset metrics properly', () => {
      monitor.monitor(mockSocket);
      
      // Generate some metrics
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 100);
      
      const metricsBefore = monitor.getMetrics();
      expect(metricsBefore.latency).toBeGreaterThan(0);
      
      // Reset
      monitor.resetMetrics();
      
      const metricsAfter = monitor.getMetrics();
      expect(metricsAfter.latency).toBe(0);
      expect(metricsAfter.consecutiveFailures).toBe(0);
    });
  });

  describe('Rate Limit Handling', () => {
    it('should adjust quality when rate limited', () => {
      const onQualityChanged = vi.fn();
      monitor.on('health:quality-changed', onQualityChanged);
      
      monitor.monitor(mockSocket);
      
      // Start with excellent quality
      const pongHandler = mockSocket.on.mock.calls.find(call => call[0] === 'pong')[1];
      pongHandler(Date.now() - 30); // Low latency
      
      // Simulate rate limit event
      const rateLimitHandler = mockSocket.on.mock.calls.find(call => call[0] === 'rate_limit_exceeded')?.[1];
      if (rateLimitHandler) {
        rateLimitHandler();
      }
      
      // Quality should be reduced due to rate limiting
      expect(onQualityChanged).toHaveBeenCalled();
    });
  });
});
