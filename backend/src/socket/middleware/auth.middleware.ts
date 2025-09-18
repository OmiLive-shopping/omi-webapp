import { Socket } from 'socket.io';

import { auth } from '../../auth.js';
import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';

export const socketAuthMiddleware = async (socket: SocketWithAuth, next: (err?: Error) => void) => {
  try {
    // Try to get cookies from handshake headers (sent with withCredentials: true)
    const cookies = socket.handshake.headers.cookie || '';

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log('Socket auth middleware - cookies available:', cookies ? 'yes' : 'no');
    }

    if (!cookies) {
      // No cookies - allow anonymous connection
      socket.userId = undefined;
      socket.username = undefined;
      socket.role = 'anonymous';
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log('Socket auth: No cookies - anonymous connection');
      }
      return next();
    }

    // Validate session with Better Auth using the cookies
    const headers = new Headers();
    headers.set('cookie', cookies);
    if (process.env.SOCKET_DEBUG === 'true') {
      console.log('Socket auth: Using cookies from handshake headers');
    }

    const session = await auth.api.getSession({
      headers: headers as any,
    });

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log(
        'Socket auth: Better Auth session result:',
        session ? 'Valid session' : 'Invalid session',
      );
    }

    if (!session || !session.user) {
      // Invalid session - treat as anonymous
      socket.userId = undefined;
      socket.username = undefined;
      socket.role = 'anonymous';
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log('Socket auth: Invalid session - treating as anonymous');
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
      console.log(`Socket auth: Authenticated as ${socket.username} (${socket.role})`);
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
