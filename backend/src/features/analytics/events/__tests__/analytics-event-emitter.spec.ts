import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type AnalyticsEvent,
  AnalyticsEventEmitter,
  analyticsEventEmitter,
  type StatsUpdatedEvent,
} from '../analytics-event-emitter.js';

describe('AnalyticsEventEmitter', () => {
  let emitter: AnalyticsEventEmitter;

  beforeEach(() => {
    // Create a fresh instance for each test
    emitter = new (AnalyticsEventEmitter as any)();
  });

  afterEach(() => {
    emitter.removeAllListeners();
    // Clear any pending timers
    emitter.clearStreamQueue('test-stream');
  });

  describe('Event Emission', () => {
    it('should emit stats updated event successfully', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:stats:updated', listener);

      const result = await emitter.emitStatsUpdated(
        'stream-123',
        {
          currentViewers: 42,
          peakViewers: 55,
          totalViewers: 120,
          averageViewDuration: 1800,
          fps: 30,
          bitrate: 2500,
          resolution: { width: 1920, height: 1080 },
          latency: 50,
          packetLoss: 1.2,
          jitter: 5,
          connectionQuality: 'good',
          connectionScore: 85,
          qualityDistribution: {
            excellent: 20,
            good: 60,
            fair: 15,
            poor: 5,
            critical: 0,
          },
          isAudioMuted: false,
          isVideoHidden: false,
          isScreenSharing: false,
          isRecording: true,
          uploadSpeed: 5000,
          downloadSpeed: 10000,
          totalBytesOut: 1024000,
          totalBytesIn: 2048000,
        },
        'realtime',
      );

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analytics:stats:updated',
          streamId: 'stream-123',
          stats: expect.objectContaining({
            currentViewers: 42,
            connectionQuality: 'good',
            isRecording: true,
          }),
          interval: 'realtime',
        }),
      );
    });

    it('should emit viewer joined event successfully', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:viewer:joined', listener);

      const result = await emitter.emitViewerJoined(
        'stream-123',
        {
          sessionId: 'session-abc',
          userId: 'user-456',
          username: 'testviewer',
          isAnonymous: false,
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          location: 'US',
          connectionMetrics: {
            latency: 45,
            packetLoss: 0.5,
            bandwidth: 5000,
          },
        },
        {
          currentViewers: 43,
          totalViewers: 121,
          deviceBreakdown: { desktop: 30, mobile: 13 },
          locationBreakdown: { US: 25, UK: 10, CA: 8 },
        },
      );

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analytics:viewer:joined',
          streamId: 'stream-123',
          viewer: expect.objectContaining({
            userId: 'user-456',
            username: 'testviewer',
            deviceType: 'desktop',
          }),
          aggregated: expect.objectContaining({
            currentViewers: 43,
            totalViewers: 121,
          }),
        }),
      );
    });

    it('should emit wildcard events', async () => {
      const wildcardListener = vi.fn();
      const specificListener = vi.fn();

      emitter.onAnalyticsEvent('*', wildcardListener);
      emitter.onAnalyticsEvent('analytics:quality:changed', specificListener);

      await emitter.emitQualityChanged('stream-123', {
        previous: 'good',
        current: 'fair',
        metrics: {
          fps: { previous: 30, current: 25 },
          bitrate: { previous: 2500, current: 2000 },
          latency: { previous: 50, current: 80 },
          packetLoss: { previous: 1, current: 3 },
        },
        reason: 'network',
        impact: 'medium',
      });

      expect(wildcardListener).toHaveBeenCalled();
      expect(specificListener).toHaveBeenCalled();
    });
  });

  describe('Event Validation', () => {
    it('should validate stats updated event structure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Invalid event - missing required fields
      const invalidEvent = {
        type: 'analytics:stats:updated',
        streamId: '', // Invalid: empty string
        timestamp: new Date().toISOString(),
        source: 'vdo_ninja',
        stats: {
          currentViewers: -1, // Invalid: negative number
        },
        interval: 'realtime',
      } as any;

      const result = await emitter.emitAnalyticsEvent(invalidEvent);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to emit analytics event:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle validation errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidEvent = {
        type: 'analytics:stats:updated',
        streamId: 'stream-123',
        timestamp: 'invalid-date', // Invalid timestamp
      } as any;

      const result = await emitter.emitAnalyticsEvent(invalidEvent);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Throttling', () => {
    beforeEach(() => {
      // Enable throttling for tests
      emitter.updateThrottleConfig({
        enabled: true,
        intervals: {
          realtime: 100, // 100ms for testing
          aggregated: 200,
          alerts: 50,
        },
        priorities: {
          critical: 0,
          high: 50,
          medium: 100,
          low: 200,
        },
      });
    });

    it('should throttle frequent stats updates', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:stats:updated', listener);

      // Emit multiple events quickly
      await emitter.emitStatsUpdated(
        'stream-123',
        {
          currentViewers: 10,
          peakViewers: 10,
          totalViewers: 10,
          averageViewDuration: 0,
          fps: 30,
          bitrate: 2000,
          resolution: null,
          latency: 50,
          packetLoss: 0,
          jitter: 0,
          connectionQuality: 'good',
          connectionScore: 100,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, critical: 0 },
          isAudioMuted: false,
          isVideoHidden: false,
          isScreenSharing: false,
          isRecording: false,
          uploadSpeed: 1000,
          downloadSpeed: 2000,
          totalBytesOut: 0,
          totalBytesIn: 0,
        },
        'realtime',
      );

      await emitter.emitStatsUpdated(
        'stream-123',
        {
          currentViewers: 11,
          peakViewers: 11,
          totalViewers: 11,
          averageViewDuration: 0,
          fps: 30,
          bitrate: 2000,
          resolution: null,
          latency: 50,
          packetLoss: 0,
          jitter: 0,
          connectionQuality: 'good',
          connectionScore: 100,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, critical: 0 },
          isAudioMuted: false,
          isVideoHidden: false,
          isScreenSharing: false,
          isRecording: false,
          uploadSpeed: 1000,
          downloadSpeed: 2000,
          totalBytesOut: 0,
          totalBytesIn: 0,
        },
        'realtime',
      );

      // Should only emit once immediately
      expect(listener).toHaveBeenCalledTimes(1);
      expect(emitter.getQueuedEventsCount('stream-123')).toBe(1);

      // Wait for throttle interval and check if second event is processed
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should emit critical events immediately', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:performance:alert', listener);

      await emitter.emitPerformanceAlert('stream-123', {
        level: 'critical',
        category: 'technical',
        title: 'Stream Down',
        message: 'Stream has stopped',
        metrics: { uptime: 0 },
        recommendations: ['Check connection'],
      });

      // Critical events should emit immediately
      expect(listener).toHaveBeenCalledTimes(1);
      expect(emitter.getQueuedEventsCount('stream-123')).toBe(0);
    });

    it('should update throttle configuration', () => {
      const newConfig = {
        enabled: false,
        intervals: {
          realtime: 500,
          aggregated: 1000,
          alerts: 100,
        },
      };

      emitter.updateThrottleConfig(newConfig);
      const config = emitter.getThrottleConfig();

      expect(config.enabled).toBe(false);
      expect(config.intervals.realtime).toBe(500);
    });

    it('should flush queued events', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:stats:updated', listener);

      // Generate multiple events quickly to queue them
      for (let i = 0; i < 5; i++) {
        await emitter.emitStatsUpdated(
          'stream-123',
          {
            currentViewers: i,
            peakViewers: i,
            totalViewers: i,
            averageViewDuration: 0,
            fps: 30,
            bitrate: 2000,
            resolution: null,
            latency: 50,
            packetLoss: 0,
            jitter: 0,
            connectionQuality: 'good',
            connectionScore: 100,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, critical: 0 },
            isAudioMuted: false,
            isVideoHidden: false,
            isScreenSharing: false,
            isRecording: false,
            uploadSpeed: 1000,
            downloadSpeed: 2000,
            totalBytesOut: 0,
            totalBytesIn: 0,
          },
          'realtime',
        );
      }

      expect(emitter.getQueuedEventsCount('stream-123')).toBeGreaterThan(0);

      // Flush events
      await emitter.flushStreamEvents('stream-123');

      // All events should be processed
      expect(emitter.getQueuedEventsCount('stream-123')).toBe(0);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Event History', () => {
    it('should track event history per stream', async () => {
      await emitter.emitStatsUpdated(
        'stream-123',
        {
          currentViewers: 10,
          peakViewers: 10,
          totalViewers: 10,
          averageViewDuration: 0,
          fps: 30,
          bitrate: 2000,
          resolution: null,
          latency: 50,
          packetLoss: 0,
          jitter: 0,
          connectionQuality: 'good',
          connectionScore: 100,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, critical: 0 },
          isAudioMuted: false,
          isVideoHidden: false,
          isScreenSharing: false,
          isRecording: false,
          uploadSpeed: 1000,
          downloadSpeed: 2000,
          totalBytesOut: 0,
          totalBytesIn: 0,
        },
        'realtime',
      );

      await emitter.emitViewerJoined(
        'stream-123',
        {
          sessionId: 'session-1',
          userId: 'user-1',
          username: 'viewer1',
          isAnonymous: false,
          deviceType: 'desktop',
        },
        {
          currentViewers: 11,
          totalViewers: 11,
          deviceBreakdown: {},
          locationBreakdown: {},
        },
      );

      const history = emitter.getStreamHistory('stream-123');
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('analytics:stats:updated');
      expect(history[1].type).toBe('analytics:viewer:joined');
    });

    it('should limit history size per stream', async () => {
      // Create events beyond the max limit (50)
      for (let i = 0; i < 55; i++) {
        await emitter.emitViewerJoined(
          'stream-123',
          {
            sessionId: `session-${i}`,
            isAnonymous: true,
            deviceType: 'mobile',
          },
          {
            currentViewers: i + 1,
            totalViewers: i + 1,
            deviceBreakdown: {},
            locationBreakdown: {},
          },
        );
      }

      const history = emitter.getStreamHistory('stream-123');
      expect(history.length).toBeLessThanOrEqual(50); // Default max history size
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      emitter.onAnalyticsEvent('analytics:stats:updated', listener);
      expect(emitter.listenerCount('analytics:stats:updated')).toBe(1);

      emitter.offAnalyticsEvent('analytics:stats:updated', listener);
      expect(emitter.listenerCount('analytics:stats:updated')).toBe(0);
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      emitter.onAnalyticsEvent('analytics:stats:updated', errorListener);
      emitter.onAnalyticsEvent('analytics:stats:updated', goodListener);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await emitter.emitStatsUpdated(
        'stream-123',
        {
          currentViewers: 10,
          peakViewers: 10,
          totalViewers: 10,
          averageViewDuration: 0,
          fps: 30,
          bitrate: 2000,
          resolution: null,
          latency: 50,
          packetLoss: 0,
          jitter: 0,
          connectionQuality: 'good',
          connectionScore: 100,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, critical: 0 },
          isAudioMuted: false,
          isVideoHidden: false,
          isScreenSharing: false,
          isRecording: false,
          uploadSpeed: 1000,
          downloadSpeed: 2000,
          totalBytesOut: 0,
          totalBytesIn: 0,
        },
        'realtime',
      );

      // Good listener should still be called despite error in first listener
      expect(goodListener).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Helper Methods', () => {
    it('should emit performance alert with helper method', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:performance:alert', listener);

      await emitter.emitPerformanceAlert('stream-123', {
        level: 'warning',
        category: 'engagement',
        title: 'Low Engagement',
        message: 'Viewer interaction has decreased',
        metrics: { interactionRate: 0.02 },
        recommendations: ['Engage with chat', 'Feature interesting content'],
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analytics:performance:alert',
          streamId: 'stream-123',
          alert: expect.objectContaining({
            level: 'warning',
            category: 'engagement',
            title: 'Low Engagement',
          }),
        }),
      );
    });

    it('should emit quality changed with alerts', async () => {
      const listener = vi.fn();
      emitter.onAnalyticsEvent('analytics:quality:changed', listener);

      await emitter.emitQualityChanged(
        'stream-123',
        {
          previous: 'good',
          current: 'poor',
          metrics: {
            fps: { previous: 30, current: 15 },
            bitrate: { previous: 2500, current: 800 },
            latency: { previous: 50, current: 300 },
            packetLoss: { previous: 1, current: 8 },
          },
          reason: 'network',
          impact: 'high',
        },
        [
          {
            type: 'fps_drop',
            severity: 'warning',
            message: 'FPS dropped significantly',
            threshold: 20,
            currentValue: 15,
          },
        ],
      );

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analytics:quality:changed',
          quality: expect.objectContaining({
            current: 'poor',
            impact: 'high',
          }),
          alerts: expect.arrayContaining([
            expect.objectContaining({
              type: 'fps_drop',
              severity: 'warning',
            }),
          ]),
        }),
      );
    });
  });

  describe('Singleton Instance', () => {
    it('should maintain singleton pattern', () => {
      const instance1 = AnalyticsEventEmitter.getInstance();
      const instance2 = AnalyticsEventEmitter.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      const instance = AnalyticsEventEmitter.getInstance();
      expect(analyticsEventEmitter).toBe(instance);
    });
  });
});
