import { Socket } from 'socket.io';

import { auth } from '../../auth.js';
import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';

export const socketAuthMiddleware = async (socket: SocketWithAuth, next: (err?: Error) => void) => {
  try {
    // Extract Bearer token from handshake auth
    const token = socket.handshake.auth?.token;

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log('[Socket Auth] Token available:', token ? 'yes' : 'no');
      console.log('[Socket Auth] Handshake auth:', socket.handshake.auth);
    }

    if (!token) {
      // No token - allow anonymous connection
      socket.userId = undefined;
      socket.username = undefined;
      socket.role = 'anonymous';
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log('[Socket Auth] No token - anonymous connection');
      }
      return next();
    }

    // Validate Bearer token with Better Auth
    const headers = new Headers();
    headers.set('authorization', `Bearer ${token}`);
    if (process.env.SOCKET_DEBUG === 'true') {
      console.log('[Socket Auth] Validating Bearer token...');
    }

    const session = await auth.api.getSession({
      headers: headers as any,
    });

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log(
        '[Socket Auth] Token validation result:',
        session ? 'Valid token' : 'Invalid token',
      );
    }

    if (!session || !session.user) {
      // Invalid token - treat as anonymous
      socket.userId = undefined;
      socket.username = undefined;
      socket.role = 'anonymous';
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log('[Socket Auth] Invalid token - treating as anonymous');
      }
      return next();
    }

    // Get additional user data from database to verify they're active
    const prisma = PrismaService.getInstance().client;
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        active: true,
        isAdmin: true,
        role: true,
        roleRelation: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user || !user.active) {
      // User exists in session but is inactive
      socket.userId = undefined;
      socket.username = undefined;
      socket.role = 'anonymous';
      return next();
    }

    // Attach user info to socket
    socket.userId = user.id;
    socket.username = user.username;

    // Determine role: admin > roleRelation > Better Auth role > default viewer
    if (user.isAdmin) {
      socket.role = 'admin';
    } else if (user.roleRelation?.name) {
      socket.role = user.roleRelation.name;
    } else if (user.role) {
      socket.role = user.role;
    } else {
      socket.role = 'viewer';
    }

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log(`[Socket Auth] ✅ Authenticated as ${socket.username} (${socket.role})`);
    }

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    // For any errors, allow connection as anonymous
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
