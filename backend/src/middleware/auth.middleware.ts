import type { Session, User } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { NextFunction, Request, Response } from 'express';
import { unifiedResponse } from 'uni-response';

import { auth as betterAuth } from '../auth.js';

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
 * Authentication Middleware using Better Auth Bearer Tokens
 * Validates JWT Bearer tokens from Authorization header
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    // Log incoming request details
    console.log('[Auth Middleware] Request:', {
      method: req.method,
      path: req.path,
      hasAuthHeader: Boolean(authHeader),
      authType: authHeader?.split(' ')[0],
      tokenPreview: authHeader?.startsWith('Bearer ') ? authHeader.substring(0, 20) + '...' : 'N/A',
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth Middleware] ❌ No Bearer token found');
      res.status(401).json(unifiedResponse(false, 'No valid authentication token'));
      return;
    }

    // Get session using Better Auth's API
    // IMPORTANT: Use fromNodeHeaders to properly convert Express headers
    const convertedHeaders = fromNodeHeaders(req.headers) as Headers & {
      authorization?: string;
    };
    console.log('[Auth Middleware] Validating Bearer token...');

    const session = await betterAuth.api.getSession({
      headers: convertedHeaders,
    });

    // Log session result
    console.log('[Auth Middleware] Token validation result:', {
      hasSession: Boolean(session),
      hasUser: Boolean(session?.user),
      userId: session?.user?.id,
      username: (session?.user as AuthUser)?.username,
    });

    if (!session || !session.user) {
      console.log('[Auth Middleware] ❌ Invalid or expired token');
      res.status(401).json(unifiedResponse(false, 'Invalid or expired token'));
      return;
    }

    console.log('[Auth Middleware] ✅ Session validated successfully');

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
      // Extract Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json(unifiedResponse(false, 'No valid authentication token'));
        return;
      }

      // Validate Bearer token
      const session = await betterAuth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session || !session.user) {
        res.status(401).json(unifiedResponse(false, 'Invalid or expired token'));
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
