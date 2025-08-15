import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamStateManager } from '../stream-state-manager';
import { VdoEventManager } from '../event-manager';
import type {
  StreamLifecycleEvent,
  ViewerEvent,
  MediaStateEvent,
  QualityEvent,
  ConnectionHealthEvent
} from '../types';

describe('StreamStateManager', () => {
  let stateManager: StreamStateManager;
  let eventManager: VdoEventManager;
  let mockIframe: HTMLIFrameElement;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Create instances
    stateManager = new StreamStateManager(
      { enabled: false }, // Disable persistence for tests
      { maxAttempts: 3, baseDelay: 100 } // Faster retry for tests
    );
    eventManager = new VdoEventManager();
    
    // Create mock iframe
    mockIframe = document.createElement('iframe');
    document.body.appendChild(mockIframe);
    
    // Initialize
    eventManager.startListening(mockIframe);
    stateManager.initialize(eventManager);
  });

  afterEach(() => {
    stateManager.cleanup();
    eventManager.stopListening();
    eventManager.clear();
    if (mockIframe.parentNode) {
      document.body.removeChild(mockIframe);
    }
    vi.clearAllTimers();
  });

  describe('Stream Lifecycle Management', () => {
    it('should handle stream started event', (done) => {
      const handler = vi.fn();
      stateManager.onChange(handler);

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

      const messageEvent = new MessageEvent('message', {
        data: event,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        const state = stateManager.getState();
        expect(state.isStreaming).toBe(true);
        expect(state.streamId).toBe('test-stream-123');
        expect(state.startTime).toBeDefined();
        expect(handler).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should handle stream stopped event', (done) => {
      // First start a stream
      stateManager.setState({ 
        isStreaming: true, 
        startTime: Date.now() - 5000,
        streamId: 'test-stream'
      });

      const event: StreamLifecycleEvent = {
        action: 'streamStopped',
        streamId: 'test-stream'
      };

      const messageEvent = new MessageEvent('message', {
        data: event,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        const state = stateManager.getState();
        expect(state.isStreaming).toBe(false);
        expect(state.duration).toBeGreaterThan(0);
        done();
      }, 10);
    });

    it('should handle stream pause and resume', (done) => {
      stateManager.setState({ isStreaming: true });

      // Pause event
      const pauseEvent = new MessageEvent('message', {
        data: { action: 'streamPaused' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(pauseEvent);

      setTimeout(() => {
        expect(stateManager.getValue('isPaused')).toBe(true);

        // Resume event
        const resumeEvent = new MessageEvent('message', {
          data: { action: 'streamResumed' },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(resumeEvent);

        setTimeout(() => {
          expect(stateManager.getValue('isPaused')).toBe(false);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Viewer Management', () => {
    it('should track viewer join and leave', (done) => {
      const joinEvent: ViewerEvent = {
        action: 'viewerJoined',
        viewerInfo: {
          viewerId: 'viewer-1',
          userName: 'Viewer One',
          joinTime: Date.now(),
          connectionQuality: 'good'
        }
      };

      const messageEvent = new MessageEvent('message', {
        data: joinEvent,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        let state = stateManager.getState();
        expect(state.viewerCount).toBe(1);
        expect(state.activeViewers.has('viewer-1')).toBe(true);
        expect(state.peakViewerCount).toBe(1);

        // Add another viewer
        const joinEvent2 = new MessageEvent('message', {
          data: {
            action: 'viewerJoined',
            viewerInfo: {
              viewerId: 'viewer-2',
              userName: 'Viewer Two',
              joinTime: Date.now()
            }
          },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(joinEvent2);

        setTimeout(() => {
          state = stateManager.getState();
          expect(state.viewerCount).toBe(2);
          expect(state.peakViewerCount).toBe(2);

          // Viewer leaves
          const leaveEvent = new MessageEvent('message', {
            data: {
              action: 'viewerLeft',
              viewerInfo: { viewerId: 'viewer-1' }
            },
            source: mockIframe.contentWindow,
            origin: '*'
          });
          window.dispatchEvent(leaveEvent);

          setTimeout(() => {
            state = stateManager.getState();
            expect(state.viewerCount).toBe(1);
            expect(state.peakViewerCount).toBe(2); // Peak remains
            done();
          }, 10);
        }, 10);
      }, 10);
    });

    it('should handle viewer reconnection', (done) => {
      // Add initial viewer
      stateManager.setState({
        activeViewers: new Map([
          ['viewer-1', {
            viewerId: 'viewer-1',
            userName: 'Original Name',
            joinTime: Date.now() - 5000,
            lastActivity: Date.now() - 1000
          }]
        ]),
        viewerCount: 1
      });

      const reconnectEvent: ViewerEvent = {
        action: 'viewerReconnected',
        viewerInfo: {
          viewerId: 'viewer-1',
          userName: 'Updated Name',
          connectionQuality: 'excellent'
        }
      };

      const messageEvent = new MessageEvent('message', {
        data: reconnectEvent,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        const state = stateManager.getState();
        const viewer = state.activeViewers.get('viewer-1');
        expect(viewer?.userName).toBe('Updated Name');
        expect(viewer?.connectionQuality).toBe('excellent');
        expect(viewer?.lastActivity).toBeGreaterThan(Date.now() - 100);
        done();
      }, 10);
    });
  });

  describe('Media Controls State', () => {
    it('should handle media mute/unmute events', (done) => {
      // Mute audio
      let event = new MessageEvent('message', {
        data: { action: 'audioMuted' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        expect(stateManager.getValue('audioEnabled')).toBe(false);

        // Unmute audio
        event = new MessageEvent('message', {
          data: { action: 'audioUnmuted' },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(event);

        setTimeout(() => {
          expect(stateManager.getValue('audioEnabled')).toBe(true);

          // Mute video
          event = new MessageEvent('message', {
            data: { action: 'videoMuted' },
            source: mockIframe.contentWindow,
            origin: '*'
          });
          window.dispatchEvent(event);

          setTimeout(() => {
            expect(stateManager.getValue('videoEnabled')).toBe(false);
            done();
          }, 10);
        }, 10);
      }, 10);
    });

    it('should handle media state changed event', (done) => {
      const mediaEvent: MediaStateEvent = {
        action: 'mediaStateChanged',
        mediaState: {
          audioEnabled: false,
          videoEnabled: true,
          screenShareEnabled: true,
          audioDevice: 'device-1',
          videoDevice: 'device-2'
        }
      };

      const messageEvent = new MessageEvent('message', {
        data: mediaEvent,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        const state = stateManager.getState();
        expect(state.audioEnabled).toBe(false);
        expect(state.videoEnabled).toBe(true);
        expect(state.screenShareEnabled).toBe(true);
        expect(state.currentAudioDevice).toBe('device-1');
        expect(state.currentVideoDevice).toBe('device-2');
        done();
      }, 10);
    });
  });

  describe('Quality Monitoring', () => {
    it('should handle quality change events', (done) => {
      const qualityEvent: QualityEvent = {
        action: 'qualityChanged',
        quality: {
          bitrate: 2500000,
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          codec: 'h264',
          level: 'high'
        }
      };

      const messageEvent = new MessageEvent('message', {
        data: qualityEvent,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        const state = stateManager.getState();
        expect(state.bitrate).toBe(2500000);
        expect(state.resolution).toEqual({ width: 1920, height: 1080 });
        expect(state.framerate).toBe(30);
        done();
      }, 10);
    });

    it('should handle individual quality metric events', (done) => {
      // Bitrate change
      let event = new MessageEvent('message', {
        data: {
          action: 'bitrateChanged',
          quality: { bitrate: 1500000 }
        },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        expect(stateManager.getValue('bitrate')).toBe(1500000);

        // Resolution change
        event = new MessageEvent('message', {
          data: {
            action: 'resolutionChanged',
            quality: { resolution: { width: 1280, height: 720 } }
          },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(event);

        setTimeout(() => {
          expect(stateManager.getValue('resolution')).toEqual({ width: 1280, height: 720 });

          // Framerate change
          event = new MessageEvent('message', {
            data: {
              action: 'framerateChanged',
              quality: { framerate: 60 }
            },
            source: mockIframe.contentWindow,
            origin: '*'
          });
          window.dispatchEvent(event);

          setTimeout(() => {
            expect(stateManager.getValue('framerate')).toBe(60);
            done();
          }, 10);
        }, 10);
      }, 10);
    });
  });

  describe('Connection Health', () => {
    it('should handle connection state changes', (done) => {
      // Connected
      let event = new MessageEvent('message', {
        data: { action: 'connected' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        expect(stateManager.getValue('connectionState')).toBe('connected');

        // Disconnected
        event = new MessageEvent('message', {
          data: { action: 'disconnected' },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(event);

        setTimeout(() => {
          expect(stateManager.getValue('connectionState')).toBe('disconnected');

          // Failed
          event = new MessageEvent('message', {
            data: { action: 'connectionFailed' },
            source: mockIframe.contentWindow,
            origin: '*'
          });
          window.dispatchEvent(event);

          setTimeout(() => {
            expect(stateManager.getValue('connectionState')).toBe('failed');
            done();
          }, 10);
        }, 10);
      }, 10);
    });

    it('should handle connection health updates', (done) => {
      const healthEvent: ConnectionHealthEvent = {
        action: 'connectionHealthUpdate',
        health: {
          state: 'connected',
          quality: 'excellent',
          packetLoss: 0.5,
          latency: 15,
          jitter: 2,
          bandwidth: {
            upload: 5000000,
            download: 10000000
          }
        }
      };

      const messageEvent = new MessageEvent('message', {
        data: healthEvent,
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(messageEvent);

      setTimeout(() => {
        const state = stateManager.getState();
        expect(state.connectionState).toBe('connected');
        expect(state.connectionQuality).toBe('excellent');
        expect(state.packetLoss).toBe(0.5);
        expect(state.latency).toBe(15);
        done();
      }, 10);
    });
  });

  describe('Retry Mechanism', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on connection failure', () => {
      const handler = vi.fn();
      stateManager.onChange(handler);

      // Trigger connection failure
      const event = new MessageEvent('message', {
        data: { action: 'connectionFailed' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      // Should be in failed state initially
      expect(stateManager.getValue('connectionState')).toBe('failed');
      
      // Check retry status
      let retryStatus = stateManager.getRetryStatus();
      expect(retryStatus.isRetrying).toBe(true);
      expect(retryStatus.attempts).toBe(1);

      // Advance time to trigger retry
      vi.advanceTimersByTime(100);

      // Should be in reconnecting state
      expect(stateManager.getValue('connectionState')).toBe('reconnecting');
      
      // Simulate successful reconnection
      const connectedEvent = new MessageEvent('message', {
        data: { action: 'connected' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(connectedEvent);

      retryStatus = stateManager.getRetryStatus();
      expect(retryStatus.attempts).toBe(0);
      expect(retryStatus.isRetrying).toBe(false);
    });

    it('should use exponential backoff for retries', () => {
      // First failure
      let event = new MessageEvent('message', {
        data: { action: 'connectionFailed' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      expect(stateManager.getRetryStatus().attempts).toBe(1);

      // Advance time for first retry (100ms base delay)
      vi.advanceTimersByTime(100);
      expect(stateManager.getValue('connectionState')).toBe('reconnecting');

      // Second failure
      event = new MessageEvent('message', {
        data: { action: 'connectionFailed' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      expect(stateManager.getRetryStatus().attempts).toBe(2);

      // Advance time for second retry (200ms with 2x backoff)
      vi.advanceTimersByTime(200);
      expect(stateManager.getValue('connectionState')).toBe('reconnecting');
    });

    it('should stop retrying after max attempts', () => {
      // Trigger multiple failures
      for (let i = 0; i < 4; i++) {
        const event = new MessageEvent('message', {
          data: { action: 'connectionFailed' },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(event);
        vi.advanceTimersByTime(1000);
      }

      const retryStatus = stateManager.getRetryStatus();
      expect(retryStatus.attempts).toBe(3); // Max is 3
      expect(retryStatus.isRetrying).toBe(false);
    });

    it('should allow manual retry control', () => {
      // Cancel retry
      stateManager.cancelRetry();
      expect(stateManager.getRetryStatus().isRetrying).toBe(false);

      // Force retry
      stateManager.forceRetry();
      expect(stateManager.getRetryStatus().isRetrying).toBe(true);
    });
  });

  describe('State Persistence', () => {
    it('should persist and restore state', () => {
      // Create manager with persistence enabled
      const persistentManager = new StreamStateManager({
        enabled: true,
        storageKey: 'test-stream-state'
      });

      // Set some state
      persistentManager.setState({
        bitrate: 2000000,
        resolution: { width: 1920, height: 1080 },
        framerate: 30,
        currentAudioDevice: 'device-1',
        currentVideoDevice: 'device-2'
      });

      // Cleanup to trigger persistence
      persistentManager.cleanup();

      // Create new manager that should load persisted state
      const newManager = new StreamStateManager({
        enabled: true,
        storageKey: 'test-stream-state'
      });

      const state = newManager.getState();
      expect(state.bitrate).toBe(2000000);
      expect(state.resolution).toEqual({ width: 1920, height: 1080 });
      expect(state.framerate).toBe(30);
      expect(state.currentAudioDevice).toBe('device-1');
      expect(state.currentVideoDevice).toBe('device-2');

      // Transient fields should not be restored
      expect(state.isStreaming).toBe(false);
      expect(state.connectionState).toBe('idle');

      newManager.cleanup();
    });

    it('should exclude specified fields from persistence', () => {
      const manager = new StreamStateManager({
        enabled: true,
        storageKey: 'test-exclude',
        fieldsToExclude: ['bitrate', 'framerate']
      });

      manager.setState({
        bitrate: 3000000,
        framerate: 60,
        resolution: { width: 1280, height: 720 }
      });

      manager.cleanup();

      const newManager = new StreamStateManager({
        enabled: true,
        storageKey: 'test-exclude',
        fieldsToExclude: ['bitrate', 'framerate']
      });

      const state = newManager.getState();
      expect(state.bitrate).toBe(0); // Default value
      expect(state.framerate).toBe(0); // Default value
      expect(state.resolution).toEqual({ width: 1280, height: 720 }); // Persisted

      newManager.cleanup();
    });
  });

  describe('State History', () => {
    it('should maintain state change history', () => {
      stateManager.setState({ bitrate: 1000000 });
      stateManager.setState({ framerate: 30 });
      stateManager.setState({ resolution: { width: 1920, height: 1080 } });

      const history = stateManager.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].state).toHaveProperty('bitrate', 1000000);
      expect(history[1].state).toHaveProperty('framerate', 30);
      expect(history[2].state).toHaveProperty('resolution');
    });

    it('should limit history size', () => {
      // Set max history size by filling it
      for (let i = 0; i < 60; i++) {
        stateManager.setState({ bitrate: i * 1000 });
      }

      const history = stateManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(50); // Default max
    });
  });

  describe('State Change Events', () => {
    it('should emit change events', (done) => {
      const handler = vi.fn();
      const unsubscribe = stateManager.onChange(handler);

      stateManager.setState({ bitrate: 2000000 });

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'bitrate',
            previousValue: 0,
            newValue: 2000000,
            timestamp: expect.any(Number)
          })
        );

        unsubscribe();
        stateManager.setState({ framerate: 30 });

        setTimeout(() => {
          // Handler should not be called after unsubscribe
          expect(handler).toHaveBeenCalledTimes(1);
          done();
        }, 10);
      }, 10);
    });

    it('should emit multiple changes as single event', (done) => {
      const handler = vi.fn();
      stateManager.onChange(handler);

      stateManager.setState({
        bitrate: 3000000,
        framerate: 60,
        resolution: { width: 1920, height: 1080 }
      });

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'multiple',
            timestamp: expect.any(Number)
          })
        );
        done();
      }, 10);
    });
  });

  describe('Recording State', () => {
    it('should handle recording events', (done) => {
      // Start recording
      let event = new MessageEvent('message', {
        data: { action: 'recordingStarted' },
        source: mockIframe.contentWindow,
        origin: '*'
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        const state = stateManager.getState();
        expect(state.isRecording).toBe(true);
        expect(state.recordingStartTime).toBeDefined();

        // Stop recording
        event = new MessageEvent('message', {
          data: { action: 'recordingStopped' },
          source: mockIframe.contentWindow,
          origin: '*'
        });
        window.dispatchEvent(event);

        setTimeout(() => {
          const newState = stateManager.getState();
          expect(newState.isRecording).toBe(false);
          expect(newState.recordingStartTime).toBe(null);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('State Reset', () => {
    it('should reset state to defaults', () => {
      // Set custom state
      stateManager.setState({
        streamId: 'test-123',
        isStreaming: true,
        bitrate: 2000000,
        viewerCount: 5
      });

      // Reset
      stateManager.reset();

      const state = stateManager.getState();
      expect(state.streamId).toBe(null);
      expect(state.isStreaming).toBe(false);
      expect(state.bitrate).toBe(0);
      expect(state.viewerCount).toBe(0);
      expect(stateManager.getHistory()).toHaveLength(0);
    });
  });

  describe('Manual State Control', () => {
    it('should allow manual state updates', () => {
      stateManager.setState({
        bitrate: 1500000,
        connectionQuality: 'excellent'
      });

      expect(stateManager.getValue('bitrate')).toBe(1500000);
      expect(stateManager.getValue('connectionQuality')).toBe('excellent');
    });

    it('should get specific state values', () => {
      stateManager.setState({
        streamId: 'stream-123',
        viewerCount: 10
      });

      expect(stateManager.getValue('streamId')).toBe('stream-123');
      expect(stateManager.getValue('viewerCount')).toBe(10);
    });
  });
});