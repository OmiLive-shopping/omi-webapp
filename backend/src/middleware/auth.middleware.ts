import { NextFunction, Request, Response } from 'express';
import { unifiedResponse } from 'uni-response';
import { auth as betterAuth } from '../auth.js';
import type { Session, User } from 'better-auth';

// Extend the Better Auth User type with our custom fields
interface AuthUser extends User {
  streamKey?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  role: string;
}

// Augment the Express Request object to include Better Auth session
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: Session;
      // Legacy fields for compatibility
      userId?: string;
      role?: string;
    }
  }
}

/**
 * Authentication Middleware using Better Auth
 * Validates session from either Bearer token or cookies
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Better Auth can handle both Authorization header and cookies
    const headers = {
      // Forward the authorization header if present
      authorization: req.headers.authorization || '',
      // Forward cookies
      cookie: req.headers.cookie || '',
    };

    console.log('Auth middleware - headers:', headers);

    // Get session using Better Auth's API
    const session = await betterAuth.api.getSession({
      headers,
    });

    console.log('Auth middleware - session result:', session);

    if (!session) {
      res.status(401).json(unifiedResponse(false, 'No valid session found'));
      return;
    }

    // Attach session and user to request
    req.session = session.session;
    req.user = session.user as AuthUser;
    
    // Legacy compatibility
    req.userId = session.user.id;
    req.role = (session.user as AuthUser).role;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json(unifiedResponse(false, 'Authentication failed'));
    return;
  }
}

/**
 * Role-based access control middleware
 * Checks if the authenticated user has one of the allowed roles
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First authenticate the user
      const headers = {
        authorization: req.headers.authorization || '',
        cookie: req.headers.cookie || '',
      };

      const session = await betterAuth.api.getSession({
        headers,
      });

      if (!session) {
        res.status(401).json(unifiedResponse(false, 'No valid session found'));
        return;
      }

      // Attach session and user to request
      req.session = session.session;
      req.user = session.user as AuthUser;
      req.userId = session.user.id;
      req.role = (session.user as AuthUser).role;

      const userRole = (session.user as AuthUser).role;
      const isAdmin = (session.user as AuthUser).isAdmin;

      // Admin users bypass role checks
      if (isAdmin) {
        next();
        return;
      }

      // Check if user has one of the allowed roles
      if (allowedRoles.includes(userRole)) {
        next();
        return;
      }

      res.status(403).json(unifiedResponse(false, 'Forbidden: Insufficient permissions'));
      return;
    } catch (error) {
      console.error('Role check error:', error);
      res.status(401).json(unifiedResponse(false, 'Authentication failed'));
      return;
    }
  };
}

/**
 * Convenience middleware for common role requirements
 */
export const requireStreamer = requireRole(['streamer', 'admin']);
export const requireAdmin = requireRole(['admin']);
export const requireUser = authenticate; // Any authenticated user

// Legacy exports for backward compatibility
export const authMiddleware = authenticate;
export const checkUserRole = requireRole;