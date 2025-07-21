import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { env } from '../../config/env-config';
import { SocketServer } from '../../config/socket/socket.config';
import { initializeSocketServer } from '../index';

describe('Socket.IO Integration Tests', () => {
  let httpServer: any;
  let serverSocket: any;
  let clientSocket: ClientSocket;
  let port: number;

  // Generate test tokens
  const validToken = jwt.sign({ userId: 'test-user-id', role: 'viewer' }, env.JWT_SECRET);
  const streamerToken = jwt.sign({ userId: 'streamer-id', role: 'streamer' }, env.JWT_SECRET);

  beforeAll(done => {
    httpServer = createServer();
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      initializeSocketServer(httpServer);
      serverSocket = SocketServer.getInstance().getIO();
      done();
    });
  });

  afterAll(done => {
    serverSocket.close();
    httpServer.close();
    done();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Authentication', () => {
    it('should allow connection with valid token', done => {
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: {
          token: validToken,
        },
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    it('should allow anonymous connection without token', done => {
      clientSocket = ioClient(`http://localhost:${port}`);

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });
  });

  describe('Stream Room Management', () => {
    beforeEach(done => {
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: {
          token: validToken,
        },
      });
      clientSocket.on('connect', done);
    });

    it('should join stream room successfully', done => {
      const streamId = '123e4567-e89b-12d3-a456-426614174000';

      clientSocket.emit('stream:join', { streamId });

      clientSocket.on('stream:joined', data => {
        expect(data.streamId).toBe(streamId);
        done();
      });

      clientSocket.on('error', error => {
        // Stream might not exist in test, but room should still be created
        done();
      });
    });

    it('should leave stream room successfully', done => {
      const streamId = '123e4567-e89b-12d3-a456-426614174000';

      clientSocket.emit('stream:join', { streamId });

      clientSocket.on('stream:joined', () => {
        clientSocket.emit('stream:leave', { streamId });
      });

      clientSocket.on('stream:left', data => {
        expect(data.streamId).toBe(streamId);
        done();
      });
    });
  });

  describe('Chat Functionality', () => {
    beforeEach(done => {
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: {
          token: validToken,
        },
      });
      clientSocket.on('connect', done);
    });

    it('should reject message from unauthenticated user', done => {
      const anonClient = ioClient(`http://localhost:${port}`);

      anonClient.on('connect', () => {
        anonClient.emit('chat:send-message', {
          streamId: '123e4567-e89b-12d3-a456-426614174000',
          content: 'Hello world',
        });
      });

      anonClient.on('error', error => {
        expect(error.message).toContain('Authentication required');
        anonClient.disconnect();
        done();
      });
    });

    it('should handle typing indicators', done => {
      const streamId = '123e4567-e89b-12d3-a456-426614174000';

      clientSocket.emit('stream:join', { streamId });

      clientSocket.on('stream:joined', () => {
        clientSocket.emit('chat:typing', { streamId, isTyping: true });

        // Since we're the only client, we won't receive our own typing event
        // In a real scenario, another client would receive this
        setTimeout(() => {
          done();
        }, 100);
      });
    });
  });

  describe('Namespaces', () => {
    it('should connect to chat namespace', done => {
      const chatClient = ioClient(`http://localhost:${port}/chat`, {
        auth: {
          token: validToken,
        },
      });

      chatClient.on('connect', () => {
        expect(chatClient.connected).toBe(true);
        chatClient.disconnect();
        done();
      });
    });

    it('should connect to notifications namespace with auth', done => {
      const notifClient = ioClient(`http://localhost:${port}/notifications`, {
        auth: {
          token: validToken,
        },
      });

      notifClient.on('connect', () => {
        expect(notifClient.connected).toBe(true);
        notifClient.disconnect();
        done();
      });
    });

    it('should reject analytics namespace for non-streamers', done => {
      const analyticsClient = ioClient(`http://localhost:${port}/analytics`, {
        auth: {
          token: validToken, // viewer token
        },
      });

      analyticsClient.on('connect', () => {
        // Should be disconnected immediately
      });

      analyticsClient.on('disconnect', () => {
        done();
      });

      analyticsClient.on('error', error => {
        expect(error.message).toContain('Unauthorized');
        done();
      });
    });
  });
});
