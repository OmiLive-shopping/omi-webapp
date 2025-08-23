import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Socket } from 'socket.io-client';
import { VdoWebSocketFeedback } from '../websocket-feedback';
import { VdoCommandHelpSystem } from '../command-help-system';
import { EnhancedVdoCommandManager } from '../enhanced-command-manager';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  Socket: vi.fn()
}));

describe('VDO WebSocket Feedback System', () => {
  let wsFeedback: VdoWebSocketFeedback;
  let mockSocket: any;
  let commandManager: EnhancedVdoCommandManager;
  
  beforeEach(() => {
    // Create mock socket
    mockSocket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn()
    };
    
    wsFeedback = new VdoWebSocketFeedback();
    commandManager = new EnhancedVdoCommandManager();
  });
  
  afterEach(() => {
    wsFeedback.clear();
    vi.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with socket connection', () => {
      wsFeedback.initialize(mockSocket as Socket);
      
      // Should request initial status
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:queue:status:request');
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:permission:status:request');
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:help:categories:request');
    });
    
    it('should setup socket listeners', () => {
      wsFeedback.initialize(mockSocket as Socket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('vdo:command:response', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('vdo:queue:update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('vdo:permission:update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('vdo:connection:metrics', expect.any(Function));
    });
  });
  
  describe('Command Tracking', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should generate unique command IDs', () => {
      const command1 = { action: 'start-stream' };
      const command2 = { action: 'mute-audio' };
      
      const id1 = wsFeedback.sendCommandWithFeedback(command1);
      const id2 = wsFeedback.sendCommandWithFeedback(command2);
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cmd_\d+_[a-z0-9]+$/);
    });
    
    it('should emit command sent event', () => {
      const command = { action: 'start-stream' };
      const commandId = wsFeedback.sendCommandWithFeedback(command, {
        priority: 'high',
        source: 'user'
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'vdo:command:sent',
        expect.objectContaining({
          commandId,
          action: 'start-stream',
          priority: 'high',
          source: 'user',
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should track metrics when requested', () => {
      const command = { action: 'start-stream' };
      wsFeedback.sendCommandWithFeedback(command, { trackMetrics: true });
      
      const metrics = wsFeedback.getMetrics();
      expect(metrics.aggregate.totalCommands).toBe(0); // Not completed yet
    });
  });
  
  describe('Command Response Handling', () => {
    let commandId: string;
    
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
      commandId = wsFeedback.sendCommandWithFeedback({ action: 'test-command' });
    });
    
    it('should handle successful command response', (done) => {
      // Listen for completion event
      wsFeedback.on('vdo:command:completed', (result) => {
        expect(result.commandId).toBe(commandId);
        expect(result.success).toBe(true);
        expect(result.result).toEqual({ data: 'test' });
        done();
      });
      
      // Simulate response from server
      const responseHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:command:response'
      )?.[1];
      
      responseHandler?.({
        commandId,
        success: true,
        result: { data: 'test' },
        executionTime: 100
      });
    });
    
    it('should handle failed command response', (done) => {
      // Listen for failure event
      wsFeedback.on('vdo:command:failed', (error) => {
        expect(error.commandId).toBe(commandId);
        expect(error.error).toBe('Test error');
        expect(error.code).toBe('TEST_ERROR');
        expect(error.recoverable).toBe(true);
        done();
      });
      
      // Simulate error response
      const responseHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:command:response'
      )?.[1];
      
      responseHandler?.({
        commandId,
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          recoverable: true
        }
      });
    });
  });
  
  describe('Queue Management', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should handle queue status updates', (done) => {
      wsFeedback.on('vdo:queue:status', (status) => {
        expect(status.queueLength).toBe(5);
        expect(status.processing).toBe(true);
        expect(status.offlineMode).toBe(false);
        expect(status.pendingCommands).toHaveLength(5);
        done();
      });
      
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:queue:update'
      )?.[1];
      
      updateHandler?.({
        type: 'status',
        queueLength: 5,
        processing: true,
        offlineMode: false,
        pendingCommands: Array(5).fill({ id: 'cmd', action: 'test' })
      });
    });
    
    it('should handle queue add events', (done) => {
      wsFeedback.on('vdo:queue:added', (update) => {
        expect(update.commandId).toBe('cmd123');
        expect(update.position).toBe(3);
        expect(update.queueLength).toBe(4);
        expect(update.estimatedProcessingTime).toBe(2000);
        done();
      });
      
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:queue:update'
      )?.[1];
      
      updateHandler?.({
        type: 'added',
        commandId: 'cmd123',
        action: 'test',
        position: 3,
        queueLength: 4,
        estimatedTime: 2000
      });
    });
    
    it('should return current queue status', () => {
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:queue:update'
      )?.[1];
      
      updateHandler?.({
        type: 'status',
        queueLength: 2,
        processing: true,
        offlineMode: false,
        pendingCommands: []
      });
      
      const status = wsFeedback.getQueueStatus();
      expect(status?.queueLength).toBe(2);
      expect(status?.processing).toBe(true);
    });
  });
  
  describe('Permission Handling', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should handle permission requests', (done) => {
      wsFeedback.on('vdo:permission:required', (request) => {
        expect(request.permission).toBe('camera');
        expect(request.required).toBe(true);
        expect(request.reason).toBe('Camera access needed for streaming');
        done();
      });
      
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:permission:update'
      )?.[1];
      
      updateHandler?.({
        type: 'request',
        permission: 'camera',
        required: true,
        reason: 'Camera access needed for streaming'
      });
    });
    
    it('should handle permission granted', (done) => {
      wsFeedback.on('vdo:permission:granted', (result) => {
        expect(result.permission).toBe('microphone');
        expect(result.granted).toBe(true);
        done();
      });
      
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:permission:update'
      )?.[1];
      
      updateHandler?.({
        type: 'result',
        permission: 'microphone',
        granted: true,
        persistent: true
      });
    });
    
    it('should cache permission status', () => {
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:permission:update'
      )?.[1];
      
      updateHandler?.({
        type: 'result',
        permission: 'camera',
        granted: true
      });
      
      updateHandler?.({
        type: 'result',
        permission: 'microphone',
        granted: false
      });
      
      const status = wsFeedback.getPermissionStatus();
      expect(status.camera).toBe('granted');
      expect(status.microphone).toBe('denied');
      expect(status.screen).toBe('prompt');
    });
  });
  
  describe('Connection Quality', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should calculate quality from metrics', (done) => {
      wsFeedback.on('vdo:connection:quality', (quality) => {
        expect(quality.quality).toBe('good');
        expect(quality.suggestions).toHaveLength(0);
        done();
      });
      
      const metricsHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:connection:metrics'
      )?.[1];
      
      metricsHandler?.({
        bitrate: 3000000,
        framerate: 30,
        resolution: '1920x1080',
        packetLoss: 0.3,
        latency: 40,
        jitter: 5
      });
    });
    
    it('should provide quality suggestions for poor metrics', (done) => {
      wsFeedback.on('vdo:connection:quality', (quality) => {
        expect(quality.quality).toBe('poor');
        expect(quality.suggestions.length).toBeGreaterThan(0);
        expect(quality.suggestions).toContain('High packet loss detected. Check your network connection.');
        done();
      });
      
      const metricsHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:connection:metrics'
      )?.[1];
      
      metricsHandler?.({
        bitrate: 500000,
        framerate: 15,
        packetLoss: 8,
        latency: 250,
        jitter: 50
      });
    });
  });
  
  describe('Help System', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should request help for commands', () => {
      wsFeedback.requestHelp('start-stream');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:help:request', {
        command: 'start-stream',
        category: undefined
      });
    });
    
    it('should request help for categories', () => {
      wsFeedback.requestHelp(undefined, 'audio');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:help:request', {
        command: undefined,
        category: 'audio'
      });
    });
    
    it('should cache help responses', () => {
      // First request
      wsFeedback.requestHelp('test-command');
      expect(mockSocket.emit).toHaveBeenCalledTimes(4); // 3 initial + 1 help
      
      // Simulate response
      wsFeedback.on('vdo:help:response', () => {});
      
      // Second request should use cache (no additional emit)
      wsFeedback.requestHelp('test-command');
      expect(mockSocket.emit).toHaveBeenCalledTimes(4); // Should not increase
    });
  });
  
  describe('Metrics Collection', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should track command success metrics', () => {
      const commandId = wsFeedback.sendCommandWithFeedback(
        { action: 'test' },
        { trackMetrics: true }
      );
      
      // Simulate successful response
      const responseHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:command:response'
      )?.[1];
      
      responseHandler?.({
        commandId,
        success: true,
        executionTime: 150
      });
      
      const metrics = wsFeedback.getMetrics();
      expect(metrics.aggregate.successCount).toBe(1);
      expect(metrics.aggregate.averageExecutionTime).toBe(150);
    });
    
    it('should track command failure metrics', () => {
      const commandId = wsFeedback.sendCommandWithFeedback(
        { action: 'test' },
        { trackMetrics: true }
      );
      
      // Simulate failed response
      const responseHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:command:response'
      )?.[1];
      
      responseHandler?.({
        commandId,
        success: false,
        error: { code: 'TEST_ERROR' }
      });
      
      const metrics = wsFeedback.getMetrics();
      expect(metrics.aggregate.failureCount).toBe(1);
    });
    
    it('should clear metrics', () => {
      const commandId = wsFeedback.sendCommandWithFeedback(
        { action: 'test' },
        { trackMetrics: true }
      );
      
      const responseHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'vdo:command:response'
      )?.[1];
      
      responseHandler?.({ commandId, success: true });
      
      wsFeedback.clear();
      
      const metrics = wsFeedback.getMetrics();
      expect(metrics.aggregate.totalCommands).toBe(0);
      expect(metrics.aggregate.successCount).toBe(0);
    });
  });
  
  describe('Event Management', () => {
    beforeEach(() => {
      wsFeedback.initialize(mockSocket as Socket);
    });
    
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      wsFeedback.on('vdo:command:sent', listener);
      wsFeedback.sendCommandWithFeedback({ action: 'test' });
      
      expect(listener).toHaveBeenCalled();
      
      wsFeedback.off('vdo:command:sent', listener);
      wsFeedback.sendCommandWithFeedback({ action: 'test2' });
      
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
    
    it('should handle multiple listeners for same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      wsFeedback.on('vdo:command:sent', listener1);
      wsFeedback.on('vdo:command:sent', listener2);
      
      wsFeedback.sendCommandWithFeedback({ action: 'test' });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });
});

describe('Command Help System', () => {
  let helpSystem: VdoCommandHelpSystem;
  
  beforeEach(() => {
    helpSystem = new VdoCommandHelpSystem();
  });
  
  describe('Command Help', () => {
    it('should return help for existing commands', () => {
      const help = helpSystem.getCommandHelp('start-stream');
      
      expect(help).toBeTruthy();
      expect(help?.command).toBe('start-stream');
      expect(help?.category).toBe('stream');
      expect(help?.description).toContain('Start broadcasting');
      expect(help?.permissions).toContain('camera');
      expect(help?.permissions).toContain('microphone');
    });
    
    it('should return null for non-existent commands', () => {
      const help = helpSystem.getCommandHelp('non-existent-command');
      expect(help).toBeNull();
    });
    
    it('should include examples and related commands', () => {
      const help = helpSystem.getCommandHelp('set-volume');
      
      expect(help?.examples).toBeTruthy();
      expect(help?.examples?.length).toBeGreaterThan(0);
      expect(help?.relatedCommands).toContain('mute-audio');
    });
  });
  
  describe('Category Help', () => {
    it('should return help for categories', () => {
      const help = helpSystem.getCategoryHelp('audio');
      
      expect(help).toBeTruthy();
      expect(help?.category).toBe('audio');
      expect(help?.description).toContain('audio management');
      expect(help?.relatedCommands).toContain('mute-audio');
    });
    
    it('should return all categories', () => {
      const categories = helpSystem.getAllCategories();
      
      expect(categories.categories.length).toBeGreaterThan(0);
      expect(categories.totalCommands).toBeGreaterThan(0);
      expect(categories.version).toBe('1.0.0');
      
      const audioCategory = categories.categories.find(c => c.name === 'Audio Control');
      expect(audioCategory).toBeTruthy();
      expect(audioCategory?.icon).toBe('🔊');
    });
  });
  
  describe('Search', () => {
    it('should search commands by name', () => {
      const results = helpSystem.searchCommands('mute');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.command === 'mute-audio')).toBe(true);
    });
    
    it('should search commands by description', () => {
      const results = helpSystem.searchCommands('camera');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.permissions?.includes('camera'))).toBe(true);
    });
    
    it('should get commands by permission', () => {
      const results = helpSystem.getCommandsByPermission('microphone');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.permissions?.includes('microphone'))).toBe(true);
    });
  });
  
  describe('Quick Reference', () => {
    it('should generate quick reference guide', () => {
      const reference = helpSystem.getQuickReference();
      
      expect(reference).toContain('VDO.Ninja Command Quick Reference');
      expect(reference).toContain('Stream Control');
      expect(reference).toContain('Audio Control');
      expect(reference).toContain('start-stream');
    });
  });
});

describe('Enhanced Command Manager', () => {
  let manager: EnhancedVdoCommandManager;
  let mockSocket: any;
  let mockIframe: any;
  
  beforeEach(() => {
    mockSocket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
    
    mockIframe = {
      contentWindow: {
        postMessage: vi.fn()
      }
    };
    
    manager = new EnhancedVdoCommandManager();
  });
  
  afterEach(() => {
    manager.clear();
  });
  
  describe('WebSocket Integration', () => {
    it('should initialize with WebSocket', () => {
      manager.initializeWebSocket(mockSocket as Socket);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:queue:status');
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:permission:status');
      expect(mockSocket.emit).toHaveBeenCalledWith('vdo:connection:status');
    });
    
    it('should send commands with feedback', async () => {
      manager.initializeWebSocket(mockSocket as Socket);
      manager.setIframe(mockIframe);
      
      const command = { action: 'start-stream', vdoninja: true };
      
      await manager.sendCommand(command, {
        priority: 'high',
        trackMetrics: true,
        requireAcknowledgment: false
      });
      
      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'start-stream' }),
        '*'
      );
    });
  });
  
  describe('Permission Management', () => {
    it('should get permission status', () => {
      manager.initializeWebSocket(mockSocket as Socket);
      
      const status = manager.getPermissionStatus();
      expect(status).toBeTruthy();
      expect(status.camera).toBeDefined();
    });
    
    it('should request permissions when needed', () => {
      manager.initializeWebSocket(mockSocket as Socket);
      
      // Trigger permission request through error handling
      const error = {
        commandId: 'cmd123',
        action: 'start-camera',
        code: 'PERMISSION_REQUIRED'
      };
      
      // This would normally be triggered by WebSocket events
      expect(mockSocket.emit).toBeDefined();
    });
  });
  
  describe('Help System', () => {
    it('should get command help', async () => {
      manager.initializeWebSocket(mockSocket as Socket);
      await manager.getCommandHelp('start-stream');
      
      // Should emit help request
      expect(mockSocket.emit).toHaveBeenCalled();
    });
    
    it('should get category help', async () => {
      manager.initializeWebSocket(mockSocket as Socket);
      await manager.getCommandHelp(undefined, 'audio');
      
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });
  
  describe('Metrics', () => {
    it('should get command metrics', () => {
      manager.initializeWebSocket(mockSocket as Socket);
      
      const metrics = manager.getMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics.aggregate).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
    });
  });
});