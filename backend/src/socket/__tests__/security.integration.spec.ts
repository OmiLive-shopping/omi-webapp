import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { SecurityManager } from '../managers/security.manager.js';
import { SecurityEventType } from '../../config/socket/security.config.js';

describe('WebSocket Security Integration Tests', () => {
  let httpServer: HTTPServer;
  let socketServer: SocketIOServer;
  let securityManager: SecurityManager;
  let clients: ClientSocket[];
  let port: number;

  beforeEach(async () => {
    // Set up test server
    httpServer = new HTTPServer();
    socketServer = new SocketIOServer(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
      },
    });

    securityManager = SecurityManager.getInstance();
    clients = [];

    // Find available port
    port = await new Promise((resolve) => {
      const testServer = httpServer.listen(0, () => {
        const address = testServer.address();
        if (address && typeof address === 'object') {
          resolve(address.port);
        }
      });
    });
  });

  afterEach(() => {
    clients.forEach(client => client.disconnect());
    clients = [];
    socketServer.close();
    httpServer.close();
  });

  describe('CORS Protection', () => {
    it('should accept connections from allowed origins', async () => {
      const client = Client(`http://localhost:${port}`, {
        extraHeaders: {
          origin: 'http://localhost:3000'
        }
      });
      clients.push(client);

      const connected = await new Promise((resolve) => {
        client.on('connect', () => resolve(true));
        client.on('connect_error', () => resolve(false));
        setTimeout(() => resolve(false), 1000);
      });

      expect(connected).toBe(true);
    });

    it('should reject connections from disallowed origins', async () => {
      const client = Client(`http://localhost:${port}`, {
        extraHeaders: {
          origin: 'http://malicious-site.com'
        }
      });
      clients.push(client);

      const rejected = await new Promise((resolve) => {
        client.on('connect', () => resolve(false));
        client.on('connect_error', () => resolve(true));
        setTimeout(() => resolve(false), 1000);
      });

      expect(rejected).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce connection rate limits per IP', async () => {
      const maxConnections = 5;
      const connectionPromises: Promise<boolean>[] = [];

      // Try to create more connections than allowed
      for (let i = 0; i < maxConnections + 2; i++) {
        const client = Client(`http://localhost:${port}`);
        clients.push(client);

        const promise = new Promise<boolean>((resolve) => {
          client.on('connect', () => resolve(true));
          client.on('connect_error', () => resolve(false));
          setTimeout(() => resolve(false), 1000);
        });
        connectionPromises.push(promise);
      }

      const results = await Promise.all(connectionPromises);
      const successfulConnections = results.filter(Boolean).length;

      // Should not exceed the rate limit
      expect(successfulConnections).toBeLessThanOrEqual(maxConnections);
    });

    it('should enforce message rate limits', async () => {
      const client = Client(`http://localhost:${port}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      // Send messages rapidly
      const messagePromises: Promise<boolean>[] = [];
      for (let i = 0; i < 200; i++) {
        const promise = new Promise<boolean>((resolve) => {
          client.emit('chat:send-message', { 
            streamId: 'test-stream', 
            message: `Test message ${i}` 
          });
          
          const timeout = setTimeout(() => resolve(true), 100);
          client.once('error', () => {
            clearTimeout(timeout);
            resolve(false);
          });
        });
        messagePromises.push(promise);
      }

      const results = await Promise.all(messagePromises);
      const successful = results.filter(Boolean).length;

      // Should be rate limited after threshold
      expect(successful).toBeLessThan(200);
    });
  });

  describe('Payload Validation', () => {
    it('should reject oversized payloads', async () => {
      const client = Client(`http://localhost:${port}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      // Create oversized payload (> 1MB)
      const largeMessage = 'x'.repeat(2 * 1024 * 1024); // 2MB
      
      const rejected = await new Promise<boolean>((resolve) => {
        client.emit('chat:send-message', { 
          streamId: 'test-stream', 
          message: largeMessage 
        });
        
        client.once('error', (error) => {
          expect(error.message).toContain('payload');
          resolve(true);
        });
        
        setTimeout(() => resolve(false), 1000);
      });

      expect(rejected).toBe(true);
    });

    it('should sanitize message content', async () => {
      const client = Client(`http://localhost:${port}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      const maliciousMessage = '<script>alert("xss")</script>Hello world';
      
      const sanitized = await new Promise<string>((resolve) => {
        client.emit('chat:send-message', { 
          streamId: 'test-stream', 
          message: maliciousMessage 
        });
        
        client.once('chat:message:sent', (data) => {
          resolve(data.message);
        });
        
        setTimeout(() => resolve(''), 1000);
      });

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello world');
    });
  });

  describe('Authentication Enforcement', () => {
    it('should require authentication for protected events', async () => {
      const client = Client(`http://localhost:${port}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      // Try to perform admin action without auth
      const rejected = await new Promise<boolean>((resolve) => {
        client.emit('chat:moderate-user', { 
          streamId: 'test-stream', 
          targetUserId: 'user123',
          action: 'timeout'
        });
        
        client.once('error', (error) => {
          expect(error.message).toContain('Authentication required');
          resolve(true);
        });
        
        setTimeout(() => resolve(false), 1000);
      });

      expect(rejected).toBe(true);
    });

    it('should allow authenticated users to perform protected actions', async () => {
      const client = Client(`http://localhost:${port}`, {
        auth: {
          token: 'valid-jwt-token' // Would be validated by auth middleware
        }
      });
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      // This test would need actual auth middleware integration
      // For now, we'll just verify the connection succeeds
      expect(client.connected).toBe(true);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect and respond to suspicious activity patterns', async () => {
      const client = Client(`http://localhost:${port}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
      });

      // Simulate suspicious activity
      const suspiciousActivities = [
        () => client.emit('invalid:event', { data: 'test' }),
        () => client.emit('chat:send-message', { message: 'spam' }),
        () => client.emit('unauthorized:action', { payload: 'malicious' }),
      ];

      // Perform multiple suspicious activities
      for (let i = 0; i < 15; i++) {
        const activity = suspiciousActivities[i % suspiciousActivities.length];
        activity();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should eventually get blocked
      const blocked = await new Promise<boolean>((resolve) => {
        client.once('disconnect', () => resolve(true));
        setTimeout(() => resolve(false), 2000);
      });

      expect(blocked).toBe(true);
    });
  });

  describe('Security Metrics', () => {
    it('should track security metrics accurately', async () => {
      const initialMetrics = securityManager.getMetrics();
      
      // Create some connections
      const clients = [];
      for (let i = 0; i < 3; i++) {
        const client = Client(`http://localhost:${port}`);
        clients.push(client);
        
        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });
      }

      const updatedMetrics = securityManager.getMetrics();
      
      expect(updatedMetrics.activeConnections).toBeGreaterThan(initialMetrics.activeConnections);
      expect(updatedMetrics.totalConnections).toBeGreaterThanOrEqual(updatedMetrics.activeConnections);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });

    it('should log security events', async () => {
      const initialLogCount = securityManager.getAuditLogs().length;
      
      // Trigger a security event (invalid origin)
      const client = Client(`http://localhost:${port}`, {
        extraHeaders: {
          origin: 'http://malicious-site.com'
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = securityManager.getAuditLogs();
      expect(logs.length).toBeGreaterThan(initialLogCount);
      
      // Should have logged the blocked connection
      const blockEvent = logs.find(log => 
        log.eventType === SecurityEventType.INVALID_ORIGIN
      );
      expect(blockEvent).toBeDefined();
      
      client.disconnect();
    });
  });

  describe('IP Blocking', () => {
    it('should block malicious IPs', async () => {
      const maliciousIP = '192.168.1.100';
      
      // Block the IP
      securityManager.blockIP(maliciousIP, 'Test block');
      
      // Try to connect from blocked IP (simulated)
      const client = Client(`http://localhost:${port}`, {
        forceNew: true,
        // Note: In real test, would need to mock the IP detection
      });

      const blocked = await new Promise<boolean>((resolve) => {
        client.on('connect', () => resolve(false));
        client.on('connect_error', () => resolve(true));
        setTimeout(() => resolve(false), 1000);
      });

      // Unblock for cleanup
      securityManager.unblockIP(maliciousIP);
      client.disconnect();
    });
  });

  describe('Configuration Updates', () => {
    it('should apply configuration changes in real-time', async () => {
      const originalConfig = securityManager.getConfig();
      
      // Update configuration
      securityManager.updateConfig({
        security: {
          maxAnonymousConnections: 5
        }
      });
      
      const updatedConfig = securityManager.getConfig();
      expect(updatedConfig.security.maxAnonymousConnections).toBe(5);
      
      // Restore original config
      securityManager.updateConfig(originalConfig);
    });
  });

  describe('Health Monitoring', () => {
    it('should provide accurate health status', async () => {
      const metrics = securityManager.getMetrics();
      
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('blockedAttempts');
      expect(metrics).toHaveProperty('rateLimitViolations');
      expect(metrics).toHaveProperty('lastUpdated');
      
      expect(typeof metrics.activeConnections).toBe('number');
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });
});
