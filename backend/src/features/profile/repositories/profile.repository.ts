import { Prisma, PrismaClient, Product, Stream } from '@prisma/client';

export interface UserProfileData {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  // TODO: Add these fields to User model in Prisma schema
  location?: string | null;
  socialLinks?: Prisma.JsonValue;
  publicProfile?: boolean;
  createdAt: Date;
  role: string;
  verified?: boolean;
  _count?: {
    followers: number;
    following: number;
    streams: number;
  };
  streams?: Stream[];
  wishlist?: Product[];
  isFollowing?: boolean;
}

export class ProfileRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get user profile by username
   */
  async getUserProfileByUsername(
    username: string,
    viewerId?: string,
    includePrivateData = false,
  ): Promise<UserProfileData | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        // TODO: Add these fields to User model in Prisma schema
        // location: true,
        // socialLinks: true,
        // publicProfile: true,
        createdAt: true,
        role: true,
        brand: {
          select: {
            verified: true,
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
            streams: true,
          },
        },
        // Include streams if profile is public or viewer is the owner
        streams: includePrivateData
          ? {
              where: {
                status: 'ended',
              },
              orderBy: {
                endedAt: 'desc',
              },
              take: 10,
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                viewerCount: true,
                startedAt: true,
                endedAt: true,
                status: true,
                tags: true,
              },
            }
          : false,
        // Include wishlist if profile is public or viewer is the owner
        wishlist: includePrivateData
          ? {
              where: {
                active: true,
                public: true,
              },
              take: 12,
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                originalPrice: true,
                imageUrl: true,
                url: true,
                tags: true,
                rating: true,
              },
            }
          : false,
      },
    });

    if (!user) {
      return null;
    }

    // Check if viewer is following this user
    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      const followRelation = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!followRelation;
    }

    return {
      ...user,
      verified: user.brand?.verified || false,
      isFollowing,
    };
  }

  /**
   * Get brand profile by slug
   * TODO: Add slug field to Brand model in Prisma schema
   */
  // async getBrandProfileBySlug(slug: string) {
  //   return await this.prisma.brand.findUnique({
  //     where: { slug },
  //     include: {
  //       user: {
  //         select: {
  //           id: true,
  //           username: true,
  //           avatarUrl: true,
  //           _count: {
  //             select: {
  //               followers: true,
  //             },
  //           },
  //         },
  //       },
  //       products: {
  //         where: {
  //           active: true,
  //           public: true,
  //           approvalStatus: 'approved',
  //         },
  //         orderBy: {
  //           createdAt: 'desc',
  //         },
  //         take: 12,
  //         select: {
  //           id: true,
  //           name: true,
  //           description: true,
  //           price: true,
  //           originalPrice: true,
  //           imageUrl: true,
  //           images: true,
  //           url: true,
  //           tags: true,
  //           rating: true,
  //           reviewCount: true,
  //           inStock: true,
  //         },
  //       },
  //       _count: {
  //         select: {
  //           products: {
  //             where: {
  //               active: true,
  //               public: true,
  //               approvalStatus: 'approved',
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });
  // }

  /**
   * Check if a username exists
   */
  async checkUsernameExists(username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Check if a brand slug exists
   * TODO: Add slug field to Brand model in Prisma schema
   */
  // async checkBrandSlugExists(slug: string): Promise<boolean> {
  //   const brand = await this.prisma.brand.findUnique({
  //     where: { slug },
  //     select: { id: true },
  //   });
  //   return !!brand;
  // }

  /**
   * Update user profile fields
   */
  async updateUserProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      location?: string;
      socialLinks?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      publicProfile?: boolean;
      avatarUrl?: string;
    },
  ) {
    return await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        // TODO: Add these fields to User model in Prisma schema
        // location: true,
        // socialLinks: true,
        // publicProfile: true,
        avatarUrl: true,
      },
    });
  }

  /**
   * Update brand profile fields
   */
  async updateBrandProfile(
    brandId: string,
    data: {
      companyDescription?: string;
      location?: string;
      socialLinks?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      logoUrl?: string;
      coverImageUrl?: string;
      slug?: string;
    },
  ) {
    return await this.prisma.brand.update({
      where: { id: brandId },
      data,
    });
  }
}
