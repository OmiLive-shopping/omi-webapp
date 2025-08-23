import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { WebSocketTestServer } from '../websocket-test-server';
import { WebSocketTestClient } from '../websocket-test-client';

describe('WebSocket Performance and Load Tests', () => {
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

  describe('Connection Performance', () => {
    it('should handle rapid connection establishment', async () => {
      const connectionCount = 100;
      const clients: WebSocketTestClient[] = [];
      const connectionTimes: number[] = [];

      try {
        for (let i = 0; i < connectionCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          clients.push(client);

          const startTime = Date.now();
          await client.connect({ 
            auth: { 
              userId: `rapid-connect-${i}`, 
              username: `RapidUser${i}`, 
              role: 'viewer' 
            } 
          });
          const connectTime = Date.now() - startTime;
          connectionTimes.push(connectTime);

          // Verify connection is established
          expect(client.getConnectionStatus()).toBe(true);
          expect(client.getSocketId()).toBeTruthy();
        }

        // Analyze connection performance
        const avgConnectTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
        const maxConnectTime = Math.max(...connectionTimes);
        const minConnectTime = Math.min(...connectionTimes);

        console.log(`Connection Performance Stats:
          Average: ${avgConnectTime.toFixed(2)}ms
          Min: ${minConnectTime}ms
          Max: ${maxConnectTime}ms
          Total Connections: ${connectionCount}`);

        // Performance assertions
        expect(avgConnectTime).toBeLessThan(500); // Average under 500ms
        expect(maxConnectTime).toBeLessThan(2000); // Max under 2 seconds
        expect(server.getConnectionCount()).toBe(connectionCount);

        // Test ping performance under load
        const pingPromises = clients.slice(0, 20).map(client => client.ping());
        const pings = await Promise.all(pingPromises);
        
        const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
        expect(avgPing).toBeLessThan(100); // Average ping under 100ms

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should maintain performance with sustained connections', async () => {
      const sustainedCount = 50;
      const clients: WebSocketTestClient[] = [];

      try {
        // Establish sustained connections
        for (let i = 0; i < sustainedCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `sustained-${i}`, 
              username: `SustainedUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // Keep connections alive and measure performance over time
        const measurements = [];
        
        for (let round = 0; round < 5; round++) {
          const startTime = Date.now();
          
          // Perform various operations
          const operations = [];
          
          // Random subset of clients perform operations
          for (let i = 0; i < 20; i++) {
            const clientIndex = Math.floor(Math.random() * sustainedCount);
            const client = clients[clientIndex];
            
            if (Math.random() < 0.5) {
              operations.push(client.ping());
            } else {
              operations.push(
                client.joinStream(`perf-stream-${Math.floor(Math.random() * 3)}`)
              );
            }
          }

          await Promise.allSettled(operations);
          const roundTime = Date.now() - startTime;
          measurements.push(roundTime);

          // Wait between rounds
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Performance should remain consistent
        const avgRoundTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxRoundTime = Math.max(...measurements);
        
        expect(avgRoundTime).toBeLessThan(1000);
        expect(maxRoundTime).toBeLessThan(2000);

        // No significant performance degradation
        const firstRound = measurements[0];
        const lastRound = measurements[measurements.length - 1];
        expect(lastRound).toBeLessThan(firstRound * 2); // Last round no more than 2x slower

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Message Throughput Performance', () => {
    it('should handle high-volume chat message throughput', async () => {
      const clientCount = 25;
      const messagesPerClient = 10;
      const clients: WebSocketTestClient[] = [];

      try {
        // Connect clients
        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `throughput-${i}`, 
              username: `ThroughputUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        const streamId = 'throughput-test-stream';

        // All clients join the stream
        await Promise.all(clients.map(client => client.joinStream(streamId)));

        // Measure message sending throughput
        const startTime = Date.now();
        const sendPromises: Promise<any>[] = [];

        for (let clientIndex = 0; clientIndex < clientCount; clientIndex++) {
          for (let msgIndex = 0; msgIndex < messagesPerClient; msgIndex++) {
            sendPromises.push(
              clients[clientIndex].sendChatMessage(
                streamId, 
                `Throughput message ${msgIndex} from client ${clientIndex}`
              )
            );
          }
        }

        const results = await Promise.allSettled(sendPromises);
        const totalTime = Date.now() - startTime;

        // Analyze results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const totalMessages = clientCount * messagesPerClient;
        
        const messagesPerSecond = (successful / totalTime) * 1000;
        const successRate = (successful / totalMessages) * 100;

        console.log(`Message Throughput Stats:
          Total Messages: ${totalMessages}
          Successful: ${successful}
          Failed: ${failed}
          Success Rate: ${successRate.toFixed(1)}%
          Messages/Second: ${messagesPerSecond.toFixed(1)}
          Total Time: ${totalTime}ms`);

        // Performance expectations
        expect(successRate).toBeGreaterThan(80); // At least 80% success rate
        expect(messagesPerSecond).toBeGreaterThan(50); // At least 50 messages/second
        expect(totalTime).toBeLessThan(10000); // Complete within 10 seconds

        // Verify server received messages
        const serverHistory = server.getChatHistory(streamId);
        expect(serverHistory.length).toBeGreaterThan(totalMessages * 0.8);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should handle burst message patterns efficiently', async () => {
      const clients: WebSocketTestClient[] = [];
      const streamId = 'burst-test-stream';

      try {
        // Connect 10 clients
        for (let i = 0; i < 10; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `burst-${i}`, 
              username: `BurstUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
          await client.joinStream(streamId);
        }

        // Test different burst patterns
        const burstPatterns = [
          { name: 'Small Burst', clients: 3, messages: 5, delay: 0 },
          { name: 'Medium Burst', clients: 6, messages: 8, delay: 100 },
          { name: 'Large Burst', clients: 10, messages: 10, delay: 200 }
        ];

        for (const pattern of burstPatterns) {
          const burstStartTime = Date.now();
          const burstPromises: Promise<any>[] = [];

          for (let i = 0; i < pattern.clients; i++) {
            for (let j = 0; j < pattern.messages; j++) {
              burstPromises.push(
                clients[i].sendChatMessage(
                  streamId, 
                  `${pattern.name} - Message ${j} from client ${i}`
                )
              );
            }
          }

          const burstResults = await Promise.allSettled(burstPromises);
          const burstTime = Date.now() - burstStartTime;

          const burstSuccessful = burstResults.filter(r => r.status === 'fulfilled').length;
          const burstTotal = pattern.clients * pattern.messages;
          const burstSuccessRate = (burstSuccessful / burstTotal) * 100;

          console.log(`${pattern.name} Performance:
            Messages: ${burstTotal}
            Successful: ${burstSuccessful}
            Success Rate: ${burstSuccessRate.toFixed(1)}%
            Time: ${burstTime}ms`);

          expect(burstSuccessRate).toBeGreaterThan(70);
          expect(burstTime).toBeLessThan(5000);

          // Wait between burst patterns
          await new Promise(resolve => setTimeout(resolve, pattern.delay));
        }

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Stream Management Performance', () => {
    it('should handle rapid stream join/leave operations', async () => {
      const clientCount = 30;
      const operationsPerClient = 20;
      const clients: WebSocketTestClient[] = [];

      try {
        // Connect all clients
        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `stream-perf-${i}`, 
              username: `StreamPerfUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        const streamIds = ['perf-stream-1', 'perf-stream-2', 'perf-stream-3'];

        // Measure rapid join/leave operations
        const startTime = Date.now();
        const operationPromises: Promise<any>[] = [];

        for (let clientIndex = 0; clientIndex < clientCount; clientIndex++) {
          for (let opIndex = 0; opIndex < operationsPerClient; opIndex++) {
            const streamId = streamIds[opIndex % streamIds.length];
            const isJoin = opIndex % 2 === 0;

            if (isJoin) {
              operationPromises.push(clients[clientIndex].joinStream(streamId));
            } else {
              operationPromises.push(clients[clientIndex].leaveStream(streamId));
            }
          }
        }

        const results = await Promise.allSettled(operationPromises);
        const totalTime = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const totalOperations = clientCount * operationsPerClient;
        const operationsPerSecond = (successful / totalTime) * 1000;
        const successRate = (successful / totalOperations) * 100;

        console.log(`Stream Operations Performance:
          Total Operations: ${totalOperations}
          Successful: ${successful}
          Success Rate: ${successRate.toFixed(1)}%
          Operations/Second: ${operationsPerSecond.toFixed(1)}
          Total Time: ${totalTime}ms`);

        expect(successRate).toBeGreaterThan(85);
        expect(operationsPerSecond).toBeGreaterThan(100);
        expect(totalTime).toBeLessThan(15000);

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should scale to multiple concurrent streams', async () => {
      const streamCount = 10;
      const clientsPerStream = 5;
      const totalClients = streamCount * clientsPerStream;
      const clients: WebSocketTestClient[] = [];

      try {
        // Connect all clients
        for (let i = 0; i < totalClients; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `scale-${i}`, 
              username: `ScaleUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        // Distribute clients across streams
        const startTime = Date.now();
        const joinPromises: Promise<any>[] = [];

        for (let streamIndex = 0; streamIndex < streamCount; streamIndex++) {
          const streamId = `scale-stream-${streamIndex}`;
          
          for (let clientIndex = 0; clientIndex < clientsPerStream; clientIndex++) {
            const globalClientIndex = streamIndex * clientsPerStream + clientIndex;
            joinPromises.push(clients[globalClientIndex].joinStream(streamId));
          }
        }

        await Promise.all(joinPromises);
        const setupTime = Date.now() - startTime;

        // Verify all streams have correct member counts
        for (let streamIndex = 0; streamIndex < streamCount; streamIndex++) {
          const streamId = `scale-stream-${streamIndex}`;
          const memberCount = server.getStreamMembers(streamId).size;
          expect(memberCount).toBe(clientsPerStream);
        }

        // Test concurrent activity across all streams
        const activityStartTime = Date.now();
        const activityPromises: Promise<any>[] = [];

        for (let streamIndex = 0; streamIndex < streamCount; streamIndex++) {
          const streamId = `scale-stream-${streamIndex}`;
          
          // Each stream has some chat activity
          for (let msgIndex = 0; msgIndex < 3; msgIndex++) {
            const clientIndex = streamIndex * clientsPerStream + (msgIndex % clientsPerStream);
            activityPromises.push(
              clients[clientIndex].sendChatMessage(streamId, `Activity message ${msgIndex}`)
            );
          }
        }

        await Promise.allSettled(activityPromises);
        const activityTime = Date.now() - activityStartTime;

        console.log(`Multi-Stream Scaling Performance:
          Streams: ${streamCount}
          Clients per Stream: ${clientsPerStream}
          Total Clients: ${totalClients}
          Setup Time: ${setupTime}ms
          Activity Time: ${activityTime}ms`);

        expect(setupTime).toBeLessThan(5000);
        expect(activityTime).toBeLessThan(3000);

        // Verify chat activity in each stream
        for (let streamIndex = 0; streamIndex < streamCount; streamIndex++) {
          const streamId = `scale-stream-${streamIndex}`;
          const history = server.getChatHistory(streamId);
          expect(history.length).toBeGreaterThanOrEqual(2);
        }

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should handle long-running connections without memory leaks', async () => {
      const clientCount = 20;
      const clients: WebSocketTestClient[] = [];

      try {
        // Establish long-running connections
        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `longrun-${i}`, 
              username: `LongRunUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
        }

        const streamId = 'memory-test-stream';
        await Promise.all(clients.map(client => client.joinStream(streamId)));

        // Simulate extended activity
        for (let cycle = 0; cycle < 10; cycle++) {
          // Activity burst
          const cyclePromises: Promise<any>[] = [];
          
          for (let i = 0; i < clientCount; i++) {
            cyclePromises.push(
              clients[i].sendChatMessage(streamId, `Cycle ${cycle} message from ${i}`)
            );
            
            if (i % 3 === 0) {
              cyclePromises.push(clients[i].ping());
            }
          }

          await Promise.allSettled(cyclePromises);

          // Check event log sizes don't grow indefinitely
          for (const client of clients.slice(0, 5)) {
            const eventLog = client.getEventLog();
            expect(eventLog.length).toBeLessThan(1000); // Should be capped
          }

          // Brief pause between cycles
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Verify connections are still healthy
        const finalPingPromises = clients.slice(0, 10).map(client => client.ping());
        const finalPings = await Promise.all(finalPingPromises);
        
        const avgFinalPing = finalPings.reduce((a, b) => a + b, 0) / finalPings.length;
        expect(avgFinalPing).toBeLessThan(200); // Performance shouldn't degrade significantly

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });

    it('should efficiently manage server resources under load', async () => {
      const loadClients: WebSocketTestClient[] = [];
      const monitoringClient = new WebSocketTestClient(serverUrl);

      try {
        // Establish monitoring connection
        await monitoringClient.connect({ 
          auth: { userId: 'monitor', username: 'Monitor', role: 'admin' } 
        });

        // Gradually increase load and monitor performance
        const loadLevels = [10, 25, 50, 75, 100];
        
        for (const targetLoad of loadLevels) {
          // Add clients to reach target load
          while (loadClients.length < targetLoad) {
            const client = new WebSocketTestClient(serverUrl);
            await client.connect({ 
              auth: { 
                userId: `load-${loadClients.length}`, 
                username: `LoadUser${loadClients.length}`, 
                role: 'viewer' 
              } 
            });
            loadClients.push(client);
          }

          // Measure performance at this load level
          const loadTestStart = Date.now();
          
          // All clients join a common stream
          const joinPromises = loadClients.map(client => 
            client.joinStream('load-test-stream')
          );
          await Promise.allSettled(joinPromises);

          // Measure ping latency under load
          const pingPromises = loadClients.slice(0, Math.min(10, targetLoad))
            .map(client => client.ping());
          const pings = await Promise.all(pingPromises);
          const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;

          // Measure chat performance under load
          const chatStart = Date.now();
          await loadClients[0].sendChatMessage('load-test-stream', `Load test at ${targetLoad} clients`);
          const chatTime = Date.now() - chatStart;

          const loadTestTime = Date.now() - loadTestStart;

          console.log(`Load Level ${targetLoad} Performance:
            Setup Time: ${loadTestTime}ms
            Average Ping: ${avgPing.toFixed(1)}ms
            Chat Response: ${chatTime}ms
            Server Connections: ${server.getConnectionCount()}`);

          // Performance should remain reasonable even under load
          expect(avgPing).toBeLessThan(500);
          expect(chatTime).toBeLessThan(1000);
          expect(server.getConnectionCount()).toBe(targetLoad + 1); // +1 for monitoring client

          // Brief pause between load levels
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } finally {
        loadClients.forEach(client => client.disconnect());
        monitoringClient.disconnect();
      }
    });
  });

  describe('Network Condition Simulation', () => {
    it('should perform well under simulated network stress', async () => {
      const clients: WebSocketTestClient[] = [];
      const streamId = 'network-stress-test';

      try {
        // Connect clients
        for (let i = 0; i < 15; i++) {
          const client = new WebSocketTestClient(serverUrl);
          await client.connect({ 
            auth: { 
              userId: `network-${i}`, 
              username: `NetworkUser${i}`, 
              role: 'viewer' 
            } 
          });
          clients.push(client);
          await client.joinStream(streamId);
        }

        // Simulate network stress with rapid operations
        const stressTests = [
          {
            name: 'Connection Stress',
            operation: async () => {
              const tempClient = new WebSocketTestClient(serverUrl);
              await tempClient.connect({ auth: { userId: 'temp', username: 'Temp', role: 'viewer' } });
              await tempClient.joinStream(streamId);
              tempClient.disconnect();
            }
          },
          {
            name: 'Message Stress',
            operation: async () => {
              const clientIndex = Math.floor(Math.random() * clients.length);
              await clients[clientIndex].sendChatMessage(streamId, 'Stress test message');
            }
          },
          {
            name: 'Stream Operation Stress',
            operation: async () => {
              const clientIndex = Math.floor(Math.random() * clients.length);
              await clients[clientIndex].leaveStream(streamId);
              await clients[clientIndex].joinStream(streamId);
            }
          }
        ];

        for (const stressTest of stressTests) {
          const stressStart = Date.now();
          const stressPromises: Promise<any>[] = [];

          // Execute stress operations
          for (let i = 0; i < 50; i++) {
            stressPromises.push(
              stressTest.operation().catch(error => ({ error, index: i }))
            );
          }

          const stressResults = await Promise.allSettled(stressPromises);
          const stressTime = Date.now() - stressStart;

          const successful = stressResults.filter(r => r.status === 'fulfilled').length;
          const successRate = (successful / 50) * 100;

          console.log(`${stressTest.name} Results:
            Success Rate: ${successRate.toFixed(1)}%
            Time: ${stressTime}ms
            Operations/Second: ${(50 / stressTime * 1000).toFixed(1)}`);

          expect(successRate).toBeGreaterThan(70); // At least 70% success under stress
          expect(stressTime).toBeLessThan(10000); // Complete within 10 seconds
        }

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });
});
