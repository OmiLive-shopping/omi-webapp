import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { WebSocketTestServer } from '../websocket-test-server';
import { WebSocketTestClient } from '../websocket-test-client';

describe('Multi-User Concurrent Operations', () => {
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

  describe('High Concurrency Connection Tests', () => {
    it('should handle 50 simultaneous connections', async () => {
      const clients: WebSocketTestClient[] = [];
      const connectionPromises: Promise<void>[] = [];

      try {
        // Create 50 clients
        for (let i = 0; i < 50; i++) {
          const client = new WebSocketTestClient(serverUrl);
          clients.push(client);
          
          connectionPromises.push(
            client.connect({ 
              auth: { 
                userId: `concurrent-user-${i}`, 
                username: `ConcurrentUser${i}`, 
                role: 'viewer' 
              } 
            })
          );
        }

        // All should connect successfully
        await Promise.all(connectionPromises);

        // Verify all clients are connected
        expect(server.getConnectionCount()).toBe(50);

        // Verify each client reports as connected
        for (const client of clients) {
          expect(client.getConnectionStatus()).toBe(true);
          expect(client.getSocketId()).toBeTruthy();
        }

        // Test ping latency for a sample of clients
        const pingPromises = clients.slice(0, 10).map(client => client.ping());
        const latencies = await Promise.all(pingPromises);
        
        latencies.forEach(latency => {
          expect(latency).toBeGreaterThan(0);
          expect(latency).toBeLessThan(1000); // Should be reasonable even under load
        });

      } finally {
        // Cleanup all clients
        clients.forEach(client => client.disconnect());
      }
    });

    it('should handle 100 rapid sequential connections', async () => {
      const clients: WebSocketTestClient[] = [];
      const connectionTimes: number[] = [];

      try {
        for (let i = 0; i < 100; i++) {
          const client = new WebSocketTestClient(serverUrl);
          clients.push(client);

          const startTime = Date.now();
          await client.connect({ 
            auth: { 
              userId: `rapid-user-${i}`, 
              username: `RapidUser${i}`, 
              role: 'viewer' 
            } 
          });
          const connectionTime = Date.now() - startTime;
          connectionTimes.push(connectionTime);

          // Verify connection
          expect(client.getConnectionStatus()).toBe(true);

          // Small delay to prevent overwhelming
          if (i % 10 === 9) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        // Verify all connections
        expect(server.getConnectionCount()).toBe(100);

        // Check that connection times remain reasonable
        const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
        expect(avgConnectionTime).toBeLessThan(500); // Average should be under 500ms

        // Check that later connections aren't significantly slower
        const firstTen = connectionTimes.slice(0, 10);
        const lastTen = connectionTimes.slice(-10);
        const firstAvg = firstTen.reduce((a, b) => a + b, 0) / firstTen.length;
        const lastAvg = lastTen.reduce((a, b) => a + b, 0) / lastTen.length;
        
        // Last connections shouldn't be more than 3x slower than first
        expect(lastAvg).toBeLessThan(firstAvg * 3);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Concurrent Stream Operations', () => {
    it('should handle multiple users joining the same stream simultaneously', async () => {
      const userCount = 30;
      const clients: WebSocketTestClient[] = [];
      
      try {
        // Connect all clients
        for (let i = 0; i < userCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `stream-user-${i}`, 
              username: `StreamUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        const streamId = 'concurrent-join-test';

        // All join the same stream simultaneously
        const joinPromises = clients.map(client => client.joinStream(streamId));
        const joinResults = await Promise.all(joinPromises);

        // All joins should succeed
        joinResults.forEach((result, index) => {
          expect(result.success).toBe(true);
          expect(result.streamId).toBe(streamId);
          // Viewer count should be at least index + 1 (might be higher due to concurrency)
          expect(result.viewerCount).toBeGreaterThanOrEqual(index + 1);
        });

        // Final viewer count should be exactly userCount
        expect(server.getStreamMembers(streamId).size).toBe(userCount);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should handle users joining multiple streams concurrently', async () => {
      const userCount = 20;
      const streamCount = 5;
      const clients: WebSocketTestClient[] = [];
      const streamIds = Array.from({ length: streamCount }, (_, i) => `concurrent-stream-${i}`);

      try {
        // Connect all clients
        for (let i = 0; i < userCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `multi-stream-user-${i}`, 
              username: `MultiStreamUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // Each user joins multiple streams
        const joinPromises: Promise<any>[] = [];
        
        for (let userIndex = 0; userIndex < userCount; userIndex++) {
          for (let streamIndex = 0; streamIndex < streamCount; streamIndex++) {
            // Each user joins 2-3 streams randomly
            if (Math.random() < 0.6) {
              joinPromises.push(
                clients[userIndex].joinStream(streamIds[streamIndex])
              );
            }
          }
        }

        // Execute all joins
        await Promise.all(joinPromises);

        // Verify each stream has some members
        let totalMemberships = 0;
        for (const streamId of streamIds) {
          const memberCount = server.getStreamMembers(streamId).size;
          expect(memberCount).toBeGreaterThan(0);
          totalMemberships += memberCount;
        }

        expect(totalMemberships).toBeGreaterThan(userCount); // Most users should be in multiple streams

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should handle concurrent join/leave operations', async () => {
      const userCount = 25;
      const clients: WebSocketTestClient[] = [];
      const streamId = 'join-leave-chaos-test';

      try {
        // Connect all clients
        for (let i = 0; i < userCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `chaos-user-${i}`, 
              username: `ChaosUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // Chaos test: random join/leave operations
        const operations: Promise<any>[] = [];
        
        for (let round = 0; round < 5; round++) {
          for (let i = 0; i < userCount; i++) {
            const shouldJoin = Math.random() < 0.7; // 70% chance to join
            
            if (shouldJoin) {
              operations.push(clients[i].joinStream(streamId));
            } else {
              operations.push(clients[i].leaveStream(streamId));
            }
          }

          // Execute this round of operations
          await Promise.allSettled(operations);
          operations.length = 0; // Clear for next round

          // Brief pause between rounds
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Final state should be consistent
        const finalMemberCount = server.getStreamMembers(streamId).size;
        expect(finalMemberCount).toBeGreaterThanOrEqual(0);
        expect(finalMemberCount).toBeLessThanOrEqual(userCount);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Concurrent Chat Operations', () => {
    it('should handle massive concurrent chat activity', async () => {
      const userCount = 20;
      const messagesPerUser = 5;
      const clients: WebSocketTestClient[] = [];
      const streamId = 'massive-chat-test';

      try {
        // Connect all clients
        for (let i = 0; i < userCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `chat-user-${i}`, 
              username: `ChatUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // All join the same stream
        await Promise.all(clients.map(client => client.joinStream(streamId)));

        // Massive concurrent chat
        const chatPromises: Promise<any>[] = [];
        
        for (let userIndex = 0; userIndex < userCount; userIndex++) {
          for (let msgIndex = 0; msgIndex < messagesPerUser; msgIndex++) {
            const message = `Message ${msgIndex} from user ${userIndex}`;
            chatPromises.push(
              clients[userIndex].sendChatMessage(streamId, message)
            );
          }
        }

        // Send all messages concurrently
        const results = await Promise.allSettled(chatPromises);

        // Count successful messages
        const successfulMessages = results.filter(r => r.status === 'fulfilled').length;
        const totalAttempted = userCount * messagesPerUser;

        // At least 80% should succeed (some might be rate limited)
        expect(successfulMessages).toBeGreaterThan(totalAttempted * 0.8);

        // Wait for all messages to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify chat history
        const chatHistory = server.getChatHistory(streamId);
        expect(chatHistory.length).toBeGreaterThan(0);
        expect(chatHistory.length).toBeLessThanOrEqual(totalAttempted);

        // Verify message uniqueness and proper formatting
        const messageContents = new Set(chatHistory.map(msg => msg.content));
        expect(messageContents.size).toBe(chatHistory.length); // All messages should be unique

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should handle concurrent typing indicators', async () => {
      const userCount = 15;
      const clients: WebSocketTestClient[] = [];
      const streamId = 'typing-indicator-test';

      try {
        // Connect all clients
        for (let i = 0; i < userCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `typing-user-${i}`, 
              username: `TypingUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // All join the same stream
        await Promise.all(clients.map(client => client.joinStream(streamId)));

        // Monitor typing events on first client
        const typingEvents: any[] = [];
        clients[0].listenToEvent('chat:user:typing', (data) => {
          typingEvents.push(data);
        });

        // All other clients start typing simultaneously
        for (let i = 1; i < userCount; i++) {
          clients[i].sendTyping(streamId, true);
        }

        // Wait for typing events to propagate
        await new Promise(resolve => setTimeout(resolve, 200));

        // Should have received typing events from other users
        expect(typingEvents.length).toBeGreaterThan(0);
        expect(typingEvents.length).toBeLessThanOrEqual(userCount - 1);

        // All stop typing
        for (let i = 1; i < userCount; i++) {
          clients[i].sendTyping(streamId, false);
        }

        // Wait for stop typing events
        await new Promise(resolve => setTimeout(resolve, 200));

        // Should have received stop typing events
        const stopTypingEvents = typingEvents.filter(event => event.isTyping === false);
        expect(stopTypingEvents.length).toBeGreaterThan(0);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should handle concurrent chat history requests', async () => {
      const userCount = 20;
      const clients: WebSocketTestClient[] = [];
      const streamId = 'history-request-test';

      try {
        // Connect all clients
        for (let i = 0; i < userCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `history-user-${i}`, 
              username: `HistoryUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // First client joins and sends some messages
        await clients[0].joinStream(streamId);
        
        for (let i = 0; i < 10; i++) {
          await clients[0].sendChatMessage(streamId, `Setup message ${i}`);
        }

        // Now all clients join
        await Promise.all(clients.slice(1).map(client => client.joinStream(streamId)));

        // All clients request chat history simultaneously
        const historyPromises = clients.map(client => 
          client.getChatHistory(streamId, 50)
        );

        const historyResponses = await Promise.all(historyPromises);

        // All should receive the same history
        const expectedMessageCount = 10;
        historyResponses.forEach(history => {
          expect(history.streamId).toBe(streamId);
          expect(history.messages).toHaveLength(expectedMessageCount);
          expect(history.messages[0].content).toBe('Setup message 0');
          expect(history.messages[9].content).toBe('Setup message 9');
        });

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Mixed Concurrent Operations', () => {
    it('should handle realistic mixed workload', async () => {
      const streamers = 3;
      const viewersPerStream = 10;
      const totalUsers = streamers + (streamers * viewersPerStream);
      const clients: WebSocketTestClient[] = [];

      try {
        // Connect streamers
        for (let i = 0; i < streamers; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `mixed-streamer-${i}`, 
              username: `MixedStreamer${i}`, 
              role: 'streamer' 
            } 
          });
          clients.push(client);
        }

        // Connect viewers
        for (let streamerIndex = 0; streamerIndex < streamers; streamerIndex++) {
          for (let viewerIndex = 0; viewerIndex < viewersPerStream; viewerIndex++) {
            const globalIndex = streamers + (streamerIndex * viewersPerStream) + viewerIndex;
            const client = new WebSocketTestClient(serverUrl);
            await client.connect({ 
              auth: { 
                userId: `mixed-viewer-${globalIndex}`, 
                username: `MixedViewer${globalIndex}`, 
                role: 'viewer' 
              } 
            });
            clients.push(client);
          }
        }

        expect(clients.length).toBe(totalUsers);

        // Create streams
        const streamIds = Array.from({ length: streamers }, (_, i) => `mixed-stream-${i}`);

        // Streamers join their streams
        for (let i = 0; i < streamers; i++) {
          await clients[i].joinStream(streamIds[i]);
        }

        // Viewers join streams (each joins their assigned stream plus maybe others)
        const viewerJoinPromises: Promise<any>[] = [];
        
        for (let streamerIndex = 0; streamerIndex < streamers; streamerIndex++) {
          const streamId = streamIds[streamerIndex];
          
          for (let viewerIndex = 0; viewerIndex < viewersPerStream; viewerIndex++) {
            const clientIndex = streamers + (streamerIndex * viewersPerStream) + viewerIndex;
            
            // Join primary stream
            viewerJoinPromises.push(clients[clientIndex].joinStream(streamId));
            
            // 30% chance to join another stream too
            if (Math.random() < 0.3) {
              const otherStreamIndex = (streamerIndex + 1) % streamers;
              viewerJoinPromises.push(
                clients[clientIndex].joinStream(streamIds[otherStreamIndex])
              );
            }
          }
        }

        await Promise.all(viewerJoinPromises);

        // Mixed operations: chat, analytics updates, connection health
        const mixedOperations: Promise<any>[] = [];

        // Streamers send welcome messages
        for (let i = 0; i < streamers; i++) {
          mixedOperations.push(
            clients[i].sendChatMessage(streamIds[i], `Welcome to ${streamIds[i]}! 🎉`)
          );
        }

        // Some viewers respond
        for (let i = streamers; i < totalUsers; i++) {
          if (Math.random() < 0.4) { // 40% of viewers respond
            const streamerIndex = Math.floor((i - streamers) / viewersPerStream);
            mixedOperations.push(
              clients[i].sendChatMessage(streamIds[streamerIndex], `Hello from viewer ${i}!`)
            );
          }
        }

        // Streamers update stats
        for (let i = 0; i < streamers; i++) {
          clients[i].sendVdoStats(streamIds[i], {
            fps: 30,
            bitrate: 2500,
            resolution: '1920x1080',
            quality: 'excellent'
          });
        }

        // Some users ping
        for (let i = 0; i < 10; i++) {
          mixedOperations.push(clients[i].ping());
        }

        // Execute all mixed operations
        const results = await Promise.allSettled(mixedOperations);
        
        // Most operations should succeed
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        expect(successCount).toBeGreaterThan(mixedOperations.length * 0.8);

        // Verify final state
        for (let i = 0; i < streamers; i++) {
          const memberCount = server.getStreamMembers(streamIds[i]).size;
          expect(memberCount).toBeGreaterThanOrEqual(viewersPerStream + 1); // At least assigned viewers + streamer
          
          const chatHistory = server.getChatHistory(streamIds[i]);
          expect(chatHistory.length).toBeGreaterThan(0); // Should have some chat
        }

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should maintain data consistency under concurrent stress', async () => {
      const clientCount = 50;
      const operationCount = 200;
      const clients: WebSocketTestClient[] = [];
      const streamId = 'consistency-stress-test';

      try {
        // Connect all clients
        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `stress-user-${i}`, 
              username: `StressUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // Random stress operations
        const operations: Promise<any>[] = [];
        
        for (let i = 0; i < operationCount; i++) {
          const clientIndex = Math.floor(Math.random() * clientCount);
          const client = clients[clientIndex];
          const operation = Math.random();

          if (operation < 0.4) {
            // Join stream
            operations.push(client.joinStream(streamId));
          } else if (operation < 0.6) {
            // Leave stream
            operations.push(client.leaveStream(streamId));
          } else if (operation < 0.9) {
            // Send message
            operations.push(
              client.sendChatMessage(streamId, `Stress message ${i} from ${clientIndex}`)
            );
          } else {
            // Ping
            operations.push(client.ping());
          }
        }

        // Execute all operations with some concurrency
        const batchSize = 20;
        for (let i = 0; i < operations.length; i += batchSize) {
          const batch = operations.slice(i, i + batchSize);
          await Promise.allSettled(batch);
          
          // Small delay between batches to prevent complete chaos
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Final consistency check
        const finalMemberCount = server.getStreamMembers(streamId).size;
        expect(finalMemberCount).toBeGreaterThanOrEqual(0);
        expect(finalMemberCount).toBeLessThanOrEqual(clientCount);

        // Chat history should be consistent
        const chatHistory = server.getChatHistory(streamId);
        expect(chatHistory.length).toBeGreaterThanOrEqual(0);

        // All messages should have unique IDs
        const messageIds = new Set(chatHistory.map(msg => msg.id));
        expect(messageIds.size).toBe(chatHistory.length);

        // All clients should still be connected
        const connectedClients = clients.filter(client => client.getConnectionStatus());
        expect(connectedClients.length).toBe(clientCount);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain reasonable response times under high load', async () => {
      const clientCount = 30;
      const clients: WebSocketTestClient[] = [];
      const streamId = 'performance-under-load';

      try {
        // Connect all clients
        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `perf-user-${i}`, 
              username: `PerfUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // All join the stream
        await Promise.all(clients.map(client => client.joinStream(streamId)));

        // Measure operation times under load
        const measurements = {
          chatSends: [] as number[],
          historyRequests: [] as number[],
          pings: [] as number[]
        };

        // Test chat send performance
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          await clients[i % clientCount].sendChatMessage(streamId, `Perf test message ${i}`);
          measurements.chatSends.push(Date.now() - startTime);
        }

        // Test history request performance
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          await clients[i % clientCount].getChatHistory(streamId);
          measurements.historyRequests.push(Date.now() - startTime);
        }

        // Test ping performance
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          await clients[i % clientCount].ping();
          measurements.pings.push(Date.now() - startTime);
        }

        // Verify performance is reasonable
        const avgChatSend = measurements.chatSends.reduce((a, b) => a + b, 0) / measurements.chatSends.length;
        const avgHistoryRequest = measurements.historyRequests.reduce((a, b) => a + b, 0) / measurements.historyRequests.length;
        const avgPing = measurements.pings.reduce((a, b) => a + b, 0) / measurements.pings.length;

        expect(avgChatSend).toBeLessThan(1000); // Average chat send under 1 second
        expect(avgHistoryRequest).toBeLessThan(1000); // Average history request under 1 second
        expect(avgPing).toBeLessThan(100); // Average ping under 100ms

        // No operation should take more than 5 seconds
        const allMeasurements = [...measurements.chatSends, ...measurements.historyRequests, ...measurements.pings];
        const maxTime = Math.max(...allMeasurements);
        expect(maxTime).toBeLessThan(5000);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });
});
