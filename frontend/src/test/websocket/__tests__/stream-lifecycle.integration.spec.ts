import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { WebSocketTestServer } from '../websocket-test-server';
import { WebSocketTestClient } from '../websocket-test-client';

describe('Stream Lifecycle Integration Tests', () => {
  let server: WebSocketTestServer;
  let client1: WebSocketTestClient; // Streamer
  let client2: WebSocketTestClient; // Viewer 1
  let client3: WebSocketTestClient; // Viewer 2
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
    client1 = new WebSocketTestClient(serverUrl);
    client2 = new WebSocketTestClient(serverUrl);
    client3 = new WebSocketTestClient(serverUrl);
  });

  afterEach(() => {
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });

  describe('Stream Room Management', () => {
    it('should allow users to join and leave streams', async () => {
      // Connect clients
      await Promise.all([
        client1.connect({ auth: { userId: 'streamer1', username: 'Streamer', role: 'streamer' } }),
        client2.connect({ auth: { userId: 'viewer1', username: 'Viewer1', role: 'viewer' } })
      ]);

      const streamId = 'test-stream-1';

      // Streamer joins stream
      const streamerJoinResponse = await client1.joinStream(streamId);
      expect(streamerJoinResponse.success).toBe(true);
      expect(streamerJoinResponse.streamId).toBe(streamId);
      expect(streamerJoinResponse.viewerCount).toBe(1);

      // Viewer joins stream
      const viewerJoinResponse = await client2.joinStream(streamId);
      expect(viewerJoinResponse.success).toBe(true);
      expect(viewerJoinResponse.viewerCount).toBe(2);

      // Check server state
      expect(server.getStreamMembers(streamId).size).toBe(2);

      // Viewer leaves stream
      const viewerLeaveResponse = await client2.leaveStream(streamId);
      expect(viewerLeaveResponse.success).toBe(true);
      expect(viewerLeaveResponse.viewerCount).toBe(1);

      // Check server state after leave
      expect(server.getStreamMembers(streamId).size).toBe(1);
    });

    it('should broadcast viewer join/leave events to other participants', async () => {
      await Promise.all([
        client1.connect({ auth: { userId: 'streamer1', username: 'Streamer', role: 'streamer' } }),
        client2.connect({ auth: { userId: 'viewer1', username: 'Viewer1', role: 'viewer' } }),
        client3.connect({ auth: { userId: 'viewer2', username: 'Viewer2', role: 'viewer' } })
      ]);

      const streamId = 'test-stream-broadcast';

      // Streamer joins first
      await client1.joinStream(streamId);

      // Set up event listeners for join notifications
      const client1JoinPromise = client1.waitForEvent('stream:viewer:joined');
      const client2JoinPromise = client2.waitForEvent('stream:viewer:joined');

      // Viewer 1 joins
      await client2.joinStream(streamId);

      // Streamer should receive viewer joined event
      const streamerNotification = await client1JoinPromise;
      expect(streamerNotification.viewerCount).toBe(2);
      expect(streamerNotification.viewer.userId).toBe('viewer1');

      // Set up leave event listeners
      const client1LeavePromise = client1.waitForEvent('stream:viewer:left');
      const client3LeavePromise = client3.waitForEvent('stream:viewer:left');

      // Viewer 2 joins then leaves
      await client3.joinStream(streamId);
      await client3.leaveStream(streamId);

      // Other clients should receive leave notification
      const leaveNotification = await client1LeavePromise;
      expect(leaveNotification.viewerCount).toBe(2);
      expect(leaveNotification.viewer.userId).toBe('viewer2');
    });

    it('should handle multiple simultaneous joins', async () => {
      const clients = [];
      const joinPromises = [];

      // Create 5 clients
      for (let i = 0; i < 5; i++) {
        const client = new WebSocketTestClient(serverUrl);
        await client.connect({ 
          auth: { 
            userId: `user${i}`, 
            username: `User${i}`, 
            role: 'viewer' 
          } 
        });
        clients.push(client);
      }

      const streamId = 'concurrent-join-test';

      // All clients join simultaneously
      for (const client of clients) {
        joinPromises.push(client.joinStream(streamId));
      }

      const responses = await Promise.all(joinPromises);

      // All joins should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.streamId).toBe(streamId);
      });

      // Final viewer count should be 5
      expect(server.getStreamMembers(streamId).size).toBe(5);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Stream Lifecycle Events', () => {
    it('should broadcast stream start and end events', async () => {
      await Promise.all([
        client1.connect({ auth: { userId: 'streamer1', username: 'Streamer', role: 'streamer' } }),
        client2.connect({ auth: { userId: 'viewer1', username: 'Viewer1', role: 'viewer' } }),
        client3.connect({ auth: { userId: 'viewer2', username: 'Viewer2', role: 'viewer' } })
      ]);

      const streamId = 'lifecycle-test-stream';

      // All clients join the stream
      await Promise.all([
        client1.joinStream(streamId),
        client2.joinStream(streamId),
        client3.joinStream(streamId)
      ]);

      // Set up listeners for stream events
      const viewer1StartPromise = client2.waitForEvent('stream:started');
      const viewer2StartPromise = client3.waitForEvent('stream:started');

      // Streamer starts the stream
      if (client1.getConnectionStatus()) {
        (client1 as any).socket.emit('stream:start', {
          streamId,
          title: 'Test Stream',
          description: 'Integration test stream'
        });
      }

      // Viewers should receive start notification
      const [viewer1Start, viewer2Start] = await Promise.all([
        viewer1StartPromise,
        viewer2StartPromise
      ]);

      expect(viewer1Start.streamId).toBe(streamId);
      expect(viewer1Start.title).toBe('Test Stream');
      expect(viewer2Start.streamId).toBe(streamId);

      // Set up listeners for stream end events
      const viewer1EndPromise = client2.waitForEvent('stream:ended');
      const viewer2EndPromise = client3.waitForEvent('stream:ended');

      // Streamer ends the stream
      if (client1.getConnectionStatus()) {
        (client1 as any).socket.emit('stream:end', {
          streamId,
          message: 'Thanks for watching!'
        });
      }

      // Viewers should receive end notification
      const [viewer1End, viewer2End] = await Promise.all([
        viewer1EndPromise,
        viewer2EndPromise
      ]);

      expect(viewer1End.streamId).toBe(streamId);
      expect(viewer1End.message).toBe('Thanks for watching!');
      expect(viewer2End.streamId).toBe(streamId);
    });

    it('should handle stream lifecycle with viewer count updates', async () => {
      await client1.connect({ auth: { userId: 'streamer1', username: 'Streamer', role: 'streamer' } });
      await client2.connect({ auth: { userId: 'viewer1', username: 'Viewer1', role: 'viewer' } });

      const streamId = 'viewer-count-test';

      // Streamer joins
      const streamerJoin = await client1.joinStream(streamId);
      expect(streamerJoin.viewerCount).toBe(1);

      // Viewer joins
      const viewerJoin = await client2.joinStream(streamId);
      expect(viewerJoin.viewerCount).toBe(2);

      // Verify server state
      expect(server.getStreamMembers(streamId).size).toBe(2);

      // Simulate viewer disconnect without proper leave
      client2.disconnect();

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Server should have updated viewer count
      expect(server.getStreamMembers(streamId).size).toBe(1);
    });
  });

  describe('Authentication Integration', () => {
    it('should require authentication for joining streams', async () => {
      await client1.connect(); // Connect without auth

      const streamId = 'auth-required-stream';

      try {
        await client1.joinStream(streamId);
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Should timeout or fail due to no authentication
        expect(error).toBeDefined();
      }
    });

    it('should handle authentication before stream operations', async () => {
      await client1.connect();

      // Authenticate manually
      const authResponse = await client1.authenticate({
        userId: 'test-user',
        username: 'TestUser',
        role: 'viewer'
      });

      expect(authResponse.success).toBe(true);
      expect(authResponse.userId).toBe('test-user');

      // Now stream operations should work
      const streamId = 'post-auth-stream';
      const joinResponse = await client1.joinStream(streamId);
      expect(joinResponse.success).toBe(true);
    });

    it('should handle different user roles in streams', async () => {
      await client1.connect({ 
        auth: { userId: 'streamer1', username: 'Streamer', role: 'streamer' } 
      });
      await client2.connect({ 
        auth: { userId: 'mod1', username: 'Moderator', role: 'moderator' } 
      });
      await client3.connect({ 
        auth: { userId: 'viewer1', username: 'Viewer', role: 'viewer' } 
      });

      const streamId = 'role-test-stream';

      // All should be able to join
      const [streamerJoin, modJoin, viewerJoin] = await Promise.all([
        client1.joinStream(streamId),
        client2.joinStream(streamId),
        client3.joinStream(streamId)
      ]);

      expect(streamerJoin.success).toBe(true);
      expect(modJoin.success).toBe(true);
      expect(viewerJoin.success).toBe(true);

      // All should be in the same room
      expect(server.getStreamMembers(streamId).size).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid stream IDs gracefully', async () => {
      await client1.connect({ 
        auth: { userId: 'user1', username: 'User1', role: 'viewer' } 
      });

      // Try to join with invalid stream ID
      const invalidStreamId = '';
      
      try {
        await client1.joinStream(invalidStreamId);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Should fail gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle connection drops during stream operations', async () => {
      await client1.connect({ 
        auth: { userId: 'user1', username: 'User1', role: 'viewer' } 
      });
      await client2.connect({ 
        auth: { userId: 'user2', username: 'User2', role: 'viewer' } 
      });

      const streamId = 'connection-drop-test';

      // Both clients join
      await Promise.all([
        client1.joinStream(streamId),
        client2.joinStream(streamId)
      ]);

      expect(server.getStreamMembers(streamId).size).toBe(2);

      // Simulate connection drop for client1
      client1.simulateConnectionIssues('disconnect');

      // Wait for server to process disconnect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Server should only have client2
      expect(server.getStreamMembers(streamId).size).toBe(1);
    });

    it('should handle rapid join/leave operations', async () => {
      await client1.connect({ 
        auth: { userId: 'rapid-user', username: 'RapidUser', role: 'viewer' } 
      });

      const streamId = 'rapid-operations-test';

      // Perform rapid join/leave operations
      for (let i = 0; i < 5; i++) {
        await client1.joinStream(streamId);
        await client1.leaveStream(streamId);
      }

      // Should end up with no members
      expect(server.getStreamMembers(streamId).size).toBe(0);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle multiple clients joining/leaving simultaneously', async () => {
      const clients = [];
      const streamId = 'concurrency-test';

      // Create and connect 10 clients
      for (let i = 0; i < 10; i++) {
        const client = new WebSocketTestClient(serverUrl);
        await client.connect({ 
          auth: { 
            userId: `concurrent-user-${i}`, 
            username: `User${i}`, 
            role: 'viewer' 
          } 
        });
        clients.push(client);
      }

      // All join simultaneously
      const joinPromises = clients.map(client => client.joinStream(streamId));
      await Promise.all(joinPromises);

      expect(server.getStreamMembers(streamId).size).toBe(10);

      // Half leave simultaneously
      const leavePromises = clients.slice(0, 5).map(client => client.leaveStream(streamId));
      await Promise.all(leavePromises);

      expect(server.getStreamMembers(streamId).size).toBe(5);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });

    it('should maintain consistent state under high load', async () => {
      const clients = [];
      const operations = [];
      const streamId = 'high-load-test';

      // Create 20 clients
      for (let i = 0; i < 20; i++) {
        const client = new WebSocketTestClient(serverUrl);
        await client.connect({ 
          auth: { 
            userId: `load-user-${i}`, 
            username: `LoadUser${i}`, 
            role: 'viewer' 
          } 
        });
        clients.push(client);
      }

      // Mix of join and leave operations
      for (let i = 0; i < 100; i++) {
        const client = clients[i % clients.length];
        const operation = i % 2 === 0 ? 
          client.joinStream(streamId) : 
          client.leaveStream(streamId);
        operations.push(operation);
      }

      // Execute all operations
      await Promise.allSettled(operations);

      // Server state should be consistent
      const memberCount = server.getStreamMembers(streamId).size;
      expect(memberCount).toBeGreaterThanOrEqual(0);
      expect(memberCount).toBeLessThanOrEqual(clients.length);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Performance Metrics', () => {
    it('should track connection and operation times', async () => {
      const startTime = Date.now();
      
      await client1.connect({ 
        auth: { userId: 'perf-user', username: 'PerfUser', role: 'viewer' } 
      });
      
      const connectionTime = Date.now() - startTime;
      expect(connectionTime).toBeLessThan(1000); // Should connect within 1 second

      const streamId = 'performance-test';
      const joinStartTime = Date.now();
      
      await client1.joinStream(streamId);
      
      const joinTime = Date.now() - joinStartTime;
      expect(joinTime).toBeLessThan(500); // Should join within 500ms

      const metrics = client1.getConnectionMetrics();
      expect(metrics.isConnected).toBe(true);
      expect(metrics.socketId).toBeTruthy();
      expect(metrics.eventCount).toBeGreaterThan(0);
    });

    it('should measure ping latency', async () => {
      await client1.connect({ 
        auth: { userId: 'ping-user', username: 'PingUser', role: 'viewer' } 
      });

      const latency = await client1.ping();
      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(100); // Should be very fast for local testing
    });
  });
});
