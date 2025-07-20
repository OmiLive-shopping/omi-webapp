import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env-config';
import { SocketWithAuth } from '../../config/socket/socket.config';
import { PrismaService } from '../../config/prisma.config';

interface JwtPayload {
  userId: string;
  role: string;
}

export const socketAuthMiddleware = async (socket: SocketWithAuth, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      // Allow anonymous connections for public features like viewing stream
      socket.userId = undefined;
      socket.username = undefined;
      socket.role = 'anonymous';
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token as string, env.JWT_SECRET) as JwtPayload;
    
    // Get user from database to verify they still exist and are active
    const prisma = PrismaService.getInstance().client;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        active: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user || !user.active) {
      return next(new Error('User not found or inactive'));
    }

    // Attach user info to socket
    socket.userId = user.id;
    socket.username = user.username;
    socket.role = user.role?.name || 'viewer';

    next();
  } catch (error) {
    // For invalid tokens, still allow connection as anonymous
    socket.userId = undefined;
    socket.username = undefined;
    socket.role = 'anonymous';
    next();
  }
};

// Middleware to require authentication for certain events
export const requireAuth = (socket: SocketWithAuth, next: (err?: Error) => void) => {
  if (!socket.userId) {
    return next(new Error('Authentication required'));
  }
  next();
};

// Middleware to require specific role
export const requireRole = (roles: string[]) => {
  return (socket: SocketWithAuth, next: (err?: Error) => void) => {
    if (!socket.role || !roles.includes(socket.role)) {
      return next(new Error('Insufficient permissions'));
    }
    next();
  };
};