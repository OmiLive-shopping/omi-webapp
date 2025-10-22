import { unifiedResponse } from 'uni-response';

import { ProfileRepository, UserProfileData } from '../repositories/profile.repository.js';

export class ProfileService {
  private profileRepository: ProfileRepository;

  constructor(profileRepository: ProfileRepository) {
    this.profileRepository = profileRepository;
  }

  /**
   * Get public user profile by username
   */
  async getUserProfile(
    username: string,
    viewerId?: string,
  ): Promise<{
    success: boolean;
    data?: UserProfileData;
    message?: string;
  }> {
    try {
      const profile = await this.profileRepository.getUserProfileByUsername(username, viewerId);

      if (!profile) {
        return {
          success: false,
          message: 'User profile not found',
        };
      }

      // Determine what data to include based on privacy settings
      const isOwner = viewerId === profile.id;
      const includePrivateData = isOwner || profile.publicProfile;

      // If profile is private and viewer is not owner, limit data
      if (!includePrivateData) {
        // Return limited public data for private profiles
        return {
          success: true,
          data: {
            id: profile.id,
            username: profile.username,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            location: null,
            socialLinks: null,
            publicProfile: false,
            createdAt: profile.createdAt,
            role: profile.role,
            verified: profile.verified,
            _count: {
              followers: profile._count?.followers || 0,
              following: 0,
              streams: 0,
            },
            isFollowing: profile.isFollowing,
          },
        };
      }

      // For public profiles or owner, get full data
      const fullProfile = await this.profileRepository.getUserProfileByUsername(
        username,
        viewerId,
        includePrivateData,
      );

      if (!fullProfile) {
        throw new Error('Failed to fetch full profile data');
      }

      return {
        success: true,
        data: fullProfile,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        message: 'Failed to fetch user profile',
      };
    }
  }

  /**
   * Get brand profile by slug
   */
  async getBrandProfile(slug: string): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      const profile = await this.profileRepository.getBrandProfileBySlug(slug);

      if (!profile) {
        return {
          success: false,
          message: 'Brand profile not found',
        };
      }

      // Only show approved brands publicly
      if (profile.approvalStatus !== 'approved' && !profile.verified) {
        return {
          success: false,
          message: 'Brand profile is not available',
        };
      }

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      console.error('Error fetching brand profile:', error);
      return {
        success: false,
        message: 'Failed to fetch brand profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: {
      name?: string;
      bio?: string;
      location?: string;
      socialLinks?: any;
      publicProfile?: boolean;
      avatarUrl?: string;
    },
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      // Validate social links structure if provided
      if (updateData.socialLinks) {
        const validPlatforms = [
          'twitter',
          'instagram',
          'linkedin',
          'youtube',
          'twitch',
          'tiktok',
          'facebook',
          'github',
          'website',
        ];

        const socialLinks = updateData.socialLinks;

        // Ensure it's an object
        if (typeof socialLinks !== 'object' || Array.isArray(socialLinks)) {
          return {
            success: false,
            message: 'Social links must be an object',
          };
        }

        // Validate each platform
        for (const [platform, url] of Object.entries(socialLinks)) {
          if (!validPlatforms.includes(platform)) {
            return {
              success: false,
              message: `Invalid social platform: ${platform}`,
            };
          }

          // Basic URL validation
          if (url && typeof url === 'string' && url.length > 0) {
            try {
              new URL(url);
            } catch {
              return {
                success: false,
                message: `Invalid URL for ${platform}`,
              };
            }
          }
        }
      }

      const updated = await this.profileRepository.updateUserProfile(userId, updateData);

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        message: 'Failed to update user profile',
      };
    }
  }

  /**
   * Update brand profile
   */
  async updateBrandProfile(
    brandId: string,
    userId: string,
    updateData: {
      companyDescription?: string;
      location?: string;
      socialLinks?: any;
      logoUrl?: string;
      coverImageUrl?: string;
      slug?: string;
    },
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      // TODO: Add slug field to Brand model in Prisma schema
      // Check if slug is being updated and is unique
      // if (updateData.slug) {
      //   const slugExists = await this.profileRepository.checkBrandSlugExists(updateData.slug);
      //   if (slugExists) {
      //     return {
      //       success: false,
      //       message: 'This brand URL is already taken',
      //     };
      //   }

      //   // Validate slug format
      //   const slugRegex = /^[a-z0-9-]+$/;
      //   if (!slugRegex.test(updateData.slug)) {
      //     return {
      //       success: false,
      //       message: 'Brand URL can only contain lowercase letters, numbers, and hyphens',
      //     };
      //   }
      // }

      // Validate social links if provided
      if (updateData.socialLinks) {
        const validPlatforms = [
          'twitter',
          'instagram',
          'linkedin',
          'youtube',
          'facebook',
          'website',
        ];

        const socialLinks = updateData.socialLinks;

        if (typeof socialLinks !== 'object' || Array.isArray(socialLinks)) {
          return {
            success: false,
            message: 'Social links must be an object',
          };
        }

        for (const [platform, url] of Object.entries(socialLinks)) {
          if (!validPlatforms.includes(platform)) {
            return {
              success: false,
              message: `Invalid social platform: ${platform}`,
            };
          }

          if (url && typeof url === 'string' && url.length > 0) {
            try {
              new URL(url);
            } catch {
              return {
                success: false,
                message: `Invalid URL for ${platform}`,
              };
            }
          }
        }
      }

      const updated = await this.profileRepository.updateBrandProfile(brandId, updateData);

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      console.error('Error updating brand profile:', error);
      return {
        success: false,
        message: 'Failed to update brand profile',
      };
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<{
    success: boolean;
    available: boolean;
  }> {
    try {
      const exists = await this.profileRepository.checkUsernameExists(username);
      return {
        success: true,
        available: !exists,
      };
    } catch (error) {
      console.error('Error checking username:', error);
      return {
        success: false,
        available: false,
      };
    }
  }

  /**
   * Check if brand slug is available
   */
  async checkBrandSlugAvailability(slug: string): Promise<{
    success: boolean;
    available: boolean;
  }> {
    try {
      const exists = await this.profileRepository.checkBrandSlugExists(slug);
      return {
        success: true,
        available: !exists,
      };
    } catch (error) {
      console.error('Error checking brand slug:', error);
      return {
        success: false,
        available: false,
      };
    }
  }
}
