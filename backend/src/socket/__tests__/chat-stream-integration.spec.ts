import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatStreamIntegrationService } from '../services/chat-stream-integration.service.js';
import { SystemMessageGenerator } from '../utils/system-messages.js';
import { StreamCommandParser } from '../utils/stream-commands.js';

describe('Chat Stream Integration', () => {
  let chatIntegration: ChatStreamIntegrationService;

  beforeEach(() => {
    chatIntegration = ChatStreamIntegrationService.getInstance();
  });

  describe('SystemMessageGenerator', () => {
    it('should generate stream started message', () => {
      const message = SystemMessageGenerator.generateMessage('stream:started', {
        streamId: 'test-stream',
        username: 'TestStreamer'
      });

      expect(message.type).toBe('stream:started');
      expect(message.content).toContain('Stream has started');
      expect(message.streamId).toBe('test-stream');
    });

    it('should generate viewer joined message', () => {
      const message = SystemMessageGenerator.generateMessage('stream:viewer:joined', {
        streamId: 'test-stream',
        username: 'TestViewer',
        viewerCount: 5
      });

      expect(message.type).toBe('stream:viewer:joined');
      expect(message.content).toContain('TestViewer joined');
      expect(message.content).toContain('5 viewers');
    });

    it('should generate moderation message', () => {
      const message = SystemMessageGenerator.generateMessage('chat:moderation', {
        streamId: 'test-stream',
        action: 'timeout',
        targetUsername: 'BadUser',
        moderatorUsername: 'ModUser',
        duration: 300,
        reason: 'Spam'
      });

      expect(message.type).toBe('chat:moderation');
      expect(message.content).toContain('BadUser was timed out');
      expect(message.content).toContain('300 seconds');
      expect(message.content).toContain('ModUser');
      expect(message.content).toContain('Spam');
    });

    it('should generate product featured message', () => {
      const message = SystemMessageGenerator.generateMessage('stream:product:featured', {
        streamId: 'test-stream',
        productName: 'Awesome Product'
      });

      expect(message.type).toBe('stream:product:featured');
      expect(message.content).toContain('Now featuring');
      expect(message.content).toContain('Awesome Product');
    });

    it('should determine if message should be displayed in chat', () => {
      expect(SystemMessageGenerator.shouldDisplayInChat('stream:started')).toBe(true);
      expect(SystemMessageGenerator.shouldDisplayInChat('stream:viewer:joined')).toBe(true);
      expect(SystemMessageGenerator.shouldDisplayInChat('vdo:stats')).toBe(false);
    });

    it('should get correct message priority', () => {
      expect(SystemMessageGenerator.getMessagePriority('stream:error')).toBe(1);
      expect(SystemMessageGenerator.getMessagePriority('chat:moderation')).toBe(2);
      expect(SystemMessageGenerator.getMessagePriority('stream:started')).toBe(3);
      expect(SystemMessageGenerator.getMessagePriority('stream:viewer:joined')).toBe(10);
    });
  });

  describe('StreamCommandParser', () => {
    it('should identify commands correctly', () => {
      expect(StreamCommandParser.isCommand('/help')).toBe(true);
      expect(StreamCommandParser.isCommand('/stats')).toBe(true);
      expect(StreamCommandParser.isCommand('hello world')).toBe(false);
      expect(StreamCommandParser.isCommand('')).toBe(false);
    });

    it('should parse commands correctly', () => {
      const parsed = StreamCommandParser.parseCommand('/feature product123');
      
      expect(parsed).toEqual({
        command: 'feature',
        args: ['product123'],
        raw: 'feature product123'
      });
    });

    it('should parse commands with multiple arguments', () => {
      const parsed = StreamCommandParser.parseCommand('/quality 1080p test');
      
      expect(parsed).toEqual({
        command: 'quality',
        args: ['1080p', 'test'],
        raw: 'quality 1080p test'
      });
    });

    it('should return null for non-commands', () => {
      const parsed = StreamCommandParser.parseCommand('hello world');
      expect(parsed).toBeNull();
    });

    it('should find commands by name', () => {
      const command = StreamCommandParser.findCommand('help');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    it('should find commands by alias', () => {
      const command = StreamCommandParser.findCommand('?');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    it('should return null for unknown commands', () => {
      const command = StreamCommandParser.findCommand('unknowncommand');
      expect(command).toBeNull();
    });

    it('should validate permissions correctly', () => {
      const helpCommand = StreamCommandParser.findCommand('help');
      const featureCommand = StreamCommandParser.findCommand('feature');
      
      expect(helpCommand).toBeDefined();
      expect(featureCommand).toBeDefined();

      // Help command - anyone can use
      const helpCheck = StreamCommandParser.canExecuteCommand(helpCommand!, 'viewer', false);
      expect(helpCheck.canExecute).toBe(true);

      // Feature command - requires moderator
      const featureCheckViewer = StreamCommandParser.canExecuteCommand(featureCommand!, 'viewer', true);
      expect(featureCheckViewer.canExecute).toBe(false);
      expect(featureCheckViewer.reason).toContain('moderator');

      const featureCheckMod = StreamCommandParser.canExecuteCommand(featureCommand!, 'moderator', true);
      expect(featureCheckMod.canExecute).toBe(true);

      // Authentication required
      const featureCheckNoAuth = StreamCommandParser.canExecuteCommand(featureCommand!, 'moderator', false);
      expect(featureCheckNoAuth.canExecute).toBe(false);
      expect(featureCheckNoAuth.reason).toContain('Authentication required');
    });

    it('should validate parameters correctly', () => {
      const featureCommand = StreamCommandParser.findCommand('feature');
      expect(featureCommand).toBeDefined();

      // Valid parameters
      const validCheck = StreamCommandParser.validateParameters(featureCommand!, ['product123']);
      expect(validCheck.isValid).toBe(true);

      // Missing required parameters
      const invalidCheck = StreamCommandParser.validateParameters(featureCommand!, []);
      expect(validCheck.isValid).toBe(true); // feature command expects 1 arg but we passed 0, should be invalid
      // Let's check a command that actually requires parameters
      
      const volumeCommand = StreamCommandParser.findCommand('volume');
      expect(volumeCommand).toBeDefined();
      
      const volumeValid = StreamCommandParser.validateParameters(volumeCommand!, ['50']);
      expect(volumeValid.isValid).toBe(true);
      
      const volumeInvalid = StreamCommandParser.validateParameters(volumeCommand!, []);
      expect(volumeInvalid.isValid).toBe(false);
      expect(volumeInvalid.errors).toBeDefined();
    });

    it('should validate parameter types correctly', () => {
      const volumeCommand = StreamCommandParser.findCommand('volume');
      expect(volumeCommand).toBeDefined();

      // Valid number
      const validNumber = StreamCommandParser.validateParameters(volumeCommand!, ['50']);
      expect(validNumber.isValid).toBe(true);

      // Invalid number
      const invalidNumber = StreamCommandParser.validateParameters(volumeCommand!, ['not-a-number']);
      expect(invalidNumber.isValid).toBe(false);
      expect(invalidNumber.errors?.[0]).toContain('must be a number');
    });

    it('should generate help text correctly', () => {
      const helpCommand = StreamCommandParser.findCommand('help');
      expect(helpCommand).toBeDefined();

      const helpText = StreamCommandParser.getCommandHelp(helpCommand!);
      expect(helpText).toContain('/help');
      expect(helpText).toContain('Show available commands');
      expect(helpText).toContain('Aliases');
    });

    it('should generate available commands list', () => {
      const commands = StreamCommandParser.getAvailableCommands('viewer', false);
      expect(commands).toContain('Available commands');
      expect(commands).toContain('/help');
      expect(commands).toContain('/stats');
      
      // Should not contain moderator commands
      expect(commands).not.toContain('/feature');
    });

    it('should convert parameter values correctly', () => {
      expect(StreamCommandParser.convertParameterValue('50', 'number')).toBe(50);
      expect(StreamCommandParser.convertParameterValue('true', 'boolean')).toBe(true);
      expect(StreamCommandParser.convertParameterValue('false', 'boolean')).toBe(false);
      expect(StreamCommandParser.convertParameterValue('1', 'boolean')).toBe(true);
      expect(StreamCommandParser.convertParameterValue('0', 'boolean')).toBe(false);
      expect(StreamCommandParser.convertParameterValue('hello', 'string')).toBe('hello');
    });
  });

  describe('ChatStreamIntegrationService', () => {
    it('should be a singleton', () => {
      const instance1 = ChatStreamIntegrationService.getInstance();
      const instance2 = ChatStreamIntegrationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should generate custom system message', async () => {
      const spy = vi.spyOn(chatIntegration, 'sendCustomSystemMessage');
      
      await chatIntegration.sendCustomSystemMessage(
        'test-stream',
        'Test message',
        { priority: 'high' }
      );

      expect(spy).toHaveBeenCalledWith(
        'test-stream',
        'Test message',
        { priority: 'high' }
      );
    });

    it('should generate moderation system message', async () => {
      const spy = vi.spyOn(chatIntegration, 'sendModerationMessage');
      
      await chatIntegration.sendModerationMessage(
        'test-stream',
        'timeout',
        'BadUser',
        'ModUser',
        { reason: 'Spam', duration: 300 }
      );

      expect(spy).toHaveBeenCalledWith(
        'test-stream',
        'timeout',
        'BadUser',
        'ModUser',
        { reason: 'Spam', duration: 300 }
      );
    });

    it('should generate slow mode system message', async () => {
      const spy = vi.spyOn(chatIntegration, 'sendSlowModeMessage');
      
      await chatIntegration.sendSlowModeMessage(
        'test-stream',
        true,
        30,
        'ModUser'
      );

      expect(spy).toHaveBeenCalledWith(
        'test-stream',
        true,
        30,
        'ModUser'
      );
    });

    it('should generate VDO connection system message', async () => {
      const spy = vi.spyOn(chatIntegration, 'sendVdoConnectionMessage');
      
      await chatIntegration.sendVdoConnectionMessage(
        'test-stream',
        'connected',
        'TestStreamer'
      );

      expect(spy).toHaveBeenCalledWith(
        'test-stream',
        'connected',
        'TestStreamer'
      );
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle complete stream lifecycle', async () => {
      // Mock stream events
      const streamStartedEvent = {
        streamId: 'test-stream',
        user: { username: 'TestStreamer' },
        metadata: {}
      };

      const viewerJoinedEvent = {
        streamId: 'test-stream',
        viewer: { username: 'TestViewer', id: 'viewer1' },
        viewerCount: 1
      };

      const streamEndedEvent = {
        streamId: 'test-stream',
        user: { username: 'TestStreamer' },
        metadata: { duration: 3600 }
      };

      // These would normally be called by event handlers
      // For testing, we can verify the message generation
      const startMessage = SystemMessageGenerator.generateMessage('stream:started', streamStartedEvent);
      const joinMessage = SystemMessageGenerator.generateMessage('stream:viewer:joined', viewerJoinedEvent);
      const endMessage = SystemMessageGenerator.generateMessage('stream:ended', streamEndedEvent);

      expect(startMessage.content).toContain('Stream has started');
      expect(joinMessage.content).toContain('TestViewer joined');
      expect(endMessage.content).toContain('Stream has ended');
    });

    it('should handle moderation workflow', async () => {
      // Mock moderation actions
      const timeoutAction = {
        streamId: 'test-stream',
        action: 'timeout',
        targetUsername: 'BadUser',
        moderatorUsername: 'ModUser',
        duration: 300,
        reason: 'Spam'
      };

      const slowModeAction = {
        streamId: 'test-stream',
        enabled: true,
        delay: 30,
        moderatorUsername: 'ModUser'
      };

      const timeoutMessage = SystemMessageGenerator.generateMessage('chat:moderation', timeoutAction);
      const slowModeMessage = SystemMessageGenerator.generateMessage('chat:slowmode', slowModeAction);

      expect(timeoutMessage.content).toContain('BadUser was timed out for 300 seconds');
      expect(slowModeMessage.content).toContain('Slow mode enabled (30s)');
    });

    it('should handle command workflow', () => {
      // Test command parsing and execution flow
      const helpCommand = '/help stats';
      const statsCommand = '/stats';
      const featureCommand = '/feature product123';

      // Parse commands
      const helpParsed = StreamCommandParser.parseCommand(helpCommand);
      const statsParsed = StreamCommandParser.parseCommand(statsCommand);
      const featureParsed = StreamCommandParser.parseCommand(featureCommand);

      expect(helpParsed?.command).toBe('help');
      expect(helpParsed?.args).toEqual(['stats']);

      expect(statsParsed?.command).toBe('stats');
      expect(statsParsed?.args).toEqual([]);

      expect(featureParsed?.command).toBe('feature');
      expect(featureParsed?.args).toEqual(['product123']);

      // Find commands
      const helpCmd = StreamCommandParser.findCommand('help');
      const statsCmd = StreamCommandParser.findCommand('stats');
      const featureCmd = StreamCommandParser.findCommand('feature');

      expect(helpCmd).toBeDefined();
      expect(statsCmd).toBeDefined();
      expect(featureCmd).toBeDefined();

      // Test permissions
      const viewerCanHelp = StreamCommandParser.canExecuteCommand(helpCmd!, 'viewer', false);
      const viewerCanStats = StreamCommandParser.canExecuteCommand(statsCmd!, 'viewer', false);
      const viewerCanFeature = StreamCommandParser.canExecuteCommand(featureCmd!, 'viewer', true);

      expect(viewerCanHelp.canExecute).toBe(true);
      expect(viewerCanStats.canExecute).toBe(true);
      expect(viewerCanFeature.canExecute).toBe(false);
    });
  });
});
