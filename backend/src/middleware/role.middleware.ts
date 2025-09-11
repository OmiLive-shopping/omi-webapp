import { NextFunction, Request, Response } from 'express';
import { unifiedResponse } from 'uni-response';

import { Permission, Role, ROLE_PERMISSIONS, ROLES } from '../constants/roles.js';

// Extend the Request interface to include user with role
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role?: string;
        isAdmin?: boolean;
      };
    }
  }
}

/**
 * Middleware to check if user has a specific role
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(unifiedResponse(false, 'Authentication required'));
      return;
    }

    // Check if user is admin (legacy support)
    if (req.user.isAdmin) {
      next();
      return;
    }

    // Check role-based access
    const userRole = req.user.role || ROLES.USER;
    if (allowedRoles.includes(userRole as Role)) {
      next();
      return;
    }

    res.status(403).json(unifiedResponse(false, 'Insufficient permissions'));
  };
};

/**
 * Middleware to check if user has specific permissions
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(unifiedResponse(false, 'Authentication required'));
      return;
    }

    // Admin bypasses all permission checks
    if (req.user.isAdmin) {
      next();
      return;
    }

    // Get user's role and permissions
    const userRole = (req.user.role || ROLES.USER) as Role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission as any),
    );

    if (hasAllPermissions) {
      next();
      return;
    }

    res.status(403).json(unifiedResponse(false, 'Insufficient permissions'));
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(unifiedResponse(false, 'Authentication required'));
    return;
  }

  if (req.user.isAdmin || req.user.role === ROLES.ADMIN) {
    next();
    return;
  }

  res.status(403).json(unifiedResponse(false, 'Admin access required'));
};

/**
 * Middleware to check if user has brand role or higher (admin)
 */
export const requireBrand = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(unifiedResponse(false, 'Authentication required'));
    return;
  }

  if (req.user.isAdmin || req.user.role === ROLES.ADMIN || req.user.role === ROLES.BRAND) {
    next();
    return;
  }

  res.status(403).json(unifiedResponse(false, 'Brand access required'));
};

/**
 * Middleware to check if user owns the resource or is admin
 * @param userIdParam - The request parameter that contains the user ID to check
 */
export const requireOwnerOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(unifiedResponse(false, 'Authentication required'));
      return;
    }

    // Admin can access any resource
    if (req.user.isAdmin || req.user.role === ROLES.ADMIN) {
      next();
      return;
    }

    // Check if user owns the resource
    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    if (resourceUserId && resourceUserId === req.user.id) {
      next();
      return;
    }

    res.status(403).json(unifiedResponse(false, 'Access denied'));
  };
};
