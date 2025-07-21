import { PrismaService } from '../../config/prisma.config';
import { SocketWithAuth } from '../../config/socket/socket.config';

interface RoomInfo {
  streamId: string;
  viewers: Map<string, ViewerInfo>;
  moderators: Set<string>;
  createdAt: Date;
  streamStats?: any;
  lastStatsDbUpdate?: number;
}

interface ViewerInfo {
  userId?: string;
  username?: string;
  socketId: string;
  joinedAt: Date;
  role: string;
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomInfo> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private prisma = PrismaService.getInstance().client;

  private constructor() {}

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  // Create a new room for a stream
  async createRoom(streamId: string): Promise<void> {
    if (!this.rooms.has(streamId)) {
      this.rooms.set(streamId, {
        streamId,
        viewers: new Map(),
        moderators: new Set(),
        createdAt: new Date(),
      });

      // Load moderators from database
      await this.loadModerators(streamId);
    }
  }

  // Join a room
  async joinRoom(socket: SocketWithAuth, streamId: string): Promise<void> {
    const room = this.rooms.get(streamId);
    if (!room) {
      await this.createRoom(streamId);
    }

    const roomInfo = this.rooms.get(streamId)!;

    // Add viewer to room
    roomInfo.viewers.set(socket.id, {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
      joinedAt: new Date(),
      role: socket.role || 'anonymous',
    });

    // Track user sockets for multi-device support
    if (socket.userId) {
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId)!.add(socket.id);

      // Join user-specific room for direct messaging
      socket.join(`user:${socket.userId}`);
    }

    // Join the stream room
    socket.join(`stream:${streamId}`);

    // Track viewer in database if authenticated
    if (socket.userId) {
      await this.trackViewer(streamId, socket.userId, socket.id);
    }

    // Update viewer count
    await this.updateViewerCount(streamId);
  }

  // Leave a room
  async leaveRoom(socket: SocketWithAuth, streamId: string): Promise<void> {
    const room = this.rooms.get(streamId);
    if (!room) return;

    // Remove viewer
    room.viewers.delete(socket.id);

    // Remove from user sockets
    if (socket.userId) {
      const userSockets = this.userSockets.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(socket.userId);
        }
      }
    }

    // Leave the room
    socket.leave(`stream:${streamId}`);

    // Update viewer tracking in database
    if (socket.userId) {
      await this.removeViewer(streamId, socket.id);
    }

    // Update viewer count
    await this.updateViewerCount(streamId);

    // Clean up empty rooms
    if (room.viewers.size === 0) {
      this.rooms.delete(streamId);
    }
  }

  // Get room info
  getRoomInfo(streamId: string): RoomInfo | undefined {
    return this.rooms.get(streamId);
  }

  // Get viewer count for a stream
  getViewerCount(streamId: string): number {
    const room = this.rooms.get(streamId);
    return room ? room.viewers.size : 0;
  }

  // Get all rooms a user is in
  getUserRooms(userId: string): string[] {
    const rooms: string[] = [];
    this.rooms.forEach((room, streamId) => {
      room.viewers.forEach(viewer => {
        if (viewer.userId === userId) {
          rooms.push(streamId);
        }
      });
    });
    return rooms;
  }

  // Check if user is moderator
  isModerator(streamId: string, userId: string): boolean {
    const room = this.rooms.get(streamId);
    return room ? room.moderators.has(userId) : false;
  }

  // Add moderator
  addModerator(streamId: string, userId: string): void {
    const room = this.rooms.get(streamId);
    if (room) {
      room.moderators.add(userId);
    }
  }

  // Remove moderator
  removeModerator(streamId: string, userId: string): void {
    const room = this.rooms.get(streamId);
    if (room) {
      room.moderators.delete(userId);
    }
  }

  // Load moderators from database
  private async loadModerators(streamId: string): Promise<void> {
    try {
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
        select: {
          userId: true,
          user: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const room = this.rooms.get(streamId);
      if (room && stream) {
        // Stream owner is always a moderator
        room.moderators.add(stream.userId);

        // TODO: Load additional moderators from a StreamModerator table
      }
    } catch (error) {
      console.error('Error loading moderators:', error);
    }
  }

  // Track viewer in database
  private async trackViewer(streamId: string, userId: string, sessionId: string): Promise<void> {
    try {
      await this.prisma.streamViewer.create({
        data: {
          streamId,
          userId,
          sessionId,
        },
      });
    } catch (error) {
      // Handle duplicate key error gracefully
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        // Viewer already tracked
      } else {
        console.error('Error tracking viewer:', error);
      }
    }
  }

  // Remove viewer from database
  private async removeViewer(streamId: string, sessionId: string): Promise<void> {
    try {
      await this.prisma.streamViewer.updateMany({
        where: {
          streamId,
          sessionId,
          leftAt: null,
        },
        data: {
          leftAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error removing viewer:', error);
    }
  }

  // Update viewer count in stream
  private async updateViewerCount(streamId: string): Promise<void> {
    const count = this.getViewerCount(streamId);
    try {
      await this.prisma.stream.update({
        where: { id: streamId },
        data: { viewerCount: count },
      });
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  }

  // Clean up disconnected user
  async handleDisconnect(socket: SocketWithAuth): Promise<void> {
    // Find all rooms this socket was in
    const roomsToLeave: string[] = [];
    this.rooms.forEach((room, streamId) => {
      if (room.viewers.has(socket.id)) {
        roomsToLeave.push(streamId);
      }
    });

    // Leave all rooms
    for (const streamId of roomsToLeave) {
      await this.leaveRoom(socket, streamId);
    }
  }

  // Get all active streams
  getActiveStreams(): string[] {
    return Array.from(this.rooms.keys());
  }

  // For testing purposes only
  clearAll(): void {
    this.rooms.clear();
    this.userSockets.clear();
  }
}
