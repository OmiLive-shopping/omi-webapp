import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { ProfileService } from '../services/profile.service.js';

// Define authenticated request type
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class ProfileController {
  private profileService: ProfileService;

  constructor(profileService: ProfileService) {
    this.profileService = profileService;
  }

  /**
   * Get public user profile by username
   * GET /v1/profiles/users/:username
   */
  getUserProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;
      const viewerId = req.user?.id; // Optional - for checking follow status and permissions

      const result = await this.profileService.getUserProfile(username, viewerId);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get brand profile by slug
   * GET /v1/profiles/brands/:slug
   */
  getBrandProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params;

      const result = await this.profileService.getBrandProfile(slug);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update current user's profile
   * PATCH /v1/profiles/me
   */
  updateMyProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const updateData = req.body;
      const result = await this.profileService.updateUserProfile(req.user.id, updateData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update current user's brand profile
   * PATCH /v1/profiles/my-brand
   */
  updateMyBrandProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { brandId } = req.body; // Brand ID should be passed in body
      const updateData = req.body;
      delete updateData.brandId; // Remove brandId from update data

      if (!brandId) {
        res.status(400).json({ success: false, message: 'Brand ID required' });
        return;
      }

      const result = await this.profileService.updateBrandProfile(brandId, req.user.id, updateData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if username is available
   * GET /v1/profiles/check-username/:username
   */
  checkUsernameAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { username } = req.params;

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        res.status(400).json({
          success: false,
          message: 'Invalid username format',
          available: false,
        });
        return;
      }

      const result = await this.profileService.checkUsernameAvailability(username);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if brand slug is available
   * GET /v1/profiles/check-brand-slug/:slug
   */
  checkBrandSlugAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { slug } = req.params;

      // Validate slug format
      const slugRegex = /^[a-z0-9-]{3,50}$/;
      if (!slugRegex.test(slug)) {
        res.status(400).json({
          success: false,
          message: 'Invalid brand URL format',
          available: false,
        });
        return;
      }

      const result = await this.profileService.checkBrandSlugAvailability(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
