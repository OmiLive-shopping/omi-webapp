import { Router } from 'express';
import { StreamService } from '../services/stream.service.js';
import { StreamRepository } from '../repositories/stream.repository.js';
import { ProductRepository } from '../../product/repositories/product.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { SocketServer } from '../../../config/socket/socket.config.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize dependencies
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const streamRepository = new StreamRepository(prisma);
const productRepository = new ProductRepository(prisma);
const userRepository = new UserRepository(prisma);
const streamService = new StreamService(streamRepository, productRepository, userRepository);

// Test data
const testUsers = [
  { id: 'user1', username: 'StreamViewer1', role: 'viewer' },
  { id: 'user2', username: 'CoolChatter', role: 'viewer' },
  { id: 'user3', username: 'TechEnthusiast', role: 'viewer' },
  { id: 'user4', username: 'ModeratorMike', role: 'moderator' },
  { id: 'user5', username: 'SuperFan2024', role: 'viewer' },
];

const testMessages = [
  'Hey everyone! 👋',
  'This stream is awesome!',
  'Can you explain that again?',
  'LOL that was funny 😂',
  'First time here, loving the content!',
  'Great explanation!',
  '@StreamerName you\'re the best!',
  'Can we see more of this?',
  'Thanks for streaming!',
  '🔥🔥🔥',
  'This is so helpful',
  'Following now!',
  'When is the next stream?',
  'Love the energy!',
  'Keep up the great work!'
];

let simulationInterval: NodeJS.Timer | null = null;
let currentSimulatedStream: any = null;

/**
 * Start stream simulation
 * Makes the first stream in the database go live and simulates chat
 */
router.post('/simulate/start', async (req, res) => {
  try {
    // Get the first stream from database
    const result = await streamService.getStreams({ limit: 1 });
    
    if (!result.success || !result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No streams found to simulate'
      });
    }

    const stream = result.data[0];
    
    // Make the stream go live using the goLive method
    const goLiveResult = await streamService.goLive(stream.id, stream.userId);

    if (!goLiveResult.success) {
      return res.status(500).json({
        success: false,
        message: goLiveResult.message || 'Failed to make stream go live'
      });
    }

    currentSimulatedStream = goLiveResult.data;

    // Get socket server instance
    const socketServer = SocketServer.getInstance();
    const io = socketServer.getIO();

    // Simulate viewers joining
    let viewerCount = currentSimulatedStream.viewerCount || 10;
    
    // Start chat simulation
    simulationInterval = setInterval(() => {
      // Randomly add/remove viewers
      if (Math.random() > 0.7) {
        viewerCount += Math.floor(Math.random() * 3) - 1;
        viewerCount = Math.max(1, viewerCount);
        
        // Emit viewer count update
        io.to(`stream:${stream.id}`).emit('stream:viewers:update', {
          streamId: stream.id,
          viewerCount,
          timestamp: new Date().toISOString()
        });
      }

      // Send random chat messages
      if (Math.random() > 0.5) {
        const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        
        const chatMessage = {
          id: uuidv4(),
          streamId: stream.id,
          userId: randomUser.id,
          username: randomUser.username,
          content: randomMessage,
          timestamp: new Date().toISOString(),
          role: randomUser.role
        };

        // Emit chat message to stream room
        io.to(`stream:${stream.id}`).emit('chat:message', chatMessage);
        
        // Also emit to test namespace for debugging
        io.emit('test:chat:message', chatMessage);
      }

      // Simulate stream stats
      if (Math.random() > 0.8) {
        const stats = {
          streamId: stream.id,
          bitrate: Math.floor(Math.random() * 1000) + 2000,
          fps: 30,
          resolution: '1920x1080',
          packetLoss: Math.random() * 2,
          latency: Math.floor(Math.random() * 50) + 10,
          timestamp: new Date().toISOString()
        };

        io.to(`stream:${stream.id}`).emit('stream:stats:update', stats);
      }
    }, 2000); // Send events every 2 seconds

    // Send initial messages
    for (let i = 0; i < 5; i++) {
      const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
      const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
      
      setTimeout(() => {
        const chatMessage = {
          id: uuidv4(),
          streamId: stream.id,
          userId: randomUser.id,
          username: randomUser.username,
          content: randomMessage,
          timestamp: new Date().toISOString(),
          role: randomUser.role
        };

        io.to(`stream:${stream.id}`).emit('chat:message', chatMessage);
        io.emit('test:chat:message', chatMessage);
      }, i * 500);
    }

    res.json({
      success: true,
      message: 'Stream simulation started',
      data: {
        streamId: stream.id,
        streamTitle: stream.title,
        isLive: true,
        viewerCount,
        simulationActive: true
      }
    });
  } catch (error) {
    console.error('Simulation start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start simulation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stop stream simulation
 */
router.post('/simulate/stop', async (req, res) => {
  try {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }

    if (currentSimulatedStream) {
      // End the stream using the endStreamById method
      await streamService.endStreamById(currentSimulatedStream.id, currentSimulatedStream.userId);

      // Notify all clients
      const socketServer = SocketServer.getInstance();
      const io = socketServer.getIO();
      
      io.to(`stream:${currentSimulatedStream.id}`).emit('stream:ended', {
        streamId: currentSimulatedStream.id,
        timestamp: new Date().toISOString()
      });

      const streamId = currentSimulatedStream.id;
      currentSimulatedStream = null;

      res.json({
        success: true,
        message: 'Stream simulation stopped',
        data: {
          streamId,
          simulationActive: false
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No active simulation to stop'
      });
    }
  } catch (error) {
    console.error('Simulation stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop simulation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get simulation status
 */
router.get('/simulate/status', (req, res) => {
  res.json({
    success: true,
    data: {
      simulationActive: !!simulationInterval,
      currentStreamId: currentSimulatedStream?.id || null,
      currentStreamTitle: currentSimulatedStream?.title || null
    }
  });
});

/**
 * Reset all streams to offline (for development)
 */
router.post('/reset-all', async (req, res) => {
  try {
    // Stop any active simulation
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    currentSimulatedStream = null;

    // Reset all streams to offline in database
    await prisma.stream.updateMany({
      where: { isLive: true },
      data: { 
        isLive: false,
        viewerCount: 0,
        endedAt: new Date()
      }
    });

    // Get socket server and notify clients
    const socketServer = SocketServer.getInstance();
    const io = socketServer.getIO();
    
    // Emit global reset event
    io.emit('streams:reset', {
      message: 'All streams have been reset to offline',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'All streams reset to offline',
      data: {
        simulationStopped: true,
        streamsReset: true
      }
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset streams',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Send a test chat message
 */
router.post('/simulate/chat', (req, res) => {
  try {
    const { streamId, message, username = 'TestUser' } = req.body;

    if (!streamId || !message) {
      return res.status(400).json({
        success: false,
        message: 'streamId and message are required'
      });
    }

    const socketServer = SocketServer.getInstance();
    const io = socketServer.getIO();

    const chatMessage = {
      id: uuidv4(),
      streamId,
      userId: 'test-user',
      username,
      content: message,
      timestamp: new Date().toISOString(),
      role: 'viewer'
    };

    io.to(`stream:${streamId}`).emit('chat:message', chatMessage);
    io.emit('test:chat:message', chatMessage);

    res.json({
      success: true,
      message: 'Test message sent',
      data: chatMessage
    });
  } catch (error) {
    console.error('Test chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;