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
 * Authentication Middleware using Better Auth
 * Validates session from either Bearer token or cookies
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract cookies for logging
    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader
      .split(';')
      .map(s => s.trim())
      .reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

    // Log incoming request details
    console.log('[Auth Middleware] Request:', {
      method: req.method,
      path: req.path,
      hasAuthHeader: Boolean(req.headers.authorization),
      cookieKeys: Object.keys(cookies),
      hasSessionToken: Boolean(cookies.better_auth_session_token),
      tokenPreview: cookies.better_auth_session_token?.substring(0, 10) + '...',
    });

    // Get session using Better Auth's API
    // IMPORTANT: Use fromNodeHeaders to properly convert Express headers
    const convertedHeaders = fromNodeHeaders(req.headers);
    console.log('[Auth Middleware] Converted headers:', {
      hasAuthHeader: Boolean(convertedHeaders.authorization),
      hasCookie: Boolean(convertedHeaders.cookie),
      cookiePreview: convertedHeaders.cookie?.substring(0, 50) + '...',
    });

    const session = await betterAuth.api.getSession({
      headers: convertedHeaders,
    });

    // Log session result
    console.log('[Auth Middleware] Better Auth response:', {
      hasSession: Boolean(session),
      hasUser: Boolean(session?.user),
      userId: session?.user?.id,
      sessionId: session?.session?.id,
    });

    if (!session) {
      console.log('[Auth Middleware] ❌ No session found - returning 401');
      res.status(401).json(unifiedResponse(false, 'No valid session found'));
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
      // First authenticate the user
      const headers = {
        authorization: req.headers.authorization || '',
        cookie: req.headers.cookie || '',
      };

      const session = await betterAuth.api.getSession({
        headers: fromNodeHeaders(req.headers),
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
