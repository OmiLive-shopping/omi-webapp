import { NextFunction, Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { unifiedResponse } from 'uni-response';

import { env } from '../config/env-config.js';
import { PrismaService } from '../config/prisma.config.js';

const secret: Secret = env.JWT_SECRET as string;
const prisma = PrismaService.getInstance().client;

interface AuthPayload {
  userId: string;
  role: string;
}

// Note: AuthUser type is declared in auth.middleware.ts, don't redeclare here

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json(unifiedResponse(false, 'No token provided'));
    return;
  }

  try {
    const decodedToken = jwt.verify(token, secret) as AuthPayload;

    // Fetch user data from database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        name: true,
        bio: true,
        avatarUrl: true,
        isAdmin: true,
        role: true,
        streamKey: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        image: true,
      },
    });

    if (!user) {
      res.status(401).json(unifiedResponse(false, 'User not found'));
      return;
    }

    // Attach user data to request (matching AuthUser type from auth.middleware.ts)
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      name: user.name || undefined,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
      isAdmin: user.isAdmin,
      role: user.role,
      streamKey: user.streamKey || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      image: user.image || undefined,
    } as any; // Type assertion needed due to Better Auth User base type

    next();
  } catch (error) {
    res.status(401).json(unifiedResponse(false, 'Invalid token'));
    return;
  }
};
