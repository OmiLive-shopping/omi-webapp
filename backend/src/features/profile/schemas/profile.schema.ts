import { z } from 'zod';

// Social links validation schema
export const socialLinksSchema = z
  .record(
    z.enum([
      'twitter',
      'instagram',
      'linkedin',
      'youtube',
      'twitch',
      'tiktok',
      'facebook',
      'github',
      'website',
    ]),
    z.string().url().or(z.string().length(0)),
  )
  .optional();

// Update user profile schema
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  socialLinks: socialLinksSchema,
  publicProfile: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
});

// Create brand profile schema
export const createBrandProfileSchema = z.object({
  userId: z.string().min(1),
  companyName: z.string().min(1).max(200),
  businessEmail: z.string().email(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Brand URL can only contain lowercase letters, numbers, and hyphens',
    })
    .optional(),
  companyDescription: z.string().max(1000).optional(),
  websiteUrl: z.string().url().optional(),
  businessPhone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  socialLinks: z
    .record(
      z.enum(['twitter', 'instagram', 'linkedin', 'youtube', 'facebook', 'website']),
      z.string().url().or(z.string().length(0)),
    )
    .optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  verified: z.boolean().optional(),
});

// Update brand profile schema
export const updateBrandProfileSchema = z.object({
  brandId: z.string().uuid(), // Required for identifying the brand
  companyDescription: z.string().max(1000).optional(),
  location: z.string().max(100).optional(),
  socialLinks: z
    .record(
      z.enum(['twitter', 'instagram', 'linkedin', 'youtube', 'facebook', 'website']),
      z.string().url().or(z.string().length(0)),
    )
    .optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Brand URL can only contain lowercase letters, numbers, and hyphens',
    })
    .optional(),
});

// Username validation schema
export const usernameParamSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores',
    }),
});

// Brand slug validation schema
export const brandSlugParamSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Brand URL can only contain lowercase letters, numbers, and hyphens',
    }),
});

// Export types
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateBrandProfileInput = z.infer<typeof createBrandProfileSchema>;
export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileSchema>;
export type UsernameParam = z.infer<typeof usernameParamSchema>;
export type BrandSlugParam = z.infer<typeof brandSlugParamSchema>;
