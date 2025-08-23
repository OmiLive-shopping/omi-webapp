import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { WebSocketTestServer } from '../websocket-test-server';
import { WebSocketTestClient } from '../websocket-test-client';

describe('End-to-End User Scenarios', () => {
  let server: WebSocketTestServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = new WebSocketTestServer();
    const port = await server.start();
    serverUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Complete Streaming Session', () => {
    it('should handle a complete streaming session from start to finish', async () => {
      // Characters in our story
      const streamer = new WebSocketTestClient(serverUrl);
      const viewers = Array.from({ length: 5 }, () => new WebSocketTestClient(serverUrl));
      const moderator = new WebSocketTestClient(serverUrl);

      try {
        // === SETUP PHASE ===
        
        // Streamer connects and authenticates
        await streamer.connect({ 
          auth: { 
            userId: 'e2e-streamer', 
            username: 'E2EStreamer', 
            role: 'streamer' 
          } 
        });

        // Moderator connects
        await moderator.connect({ 
          auth: { 
            userId: 'e2e-mod', 
            username: 'E2EModerator', 
            role: 'moderator' 
          } 
        });

        // Viewers connect over time (realistic scenario)
        for (let i = 0; i < viewers.length; i++) {
          await viewers[i].connect({ 
            auth: { 
              userId: `e2e-viewer-${i}`, 
              username: `Viewer${i}`, 
              role: 'viewer' 
            } 
          });
          
          // Small delay between connections to simulate real-world timing
          if (i < viewers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        const streamId = 'e2e-complete-session';

        // === STREAM PREPARATION ===
        
        // Streamer and moderator join the stream first
        await Promise.all([
          streamer.joinStream(streamId),
          moderator.joinStream(streamId)
        ]);

        // Verify initial setup
        expect(server.getStreamMembers(streamId).size).toBe(2);

        // === STREAM GOES LIVE ===
        
        // Set up listeners for stream start event
        const viewerStartPromises = viewers.slice(0, 3).map(viewer => 
          viewer.waitForEvent('stream:started')
        );

        // First 3 viewers join before stream starts
        await Promise.all(
          viewers.slice(0, 3).map(viewer => viewer.joinStream(streamId))
        );

        // Streamer starts the stream
        (streamer as any).socket.emit('stream:start', {
          streamId,
          title: 'E2E Test Stream',
          description: 'Complete end-to-end test scenario'
        });

        // Viewers should be notified
        const startNotifications = await Promise.all(viewerStartPromises);
        startNotifications.forEach(notification => {
          expect(notification.streamId).toBe(streamId);
          expect(notification.title).toBe('E2E Test Stream');
        });

        // === ACTIVE STREAMING PHASE ===
        
        // Late viewers join during the stream
        const lateJoinPromises = viewers.slice(3).map(viewer => 
          viewer.joinStream(streamId)
        );
        await Promise.all(lateJoinPromises);

        // Final viewer count should be 7 (streamer + moderator + 5 viewers)
        expect(server.getStreamMembers(streamId).size).toBe(7);

        // === CHAT INTERACTION ===
        
        // Streamer welcomes everyone
        await streamer.sendChatMessage(streamId, 'Welcome to the stream everyone! 🎉');

        // Viewers respond enthusiastically
        const chatPromises = [];
        const viewerMessages = [
          'First! Love your content!',
          'Hello from Canada! 🇨🇦',
          'Been waiting for this stream!',
          'Great to be here!',
          'Notification squad!'
        ];

        for (let i = 0; i < viewers.length; i++) {
          chatPromises.push(
            viewers[i].sendChatMessage(streamId, viewerMessages[i])
          );
        }

        await Promise.all(chatPromises);

        // Moderator responds
        await moderator.sendChatMessage(streamId, 'Welcome everyone! Please keep chat friendly 😊');

        // === VDO.NINJA SIMULATION ===
        
        // Simulate VDO.Ninja stats updates during stream
        streamer.sendVdoStats(streamId, {
          fps: 30,
          bitrate: 2500,
          resolution: '1920x1080',
          quality: 'excellent'
        });

        // Update analytics
        server.updateStreamAnalytics(streamId, {
          viewerCount: 5,
          avgWatchTime: 300,
          peakViewers: 6,
          chatMessages: 7
        });

        // === ANALYTICS SUBSCRIPTION ===
        
        // Streamer subscribes to analytics
        await streamer.subscribeToAnalytics(streamId);

        // === MID-STREAM EVENTS ===
        
        // One viewer leaves temporarily
        await viewers[0].leaveStream(streamId);
        expect(server.getStreamMembers(streamId).size).toBe(6);

        // Viewer rejoins
        await new Promise(resolve => setTimeout(resolve, 100));
        await viewers[0].joinStream(streamId);
        expect(server.getStreamMembers(streamId).size).toBe(7);

        // More chat activity
        await streamer.sendChatMessage(streamId, 'Thanks for the support! Any questions?');
        await viewers[2].sendChatMessage(streamId, 'When is your next stream?');
        await streamer.sendChatMessage(streamId, 'I stream every Tuesday and Friday!');

        // === QUALITY CHECK ===
        
        // Simulate quality event
        (streamer as any).socket.emit('vdo:quality:event', {
          streamId,
          quality: 'good',
          fps: 28,
          reason: 'minor network fluctuation'
        });

        // === STREAM ENDING PHASE ===
        
        // Streamer announces stream ending
        await streamer.sendChatMessage(streamId, 'Alright everyone, going to wrap up in a few minutes!');

        // Some viewers say goodbye
        await viewers[1].sendChatMessage(streamId, 'Thanks for the great stream!');
        await viewers[3].sendChatMessage(streamId, 'See you next time!');

        // Set up listeners for stream end
        const endPromises = viewers.slice(0, 3).map(viewer => 
          viewer.waitForEvent('stream:ended')
        );

        // Streamer ends the stream
        (streamer as any).socket.emit('stream:end', {
          streamId,
          message: 'Thanks for watching! See you next time! 👋'
        });

        // Viewers should be notified of stream end
        const endNotifications = await Promise.all(endPromises);
        endNotifications.forEach(notification => {
          expect(notification.streamId).toBe(streamId);
          expect(notification.message).toBe('Thanks for watching! See you next time! 👋');
        });

        // === POST-STREAM VERIFICATION ===
        
        // Check final chat history
        const finalHistory = await moderator.getChatHistory(streamId);
        expect(finalHistory.messages.length).toBeGreaterThanOrEqual(10);

        // Verify message content includes key moments
        const messageContents = finalHistory.messages.map(msg => msg.content);
        expect(messageContents).toContain('Welcome to the stream everyone! 🎉');
        expect(messageContents).toContain('Thanks for watching! See you next time! 👋');

        // Check analytics were updated
        // (In real implementation, this would verify database state)

        // === CLEANUP ===
        
        // Viewers gradually leave
        for (const viewer of viewers) {
          await viewer.leaveStream(streamId);
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        // Final participants leave
        await moderator.leaveStream(streamId);
        await streamer.leaveStream(streamId);

        // Stream should be empty
        expect(server.getStreamMembers(streamId).size).toBe(0);

      } finally {
        // Ensure cleanup
        streamer.disconnect();
        moderator.disconnect();
        viewers.forEach(viewer => viewer.disconnect());
      }
    });
  });

  describe('Multi-Stream Concurrent Usage', () => {
    it('should handle multiple streams running simultaneously', async () => {
      const streamers = Array.from({ length: 3 }, () => new WebSocketTestClient(serverUrl));
      const viewers = Array.from({ length: 9 }, () => new WebSocketTestClient(serverUrl)); // 3 per stream

      try {
        // Connect all streamers
        for (let i = 0; i < streamers.length; i++) {
          await streamers[i].connect({ 
            auth: { 
              userId: `multi-streamer-${i}`, 
              username: `Streamer${i}`, 
              role: 'streamer' 
            } 
          });
        }

        // Connect all viewers
        for (let i = 0; i < viewers.length; i++) {
          await viewers[i].connect({ 
            auth: { 
              userId: `multi-viewer-${i}`, 
              username: `Viewer${i}`, 
              role: 'viewer' 
            } 
          });
        }

        const streamIds = ['stream-tech', 'stream-gaming', 'stream-music'];

        // Each streamer starts their stream
        for (let i = 0; i < streamers.length; i++) {
          await streamers[i].joinStream(streamIds[i]);
        }

        // Viewers join different streams (3 viewers per stream)
        for (let i = 0; i < viewers.length; i++) {
          const streamIndex = Math.floor(i / 3);
          await viewers[i].joinStream(streamIds[streamIndex]);
        }

        // Verify stream populations
        for (const streamId of streamIds) {
          expect(server.getStreamMembers(streamId).size).toBe(4); // 1 streamer + 3 viewers
        }

        // Each stream has active chat
        const chatPromises = [];
        for (let i = 0; i < streamers.length; i++) {
          chatPromises.push(
            streamers[i].sendChatMessage(streamIds[i], `Welcome to ${streamIds[i]}!`)
          );
        }

        await Promise.all(chatPromises);

        // Viewers chat in their respective streams
        for (let i = 0; i < viewers.length; i++) {
          const streamIndex = Math.floor(i / 3);
          await viewers[i].sendChatMessage(
            streamIds[streamIndex], 
            `Hello from viewer ${i % 3 + 1} in ${streamIds[streamIndex]}!`
          );
        }

        // Verify each stream has appropriate chat history
        for (let i = 0; i < streamIds.length; i++) {
          const history = server.getChatHistory(streamIds[i]);
          expect(history.length).toBe(4); // 1 streamer message + 3 viewer messages
        }

        // Simulate some viewers switching streams
        await viewers[0].leaveStream(streamIds[0]);
        await viewers[0].joinStream(streamIds[1]);

        expect(server.getStreamMembers(streamIds[0]).size).toBe(3);
        expect(server.getStreamMembers(streamIds[1]).size).toBe(5);

      } finally {
        streamers.forEach(streamer => streamer.disconnect());
        viewers.forEach(viewer => viewer.disconnect());
      }
    });
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle network interruptions gracefully', async () => {
      const streamer = new WebSocketTestClient(serverUrl);
      const viewers = Array.from({ length: 3 }, () => new WebSocketTestClient(serverUrl));

      try {
        // Initial setup
        await streamer.connect({ 
          auth: { userId: 'network-streamer', username: 'NetworkStreamer', role: 'streamer' } 
        });

        for (let i = 0; i < viewers.length; i++) {
          await viewers[i].connect({ 
            auth: { userId: `network-viewer-${i}`, username: `NetworkViewer${i}`, role: 'viewer' } 
          });
        }

        const streamId = 'network-test-stream';

        // All join stream
        await Promise.all([
          streamer.joinStream(streamId),
          ...viewers.map(viewer => viewer.joinStream(streamId))
        ]);

        // Stream is active with chat
        await streamer.sendChatMessage(streamId, 'Stream is live!');
        await viewers[0].sendChatMessage(streamId, 'Great stream!');

        // Simulate network interruption for one viewer
        viewers[1].simulateConnectionIssues('disconnect');

        // Wait for disconnect processing
        await new Promise(resolve => setTimeout(resolve, 200));

        // Stream should continue with remaining participants
        expect(server.getStreamMembers(streamId).size).toBe(3);

        // Remaining participants can still chat
        await streamer.sendChatMessage(streamId, 'We lost someone, but continuing!');
        await viewers[0].sendChatMessage(streamId, 'Still here!');
        await viewers[2].sendChatMessage(streamId, 'Connection is stable!');

        // Verify chat continues working
        const history = server.getChatHistory(streamId);
        expect(history.length).toBeGreaterThanOrEqual(4);

      } finally {
        streamer.disconnect();
        viewers.forEach(viewer => viewer.disconnect());
      }
    });

    it('should handle rapid connection/disconnection patterns', async () => {
      const clients = Array.from({ length: 5 }, () => new WebSocketTestClient(serverUrl));

      try {
        const streamId = 'rapid-connection-test';

        // Rapid connect/disconnect cycle
        for (let cycle = 0; cycle < 3; cycle++) {
          // Connect all clients
          for (let i = 0; i < clients.length; i++) {
            await clients[i].connect({ 
              auth: { 
                userId: `rapid-user-${i}-${cycle}`, 
                username: `RapidUser${i}C${cycle}`, 
                role: 'viewer' 
              } 
            });
          }

          // All join stream
          await Promise.all(clients.map(client => client.joinStream(streamId)));

          // Send some messages
          await clients[0].sendChatMessage(streamId, `Cycle ${cycle} message`);

          // Verify all connected
          expect(server.getStreamMembers(streamId).size).toBe(5);

          // Disconnect all
          clients.forEach(client => client.disconnect());

          // Wait for cleanup
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify all disconnected
          expect(server.getStreamMembers(streamId).size).toBe(0);
        }

        // Final verification - chat history should contain messages from all cycles
        const finalHistory = server.getChatHistory(streamId);
        expect(finalHistory.length).toBe(3); // One message per cycle

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('User Journey Completeness', () => {
    it('should support a complete viewer journey', async () => {
      const viewer = new WebSocketTestClient(serverUrl);
      const streamer = new WebSocketTestClient(serverUrl);

      try {
        // === DISCOVERY PHASE ===
        // Viewer connects (simulating arriving from homepage)
        await viewer.connect({ 
          auth: { userId: 'journey-viewer', username: 'JourneyViewer', role: 'viewer' } 
        });

        // Streamer is already live
        await streamer.connect({ 
          auth: { userId: 'journey-streamer', username: 'JourneyStreamer', role: 'streamer' } 
        });

        const streamId = 'viewer-journey-stream';
        await streamer.joinStream(streamId);

        // === JOINING PHASE ===
        // Viewer discovers stream and joins
        const joinResponse = await viewer.joinStream(streamId);
        expect(joinResponse.success).toBe(true);
        expect(joinResponse.viewerCount).toBe(2);

        // === LURKING PHASE ===
        // Viewer lurks for a while, just watching
        // Get chat history to catch up
        const initialHistory = await viewer.getChatHistory(streamId);
        expect(initialHistory.streamId).toBe(streamId);

        // Streamer continues streaming
        await streamer.sendChatMessage(streamId, 'Welcome to the stream!');

        // Viewer receives the message
        const welcomeMessage = await viewer.waitForEvent('chat:message');
        expect(welcomeMessage.content).toBe('Welcome to the stream!');

        // === ENGAGEMENT PHASE ===
        // Viewer starts engaging - first message
        await viewer.sendChatMessage(streamId, 'Hi! First time watching, love the content!');

        // Streamer responds
        await streamer.sendChatMessage(streamId, 'Thanks for watching! Welcome to the community!');

        // Viewer gets more engaged
        await viewer.sendChatMessage(streamId, 'How long have you been streaming?');
        await streamer.sendChatMessage(streamId, 'About 2 years now! Time flies when you love what you do');

        // === INTERACTION PHASE ===
        // Viewer uses typing indicators
        viewer.sendTyping(streamId, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        viewer.sendTyping(streamId, false);

        // Viewer replies to previous message
        const history = await viewer.getChatHistory(streamId);
        const streamerMessageId = history.messages.find(
          msg => msg.content.includes('2 years')
        )?.id;

        if (streamerMessageId) {
          await viewer.sendChatMessage(
            streamId, 
            'That\'s awesome! Keep it up! 🎉', 
            streamerMessageId
          );
        }

        // === CONNECTION HEALTH CHECK ===
        // Viewer checks connection quality
        const latency = await viewer.ping();
        expect(latency).toBeGreaterThan(0);
        expect(latency).toBeLessThan(200);

        // === ANALYTICS INTERACTION ===
        // If viewer had analytics access, they could subscribe
        // (In real app, this might be limited to certain roles)

        // === DEPARTURE PHASE ===
        // Viewer says goodbye
        await viewer.sendChatMessage(streamId, 'Thanks for the great stream! Following for sure!');

        // Streamer acknowledges
        await streamer.sendChatMessage(streamId, 'Thanks for watching! See you next time!');

        // Viewer leaves
        const leaveResponse = await viewer.leaveStream(streamId);
        expect(leaveResponse.success).toBe(true);
        expect(leaveResponse.viewerCount).toBe(1);

        // === POST-DEPARTURE VERIFICATION ===
        // Verify viewer is no longer in stream
        expect(server.getStreamMembers(streamId).size).toBe(1); // Only streamer

        // Verify complete chat history was preserved
        const finalHistory = server.getChatHistory(streamId);
        expect(finalHistory.length).toBeGreaterThanOrEqual(6);

        const messages = finalHistory.map(msg => msg.content);
        expect(messages).toContain('Hi! First time watching, love the content!');
        expect(messages).toContain('Thanks for the great stream! Following for sure!');

      } finally {
        viewer.disconnect();
        streamer.disconnect();
      }
    });

    it('should support a complete streamer workflow', async () => {
      const streamer = new WebSocketTestClient(serverUrl);
      const viewers = Array.from({ length: 3 }, () => new WebSocketTestClient(serverUrl));

      try {
        // === PRE-STREAM SETUP ===
        await streamer.connect({ 
          auth: { userId: 'workflow-streamer', username: 'WorkflowStreamer', role: 'streamer' } 
        });

        const streamId = 'streamer-workflow-test';

        // Streamer joins their stream room
        await streamer.joinStream(streamId);

        // Subscribe to analytics for monitoring
        await streamer.subscribeToAnalytics(streamId);

        // === STREAM START ===
        // Streamer announces going live
        (streamer as any).socket.emit('stream:start', {
          streamId,
          title: 'Streamer Workflow Test',
          description: 'Testing complete streamer workflow'
        });

        // Connect viewers gradually
        for (let i = 0; i < viewers.length; i++) {
          await viewers[i].connect({ 
            auth: { 
              userId: `workflow-viewer-${i}`, 
              username: `WorkflowViewer${i}`, 
              role: 'viewer' 
            } 
          });
          await viewers[i].joinStream(streamId);
          
          // Delay between joins to simulate real arrival pattern
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // === ACTIVE STREAMING ===
        // Streamer greets audience
        await streamer.sendChatMessage(streamId, 'Hello everyone! Thanks for joining! 🎉');

        // Monitor chat
        viewers[0].sendChatMessage(streamId, 'First!');
        viewers[1].sendChatMessage(streamId, 'Love your streams!');
        viewers[2].sendChatMessage(streamId, 'What are we doing today?');

        // Streamer responds to chat
        await streamer.sendChatMessage(streamId, 'Today we\'re testing our streaming platform!');

        // === TECHNICAL MONITORING ===
        // Streamer monitors stream health
        streamer.sendVdoStats(streamId, {
          fps: 30,
          bitrate: 3000,
          resolution: '1920x1080',
          quality: 'excellent'
        });

        // Check connection health
        const streamLatency = await streamer.ping();
        expect(streamLatency).toBeLessThan(100);

        // === ANALYTICS MONITORING ===
        // Update analytics data
        server.updateStreamAnalytics(streamId, {
          viewerCount: 3,
          avgWatchTime: 180,
          peakViewers: 3,
          chatMessages: 4,
          engagement: 0.85
        });

        // === INTERACTION MANAGEMENT ===
        // Streamer manages chat interaction
        await streamer.sendChatMessage(streamId, 'Any questions about the platform?');
        await viewers[1].sendChatMessage(streamId, 'How do you handle so many viewers?');
        await streamer.sendChatMessage(streamId, 'Great question! It\'s all about good infrastructure!');

        // === CONTENT DELIVERY ===
        // Streamer delivers content
        await streamer.sendChatMessage(streamId, 'Let me show you some features...');

        // Simulate feature demonstration through various stats updates
        streamer.sendVdoStats(streamId, {
          fps: 29,
          bitrate: 2800,
          resolution: '1920x1080',
          quality: 'good'
        });

        // === WRAP UP ===
        // Streamer begins wrap up
        await streamer.sendChatMessage(streamId, 'Alright, we\'re going to wrap up soon!');
        await viewers[0].sendChatMessage(streamId, 'Thanks for the demo!');
        await viewers[2].sendChatMessage(streamId, 'When\'s the next stream?');
        await streamer.sendChatMessage(streamId, 'Next stream is Thursday! Thanks everyone!');

        // === STREAM END ===
        // End the stream
        (streamer as any).socket.emit('stream:end', {
          streamId,
          message: 'Thanks for watching! Stream ended successfully!'
        });

        // === POST-STREAM CLEANUP ===
        // Verify final state
        const finalHistory = server.getChatHistory(streamId);
        expect(finalHistory.length).toBeGreaterThanOrEqual(8);

        // Check analytics data was collected
        // (In real implementation, verify database persistence)

        // Graceful disconnect
        for (const viewer of viewers) {
          await viewer.leaveStream(streamId);
          viewer.disconnect();
        }

        await streamer.leaveStream(streamId);

        // Verify stream is empty
        expect(server.getStreamMembers(streamId).size).toBe(0);

      } finally {
        streamer.disconnect();
        viewers.forEach(viewer => viewer.disconnect());
      }
    });
  });
});
