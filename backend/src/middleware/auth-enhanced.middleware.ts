import { NextFunction, Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { unifiedResponse } from 'uni-response';

import { env } from '../config/env-config';
import prisma from '../config/prisma.config';

const secret: Secret = env.JWT_SECRET as string;

interface AuthPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        isAdmin: boolean;
        role?: string;
      };
    }
  }
}

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
        isAdmin: true,
        role: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      res.status(401).json(unifiedResponse(false, 'User not found'));
      return;
    }

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      role: user.role?.name,
    };

    next();
  } catch (error) {
    res.status(401).json(unifiedResponse(false, 'Invalid token'));
    return;
  }
};
