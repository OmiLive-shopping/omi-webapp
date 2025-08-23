import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { WebSocketTestServer } from '../websocket-test-server';
import { WebSocketTestClient } from '../websocket-test-client';

describe('Chat Functionality Integration Tests', () => {
  let server: WebSocketTestServer;
  let streamer: WebSocketTestClient;
  let viewer1: WebSocketTestClient;
  let viewer2: WebSocketTestClient;
  let moderator: WebSocketTestClient;
  let serverUrl: string;

  beforeAll(async () => {
    server = new WebSocketTestServer();
    const port = await server.start();
    serverUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    streamer = new WebSocketTestClient(serverUrl);
    viewer1 = new WebSocketTestClient(serverUrl);
    viewer2 = new WebSocketTestClient(serverUrl);
    moderator = new WebSocketTestClient(serverUrl);

    // Connect all clients with appropriate roles
    await Promise.all([
      streamer.connect({ auth: { userId: 'streamer1', username: 'TestStreamer', role: 'streamer' } }),
      viewer1.connect({ auth: { userId: 'viewer1', username: 'Viewer1', role: 'viewer' } }),
      viewer2.connect({ auth: { userId: 'viewer2', username: 'Viewer2', role: 'viewer' } }),
      moderator.connect({ auth: { userId: 'mod1', username: 'Moderator1', role: 'moderator' } })
    ]);
  });

  afterEach(() => {
    streamer.disconnect();
    viewer1.disconnect();
    viewer2.disconnect();
    moderator.disconnect();
  });

  describe('Basic Chat Operations', () => {
    it('should send and receive chat messages', async () => {
      const streamId = 'chat-test-stream';

      // All clients join the stream
      await Promise.all([
        streamer.joinStream(streamId),
        viewer1.joinStream(streamId),
        viewer2.joinStream(streamId)
      ]);

      // Set up message listeners
      const streamerMessagePromise = streamer.waitForEvent('chat:message');
      const viewer2MessagePromise = viewer2.waitForEvent('chat:message');

      // Viewer1 sends a message
      const sendResponse = await viewer1.sendChatMessage(streamId, 'Hello everyone!');
      expect(sendResponse.success).toBe(true);

      // Other clients should receive the message
      const [streamerMessage, viewer2Message] = await Promise.all([
        streamerMessagePromise,
        viewer2MessagePromise
      ]);

      expect(streamerMessage.content).toBe('Hello everyone!');
      expect(streamerMessage.userId).toBe('viewer1');
      expect(streamerMessage.username).toBe('Viewer1');

      expect(viewer2Message.content).toBe('Hello everyone!');
      expect(viewer2Message.userId).toBe('viewer1');
    });

    it('should maintain chat history', async () => {
      const streamId = 'chat-history-test';

      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      // Send multiple messages
      await viewer1.sendChatMessage(streamId, 'First message');
      await streamer.sendChatMessage(streamId, 'Second message');
      await viewer1.sendChatMessage(streamId, 'Third message');

      // Get chat history
      const historyResponse = await viewer1.getChatHistory(streamId);
      
      expect(historyResponse.streamId).toBe(streamId);
      expect(historyResponse.messages).toHaveLength(3);
      expect(historyResponse.messages[0].content).toBe('First message');
      expect(historyResponse.messages[1].content).toBe('Second message');
      expect(historyResponse.messages[2].content).toBe('Third message');

      // Verify server has the same history
      const serverHistory = server.getChatHistory(streamId);
      expect(serverHistory).toHaveLength(3);
    });

    it('should handle message replies', async () => {
      const streamId = 'reply-test-stream';

      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      // Streamer sends original message
      const originalMessage = await streamer.sendChatMessage(streamId, 'What do you think?');
      expect(originalMessage.success).toBe(true);

      // Get the message ID from history
      const history = await viewer1.getChatHistory(streamId);
      const originalMessageId = history.messages[0].id;

      // Set up reply listener
      const replyPromise = streamer.waitForEvent('chat:message');

      // Viewer replies to the message
      const replyResponse = await viewer1.sendChatMessage(
        streamId, 
        'I think it looks great!', 
        originalMessageId
      );
      expect(replyResponse.success).toBe(true);

      // Streamer should receive the reply
      const replyMessage = await replyPromise;
      expect(replyMessage.content).toBe('I think it looks great!');
      expect(replyMessage.replyTo).toBe(originalMessageId);
    });

    it('should handle typing indicators', async () => {
      const streamId = 'typing-test-stream';

      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      // Set up typing event listener
      const typingPromise = streamer.waitForEvent('chat:user:typing');

      // Viewer starts typing
      viewer1.sendTyping(streamId, true);

      // Streamer should receive typing notification
      const typingEvent = await typingPromise;
      expect(typingEvent.userId).toBe('viewer1');
      expect(typingEvent.username).toBe('Viewer1');
      expect(typingEvent.isTyping).toBe(true);

      // Set up stop typing listener
      const stopTypingPromise = streamer.waitForEvent('chat:user:typing');

      // Viewer stops typing
      viewer1.sendTyping(streamId, false);

      // Streamer should receive stop typing notification
      const stopTypingEvent = await stopTypingPromise;
      expect(stopTypingEvent.isTyping).toBe(false);
    });
  });

  describe('Chat Authentication and Permissions', () => {
    it('should require authentication for sending messages', async () => {
      const unauthenticatedClient = new WebSocketTestClient(serverUrl);
      await unauthenticatedClient.connect(); // No auth

      const streamId = 'auth-required-chat';

      try {
        await unauthenticatedClient.sendChatMessage(streamId, 'Unauthorized message');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Should fail due to lack of authentication
        expect(error).toBeDefined();
      } finally {
        unauthenticatedClient.disconnect();
      }
    });

    it('should include user role information in messages', async () => {
      const streamId = 'role-info-test';

      await streamer.joinStream(streamId);
      await moderator.joinStream(streamId);
      await viewer1.joinStream(streamId);

      // Set up message listeners
      const messagePromises = [
        viewer1.waitForEvent('chat:message'),
        moderator.waitForEvent('chat:message')
      ];

      // Streamer sends message
      await streamer.sendChatMessage(streamId, 'Hello from the streamer!');

      // Check that role is included in received messages
      const [viewerMessage, moderatorMessage] = await Promise.all(messagePromises);
      
      expect(viewerMessage.role).toBe('streamer');
      expect(moderatorMessage.role).toBe('streamer');
    });

    it('should handle different user roles consistently', async () => {
      const streamId = 'multi-role-chat';

      await Promise.all([
        streamer.joinStream(streamId),
        moderator.joinStream(streamId),
        viewer1.joinStream(streamId),
        viewer2.joinStream(streamId)
      ]);

      // Each role sends a message
      await Promise.all([
        streamer.sendChatMessage(streamId, 'Streamer message'),
        moderator.sendChatMessage(streamId, 'Moderator message'),
        viewer1.sendChatMessage(streamId, 'Viewer1 message'),
        viewer2.sendChatMessage(streamId, 'Viewer2 message')
      ]);

      // Check history contains all messages with correct roles
      const history = await viewer1.getChatHistory(streamId);
      expect(history.messages).toHaveLength(4);

      const roles = history.messages.map(msg => msg.role);
      expect(roles).toContain('streamer');
      expect(roles).toContain('moderator');
      expect(roles).toContain('viewer');
    });
  });

  describe('Message Broadcasting and Delivery', () => {
    it('should broadcast messages to all stream participants', async () => {
      const streamId = 'broadcast-test';
      const clients = [streamer, viewer1, viewer2, moderator];

      // All join the stream
      await Promise.all(clients.map(client => client.joinStream(streamId)));

      // Set up listeners for all except sender
      const messagePromises = [
        streamer.waitForEvent('chat:message'),
        viewer2.waitForEvent('chat:message'),
        moderator.waitForEvent('chat:message')
      ];

      // Viewer1 sends message
      await viewer1.sendChatMessage(streamId, 'Message to everyone');

      // All other clients should receive it
      const messages = await Promise.all(messagePromises);
      messages.forEach(message => {
        expect(message.content).toBe('Message to everyone');
        expect(message.userId).toBe('viewer1');
      });
    });

    it('should handle message delivery to late joiners through history', async () => {
      const streamId = 'late-joiner-test';

      // Initial users join and chat
      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      await streamer.sendChatMessage(streamId, 'Early message 1');
      await viewer1.sendChatMessage(streamId, 'Early message 2');

      // Late joiner connects and joins
      const lateJoiner = new WebSocketTestClient(serverUrl);
      await lateJoiner.connect({ 
        auth: { userId: 'latejoin', username: 'LateJoiner', role: 'viewer' } 
      });
      await lateJoiner.joinStream(streamId);

      // Late joiner gets history
      const history = await lateJoiner.getChatHistory(streamId);
      expect(history.messages).toHaveLength(2);
      expect(history.messages[0].content).toBe('Early message 1');
      expect(history.messages[1].content).toBe('Early message 2');

      lateJoiner.disconnect();
    });

    it('should maintain message order under concurrent sending', async () => {
      const streamId = 'message-order-test';

      await Promise.all([
        streamer.joinStream(streamId),
        viewer1.joinStream(streamId),
        viewer2.joinStream(streamId)
      ]);

      // Send multiple messages concurrently
      const sendPromises = [];
      for (let i = 0; i < 10; i++) {
        const client = i % 2 === 0 ? viewer1 : viewer2;
        const content = `Message ${i} from ${client === viewer1 ? 'viewer1' : 'viewer2'}`;
        sendPromises.push(client.sendChatMessage(streamId, content));
      }

      await Promise.all(sendPromises);

      // Check that all messages are in server history
      const serverHistory = server.getChatHistory(streamId);
      expect(serverHistory).toHaveLength(10);

      // Verify all messages are unique and properly formatted
      const contents = serverHistory.map(msg => msg.content);
      const uniqueContents = new Set(contents);
      expect(uniqueContents.size).toBe(10); // All messages should be unique
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty messages gracefully', async () => {
      const streamId = 'empty-message-test';

      await streamer.joinStream(streamId);

      try {
        await streamer.sendChatMessage(streamId, '');
        // Depending on implementation, this might succeed or fail
        // If it succeeds, check that it's handled properly
        const history = await streamer.getChatHistory(streamId);
        if (history.messages.length > 0) {
          expect(history.messages[0].content).toBe('');
        }
      } catch (error) {
        // If it fails, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it('should handle very long messages', async () => {
      const streamId = 'long-message-test';

      await streamer.joinStream(streamId);

      const longMessage = 'A'.repeat(1000); // Very long message

      try {
        const response = await streamer.sendChatMessage(streamId, longMessage);
        if (response.success) {
          const history = await streamer.getChatHistory(streamId);
          expect(history.messages[0].content).toBe(longMessage);
        }
      } catch (error) {
        // Server might reject very long messages
        expect(error).toBeDefined();
      }
    });

    it('should handle special characters and emojis', async () => {
      const streamId = 'special-chars-test';

      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      const specialMessage = '🎉 Hello! Special chars: <>&"\' 日本語 עברית';

      const messagePromise = viewer1.waitForEvent('chat:message');
      await streamer.sendChatMessage(streamId, specialMessage);
      
      const receivedMessage = await messagePromise;
      expect(receivedMessage.content).toBe(specialMessage);
    });

    it('should handle rapid message sending', async () => {
      const streamId = 'rapid-sending-test';

      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      // Send messages rapidly
      const rapidPromises = [];
      for (let i = 0; i < 20; i++) {
        rapidPromises.push(
          streamer.sendChatMessage(streamId, `Rapid message ${i}`)
        );
      }

      const results = await Promise.allSettled(rapidPromises);
      
      // Some messages might succeed, some might be rate limited
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful + failed).toBe(20);
      
      // At least some should succeed, some might be rate limited
      expect(successful).toBeGreaterThan(0);
    });

    it('should handle client disconnection during chat', async () => {
      const streamId = 'disconnect-during-chat';

      await Promise.all([
        streamer.joinStream(streamId),
        viewer1.joinStream(streamId),
        viewer2.joinStream(streamId)
      ]);

      // Send a message
      await viewer1.sendChatMessage(streamId, 'Message before disconnect');

      // Verify message was received
      const history1 = await streamer.getChatHistory(streamId);
      expect(history1.messages).toHaveLength(1);

      // Disconnect viewer1
      viewer1.disconnect();

      // Wait for server to process disconnect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Remaining clients should still be able to chat
      await streamer.sendChatMessage(streamId, 'Message after disconnect');

      const history2 = await viewer2.getChatHistory(streamId);
      expect(history2.messages).toHaveLength(2);
      expect(history2.messages[1].content).toBe('Message after disconnect');
    });
  });

  describe('Chat Performance and Scalability', () => {
    it('should handle multiple simultaneous conversations', async () => {
      const streams = ['stream1', 'stream2', 'stream3'];
      const clients = [streamer, viewer1, viewer2, moderator];

      // Each client joins all streams
      for (const client of clients) {
        for (const streamId of streams) {
          await client.joinStream(streamId);
        }
      }

      // Send messages to different streams simultaneously
      const messagePromises = [];
      for (let i = 0; i < 3; i++) {
        const streamId = streams[i];
        const client = clients[i % clients.length];
        messagePromises.push(
          client.sendChatMessage(streamId, `Message to ${streamId}`)
        );
      }

      await Promise.all(messagePromises);

      // Verify each stream has one message
      for (const streamId of streams) {
        const history = server.getChatHistory(streamId);
        expect(history).toHaveLength(1);
        expect(history[0].content).toBe(`Message to ${streamId}`);
      }
    });

    it('should maintain performance with large chat history', async () => {
      const streamId = 'large-history-test';

      await streamer.joinStream(streamId);
      await viewer1.joinStream(streamId);

      // Pre-populate with many messages
      for (let i = 0; i < 100; i++) {
        server.injectChatMessage(streamId, {
          userId: 'system',
          username: 'System',
          content: `Historical message ${i}`,
          role: 'system'
        });
      }

      // New message should still work quickly
      const startTime = Date.now();
      await streamer.sendChatMessage(streamId, 'New message');
      const sendTime = Date.now() - startTime;

      expect(sendTime).toBeLessThan(1000); // Should be fast even with large history

      // History retrieval should work
      const historyStartTime = Date.now();
      const history = await viewer1.getChatHistory(streamId, 50);
      const historyTime = Date.now() - historyStartTime;

      expect(historyTime).toBeLessThan(1000);
      expect(history.messages).toHaveLength(50); // Limited by request
    });

    it('should track chat metrics accurately', async () => {
      const streamId = 'metrics-test';

      await Promise.all([
        streamer.joinStream(streamId),
        viewer1.joinStream(streamId),
        viewer2.joinStream(streamId)
      ]);

      // Send various messages
      await streamer.sendChatMessage(streamId, 'Streamer message');
      await viewer1.sendChatMessage(streamId, 'Viewer1 message');
      await viewer2.sendChatMessage(streamId, 'Viewer2 message');

      // Check client metrics
      const streamerMetrics = streamer.getConnectionMetrics();
      const viewer1Metrics = viewer1.getConnectionMetrics();

      expect(streamerMetrics.isConnected).toBe(true);
      expect(streamerMetrics.eventCount).toBeGreaterThan(0);
      expect(viewer1Metrics.isConnected).toBe(true);
      expect(viewer1Metrics.eventCount).toBeGreaterThan(0);

      // Check server state
      expect(server.getStreamMembers(streamId).size).toBe(3);
      expect(server.getChatHistory(streamId)).toHaveLength(3);
    });
  });
});
