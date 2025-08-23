import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamEventEmitter, streamEventEmitter, type StreamEvent, type StreamCreatedEvent, type ViewerJoinedEvent } from '../stream-event-emitter.js';

describe('StreamEventEmitter', () => {
  let emitter: StreamEventEmitter;
  let mockListeners: { [key: string]: vi.Mock[] } = {};

  beforeEach(() => {
    // Create a fresh instance for each test
    emitter = new (StreamEventEmitter as any)();
    mockListeners = {};
  });

  afterEach(() => {
    emitter.removeAllListeners();
  });

  describe('Event Emission', () => {
    it('should emit stream created event successfully', async () => {
      const listener = vi.fn();
      emitter.onStreamEvent('stream:created', listener);

      const streamData = {
        id: 'stream-123',
        title: 'Test Stream',
        description: 'A test stream',
        userId: 'user-456',
        user: {
          id: 'user-456',
          username: 'testuser',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        tags: ['gaming', 'live'],
      };

      const result = await emitter.emitStreamCreated(streamData);

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:created',
          streamId: 'stream-123',
          stream: streamData,
          timestamp: expect.any(String),
        })
      );
    });

    it('should emit viewer joined event successfully', async () => {
      const listener = vi.fn();
      emitter.onStreamEvent('stream:viewer:joined', listener);

      const result = await emitter.emitViewerJoined('stream-123', {
        id: 'user-789',
        username: 'viewer1',
        isAnonymous: false,
        socketId: 'socket-abc',
      }, 42);

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:viewer:joined',
          streamId: 'stream-123',
          viewer: expect.objectContaining({
            id: 'user-789',
            username: 'viewer1',
            isAnonymous: false,
          }),
          currentViewerCount: 42,
        })
      );
    });

    it('should emit wildcard events', async () => {
      const wildcardListener = vi.fn();
      const specificListener = vi.fn();
      
      emitter.onStreamEvent('*', wildcardListener);
      emitter.onStreamEvent('stream:started', specificListener);

      const streamData = {
        id: 'stream-123',
        title: 'Test Stream',
        userId: 'user-456',
        user: {
          id: 'user-456',
          username: 'testuser',
        },
        startedAt: new Date().toISOString(),
      };

      await emitter.emitStreamStarted(streamData);

      expect(wildcardListener).toHaveBeenCalled();
      expect(specificListener).toHaveBeenCalled();
    });
  });

  describe('Event Validation', () => {
    it('should validate stream created event structure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Invalid event - missing required fields
      const invalidEvent = {
        type: 'stream:created',
        streamId: '', // Invalid: empty string
        timestamp: new Date().toISOString(),
        stream: {
          id: 'stream-123',
          // Missing required title
          userId: 'user-456',
          user: {
            id: 'user-456',
            username: 'testuser',
          },
        },
      } as any;

      const result = await emitter.emitStreamEvent(invalidEvent);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to emit stream event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should validate viewer joined event structure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Invalid event - missing required fields
      const invalidEvent = {
        type: 'stream:viewer:joined',
        streamId: 'stream-123',
        timestamp: new Date().toISOString(),
        viewer: {
          // Missing socketId
          isAnonymous: false,
        },
        currentViewerCount: -1, // Invalid: negative number
      } as any;

      const result = await emitter.emitStreamEvent(invalidEvent);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle validation errors gracefully', async () => {
      const errorListener = vi.fn();
      emitter.onStreamEvent('stream:error', errorListener);

      const invalidEvent = {
        type: 'stream:started',
        streamId: '', // Invalid
        timestamp: 'invalid-date', // Invalid timestamp
      } as any;

      const result = await emitter.emitStreamEvent(invalidEvent);

      expect(result).toBe(false);
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:error',
          error: expect.objectContaining({
            code: 'EVENT_EMISSION_FAILED',
            severity: 'medium',
          }),
        })
      );
    });
  });

  describe('Event History', () => {
    it('should track event history per stream', async () => {
      await emitter.emitStreamCreated({
        id: 'stream-123',
        title: 'Test Stream',
        userId: 'user-456',
        user: { id: 'user-456', username: 'testuser' },
      });

      await emitter.emitViewerJoined('stream-123', {
        id: 'user-789',
        username: 'viewer1',
        isAnonymous: false,
        socketId: 'socket-abc',
      }, 1);

      const history = emitter.getStreamHistory('stream-123');
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('stream:created');
      expect(history[1].type).toBe('stream:viewer:joined');
    });

    it('should limit history size per stream', async () => {
      // Create events beyond the max limit
      for (let i = 0; i < 105; i++) {
        await emitter.emitViewerJoined('stream-123', {
          id: `user-${i}`,
          username: `viewer${i}`,
          isAnonymous: false,
          socketId: `socket-${i}`,
        }, i + 1);
      }

      const history = emitter.getStreamHistory('stream-123');
      expect(history.length).toBeLessThanOrEqual(100); // Default max history size
    });

    it('should get recent events across all streams', async () => {
      await emitter.emitStreamCreated({
        id: 'stream-1',
        title: 'Stream 1',
        userId: 'user-1',
        user: { id: 'user-1', username: 'user1' },
      });

      await emitter.emitStreamCreated({
        id: 'stream-2',
        title: 'Stream 2',
        userId: 'user-2',
        user: { id: 'user-2', username: 'user2' },
      });

      const recentEvents = emitter.getRecentEvents(5);
      expect(recentEvents).toHaveLength(2);
      expect(recentEvents[0].streamId).toBe('stream-2'); // Most recent first
      expect(recentEvents[1].streamId).toBe('stream-1');
    });

    it('should clear stream history', async () => {
      await emitter.emitStreamCreated({
        id: 'stream-123',
        title: 'Test Stream',
        userId: 'user-456',
        user: { id: 'user-456', username: 'testuser' },
      });

      expect(emitter.getStreamHistory('stream-123')).toHaveLength(1);
      
      emitter.clearStreamHistory('stream-123');
      
      expect(emitter.getStreamHistory('stream-123')).toHaveLength(0);
    });
  });

  describe('Event Statistics', () => {
    it('should calculate event statistics', async () => {
      await emitter.emitStreamCreated({
        id: 'stream-1',
        title: 'Stream 1',
        userId: 'user-1',
        user: { id: 'user-1', username: 'user1' },
      });

      await emitter.emitStreamCreated({
        id: 'stream-2',
        title: 'Stream 2',
        userId: 'user-2',
        user: { id: 'user-2', username: 'user2' },
      });

      await emitter.emitViewerJoined('stream-1', {
        id: 'user-3',
        username: 'viewer1',
        isAnonymous: false,
        socketId: 'socket-1',
      }, 1);

      const stats = emitter.getEventStats();
      expect(stats['stream:created']).toBe(2);
      expect(stats['stream:viewer:joined']).toBe(1);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      emitter.onStreamEvent('stream:created', listener);
      expect(emitter.listenerCount('stream:created')).toBe(1);
      
      emitter.offStreamEvent('stream:created', listener);
      expect(emitter.listenerCount('stream:created')).toBe(0);
    });

    it('should handle one-time listeners', async () => {
      const listener = vi.fn();
      
      emitter.onceStreamEvent('stream:created', listener);
      
      await emitter.emitStreamCreated({
        id: 'stream-123',
        title: 'Test Stream',
        userId: 'user-456',
        user: { id: 'user-456', username: 'testuser' },
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(emitter.listenerCount('stream:created')).toBe(0);
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      emitter.onStreamEvent('stream:created', errorListener);
      emitter.onStreamEvent('stream:created', goodListener);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await emitter.emitStreamCreated({
        id: 'stream-123',
        title: 'Test Stream',
        userId: 'user-456',
        user: { id: 'user-456', username: 'testuser' },
      });

      // Good listener should still be called despite error in first listener
      expect(goodListener).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Helper Methods', () => {
    it('should emit stream ended with helper method', async () => {
      const listener = vi.fn();
      emitter.onStreamEvent('stream:ended', listener);

      await emitter.emitStreamEnded('stream-123', {
        title: 'Test Stream',
        userId: 'user-456',
        duration: 1800, // 30 minutes
        endedAt: new Date().toISOString(),
        finalViewerCount: 50,
      }, 'manual');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:ended',
          streamId: 'stream-123',
          reason: 'manual',
          stream: expect.objectContaining({
            duration: 1800,
            finalViewerCount: 50,
          }),
        })
      );
    });

    it('should emit stats updated with helper method', async () => {
      const listener = vi.fn();
      emitter.onStreamEvent('stream:stats:updated', listener);

      await emitter.emitStatsUpdated('stream-123', {
        viewerCount: 42,
        bitrate: 2500,
        fps: 30,
        quality: 'good',
      }, 'vdo_ninja');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:stats:updated',
          streamId: 'stream-123',
          stats: expect.objectContaining({
            viewerCount: 42,
            quality: 'good',
          }),
          source: 'vdo_ninja',
        })
      );
    });

    it('should emit quality changed with helper method', async () => {
      const listener = vi.fn();
      emitter.onStreamEvent('stream:quality:changed', listener);

      await emitter.emitQualityChanged('stream-123', {
        level: 'poor',
        metrics: {
          bitrate: 800,
          latency: 500,
        },
        previousLevel: 'good',
      }, true);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:quality:changed',
          streamId: 'stream-123',
          quality: expect.objectContaining({
            level: 'poor',
            previousLevel: 'good',
          }),
          automaticAdjustment: true,
        })
      );
    });

    it('should emit stream error with helper method', async () => {
      const listener = vi.fn();
      emitter.onStreamEvent('stream:error', listener);

      await emitter.emitStreamError('stream-123', {
        code: 'NETWORK_ERROR',
        message: 'Connection lost',
        severity: 'high',
        source: 'network',
      }, {
        attempted: true,
        successful: false,
        action: 'reconnect',
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stream:error',
          streamId: 'stream-123',
          error: expect.objectContaining({
            code: 'NETWORK_ERROR',
            severity: 'high',
          }),
          recovery: expect.objectContaining({
            attempted: true,
            successful: false,
          }),
        })
      );
    });
  });

  describe('Singleton Instance', () => {
    it('should maintain singleton pattern', () => {
      const instance1 = StreamEventEmitter.getInstance();
      const instance2 = StreamEventEmitter.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      const instance = StreamEventEmitter.getInstance();
      expect(streamEventEmitter).toBe(instance);
    });
  });
});
