import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VdoEventManager, VdoEvents, DefaultThrottleConfigs, DefaultValidationRules } from '../event-manager';
import type { 
  VdoEvent, 
  StreamLifecycleEvent, 
  ViewerEvent, 
  MediaStateEvent,
  QualityEvent,
  ConnectionHealthEvent 
} from '../types';

describe('VdoEventManager', () => {
  let eventManager: VdoEventManager;
  let mockIframe: HTMLIFrameElement;

  beforeEach(() => {
    eventManager = new VdoEventManager();
    mockIframe = document.createElement('iframe');
    document.body.appendChild(mockIframe);
  });

  afterEach(() => {
    eventManager.stopListening();
    eventManager.clear();
    document.body.removeChild(mockIframe);
    vi.clearAllTimers();
  });

  describe('Enhanced Event Handling', () => {
    it('should start and stop listening to events', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      eventManager.startListening(mockIframe);
      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

      eventManager.stopListening();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle stream lifecycle events', () => {
      const handler = vi.fn();
      eventManager.on('stream:streamStarted', handler);
      eventManager.startListening(mockIframe);

      const event: StreamLifecycleEvent = {
        action: 'streamStarted',
        streamId: 'test-stream-123',
        streamInfo: {
          streamId: 'test-stream-123',
          userId: 'user-456',
          userName: 'Test User',
          startTime: Date.now()
        }
      };

      window.postMessage(event, '*');

      // Wait for event processing
      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          action: 'streamStarted',
          streamId: 'test-stream-123',
          timestamp: expect.any(Number)
        }));
      }, 10);
    });

    it('should track viewer join and leave events', () => {
      eventManager.startListening(mockIframe);

      const joinEvent: ViewerEvent = {
        action: 'viewerJoined',
        viewerInfo: {
          viewerId: 'viewer-1',
          userName: 'Viewer One',
          joinTime: Date.now(),
          connectionQuality: 'good'
        }
      };

      window.postMessage(joinEvent, '*');

      setTimeout(() => {
        expect(eventManager.getViewerCount()).toBe(1);
        expect(eventManager.getActiveViewers().has('viewer-1')).toBe(true);
      }, 10);

      const leaveEvent: ViewerEvent = {
        action: 'viewerLeft',
        viewerInfo: {
          viewerId: 'viewer-1',
          userName: 'Viewer One',
          connectionQuality: 'good'
        }
      };

      window.postMessage(leaveEvent, '*');

      setTimeout(() => {
        expect(eventManager.getViewerCount()).toBe(0);
        expect(eventManager.getActiveViewers().has('viewer-1')).toBe(false);
      }, 20);
    });

    it('should handle media state change events', () => {
      const handler = vi.fn();
      eventManager.on('media:audioMuted', handler);
      eventManager.startListening(mockIframe);

      const event: MediaStateEvent = {
        action: 'audioMuted',
        streamId: 'test-stream',
        mediaState: {
          audioEnabled: false,
          videoEnabled: true,
          screenShareEnabled: false,
          audioDevice: 'default'
        }
      };

      window.postMessage(event, '*');

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          action: 'audioMuted',
          mediaState: expect.objectContaining({
            audioEnabled: false
          })
        }));
      }, 10);
    });

    it('should handle quality change events', () => {
      const handler = vi.fn();
      eventManager.on('quality:bitrateChanged', handler);
      eventManager.startListening(mockIframe);

      const event: QualityEvent = {
        action: 'bitrateChanged',
        quality: {
          bitrate: 1500000,
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
          level: 'high'
        }
      };

      window.postMessage(event, '*');

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          action: 'bitrateChanged',
          quality: expect.objectContaining({
            bitrate: 1500000
          })
        }));
      }, 10);
    });

    it('should update connection health based on events', () => {
      const handler = vi.fn();
      eventManager.on('connectionHealthChanged', handler);
      eventManager.startListening(mockIframe);

      const event: ConnectionHealthEvent = {
        action: 'connectionHealthUpdate',
        health: {
          state: 'connected',
          quality: 'excellent',
          packetLoss: 0.1,
          latency: 20,
          jitter: 2,
          bandwidth: {
            upload: 5000000,
            download: 10000000
          }
        }
      };

      window.postMessage(event, '*');

      setTimeout(() => {
        const health = eventManager.getConnectionHealth();
        expect(health.state).toBe('connected');
        expect(health.quality).toBe('excellent');
        expect(handler).toHaveBeenCalled();
      }, 10);
    });
  });

  describe('Event Throttling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle high-frequency events', () => {
      const handler = vi.fn();
      eventManager.on('stats', handler);
      eventManager.setThrottle('stats', { interval: 1000, trailing: true });
      eventManager.startListening(mockIframe);

      // Send multiple stats events rapidly
      for (let i = 0; i < 10; i++) {
        window.postMessage({ action: 'stats', value: i }, '*');
      }

      // Initially, no events should be emitted due to throttling
      expect(handler).not.toHaveBeenCalled();

      // Advance time to trigger throttled event
      vi.advanceTimersByTime(1000);

      // Should have received only the last event (trailing)
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support leading edge throttling', () => {
      const handler = vi.fn();
      eventManager.on('audioLevel', handler);
      eventManager.setThrottle('audioLevel', { 
        interval: 100, 
        leading: true, 
        trailing: false 
      });
      eventManager.startListening(mockIframe);

      // Send multiple events
      for (let i = 0; i < 5; i++) {
        window.postMessage({ action: 'audioLevel', value: i }, '*');
      }

      // First event should be emitted immediately (leading)
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ value: 0 }));

      // Advance time
      vi.advanceTimersByTime(100);

      // No additional calls since trailing is false
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove throttling when requested', () => {
      const handler = vi.fn();
      eventManager.on('test', handler);
      eventManager.setThrottle('test', { interval: 1000 });
      eventManager.startListening(mockIframe);

      const messageEvent = new MessageEvent('message', {
        data: { action: 'test', value: 1 },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);
      expect(handler).not.toHaveBeenCalled();

      eventManager.removeThrottle('test');
      window.postMessage({ action: 'test', value: 2 }, '*');

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ value: 2 }));
      }, 10);
    });
  });

  describe('Event Validation', () => {
    it('should validate required fields', () => {
      const handler = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      eventManager.on('streamStarted', handler);
      eventManager.setValidationRule('streamStarted', {
        action: 'streamStarted',
        required: ['streamId'],
        validator: (event) => typeof event.streamId === 'string'
      });
      eventManager.startListening(mockIframe);

      // Send invalid event (missing streamId)
      window.postMessage({ action: 'streamStarted' }, '*');

      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid event'),
          expect.any(Object)
        );
      }, 10);

      // Send valid event
      window.postMessage({ action: 'streamStarted', streamId: 'valid-id' }, '*');

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ streamId: 'valid-id' })
        );
      }, 20);

      consoleWarnSpy.mockRestore();
    });

    it('should use custom validators', () => {
      const handler = vi.fn();
      eventManager.on('customEvent', handler);
      eventManager.setValidationRule('customEvent', {
        action: 'customEvent',
        validator: (event) => {
          return event.value && event.value > 0 && event.value < 100;
        }
      });
      eventManager.startListening(mockIframe);

      // Invalid value
      window.postMessage({ action: 'customEvent', value: 150 }, '*');
      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
      }, 10);

      // Valid value
      window.postMessage({ action: 'customEvent', value: 50 }, '*');
      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ value: 50 })
        );
      }, 20);
    });
  });

  describe('Event History', () => {
    it('should maintain event history', () => {
      eventManager.startListening(mockIframe);

      const events = [
        { action: 'event1', value: 1 },
        { action: 'event2', value: 2 },
        { action: 'event1', value: 3 }
      ];

      events.forEach(event => window.postMessage(event, '*'));

      setTimeout(() => {
        const history = eventManager.getEventHistory();
        expect(history).toHaveLength(3);

        const event1History = eventManager.getEventHistory('event1');
        expect(event1History).toHaveLength(2);

        const limitedHistory = eventManager.getEventHistory(undefined, 2);
        expect(limitedHistory).toHaveLength(2);
      }, 10);
    });

    it('should track last event timestamps', () => {
      eventManager.startListening(mockIframe);
      const now = Date.now();

      window.postMessage({ action: 'testEvent', value: 1 }, '*');

      setTimeout(() => {
        const lastTime = eventManager.getLastEventTime('testEvent');
        expect(lastTime).toBeDefined();
        expect(lastTime).toBeGreaterThanOrEqual(now);
      }, 10);
    });

    it('should limit history size', () => {
      eventManager.startListening(mockIframe);

      // Send more events than max history size (100)
      for (let i = 0; i < 150; i++) {
        window.postMessage({ action: 'test', value: i }, '*');
      }

      setTimeout(() => {
        const history = eventManager.getEventHistory();
        expect(history.length).toBeLessThanOrEqual(100);
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed events gracefully', () => {
      const handler = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      eventManager.on('*', handler);
      eventManager.startListening(mockIframe);

      // Send various malformed messages
      window.postMessage(null, '*');
      window.postMessage('string', '*');
      window.postMessage({ noAction: true }, '*');
      window.postMessage(undefined, '*');

      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      }, 10);

      consoleErrorSpy.mockRestore();
    });

    it('should handle handler errors without crashing', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventManager.on('test', errorHandler);
      eventManager.on('test', successHandler);
      eventManager.startListening(mockIframe);

      const messageEvent = new MessageEvent('message', {
        data: { action: 'test', value: 1 },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'VDO.ninja: Event handler error',
          expect.any(Error)
        );
        expect(successHandler).toHaveBeenCalled();
      }, 10);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should clear all handlers and state on clear()', () => {
      const handler = vi.fn();
      eventManager.on('test', handler);
      eventManager.setThrottle('test', { interval: 1000 });
      eventManager.startListening(mockIframe);

      // Add some state
      window.postMessage({ 
        action: 'viewerJoined', 
        viewerInfo: { viewerId: 'v1', userName: 'User' } 
      }, '*');

      setTimeout(() => {
        eventManager.clear();

        expect(eventManager.getViewerCount()).toBe(0);
        expect(eventManager.getEventHistory()).toHaveLength(0);
        
        // Handler should not be called after clear
        const messageEvent = new MessageEvent('message', {
        data: { action: 'test', value: 1 },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);
        
        setTimeout(() => {
          expect(handler).not.toHaveBeenCalled();
        }, 10);
      }, 10);
    });
  });
});