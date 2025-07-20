import { NextFunction, Request, Response } from 'express';

import { UserService } from '../services/user.service';
import { LoginInputTypes, RegisterInputTypes } from '../types/user.types';
export class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  heartbeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.userService.heartbeat();
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<{}, {}, LoginInputTypes>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const loginInputObj: LoginInputTypes = req.body; // Map request body to Obj
      const result = await this.userService.login(loginInputObj);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  register = async (
    req: Request<{}, {}, RegisterInputTypes>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const registerInputObj: RegisterInputTypes = req.body;
      const result = await this.userService.register(registerInputObj);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId; // Assuming middleware adds `userId` to `req`
      //TODO: add better logic for userId check
      if (userId) {
        const result = await this.userService.getProfile(userId);
        res.status(result.success ? 200 : 404).json(result);
      }
    } catch (error) {
      next(error);
    }
  };

  getPublicProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const viewerId = req.userId; // May be undefined if not authenticated
      const result = await this.userService.getPublicProfile(id, viewerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const result = await this.userService.updateProfile(userId, req.body);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  followUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      
      const result = await this.userService.followUser(userId, id);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  unfollowUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      
      const result = await this.userService.unfollowUser(userId, id);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  getFollowers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = 1, pageSize = 20 } = req.query;
      
      const result = await this.userService.getFollowers(
        id, 
        Number(page), 
        Number(pageSize)
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };

  getFollowing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = 1, pageSize = 20 } = req.query;
      
      const result = await this.userService.getFollowing(
        id, 
        Number(page), 
        Number(pageSize)
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  };
}
