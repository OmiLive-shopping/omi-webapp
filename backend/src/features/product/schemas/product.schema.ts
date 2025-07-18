import { z } from 'zod';

// Create product schema
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Product name is required' })
    .max(200, { message: 'Product name must not exceed 200 characters' }),
  imageUrl: z.string().url({ message: 'Invalid image URL format' }).optional().nullable(),
  description: z
    .string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .optional()
    .nullable(),
  couponCode: z
    .string()
    .max(50, { message: 'Coupon code must not exceed 50 characters' })
    .optional()
    .nullable(),
  couponExpiration: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable()
    .refine(
      date => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: 'Coupon expiration must be in the future' },
    ),
  url: z.string().url({ message: 'Invalid URL format' }).optional().nullable(),
  public: z.boolean().optional().default(true),
  active: z.boolean().optional().default(true),
});

// Update product schema
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Product name cannot be empty' })
    .max(200, { message: 'Product name must not exceed 200 characters' })
    .optional(),
  imageUrl: z.string().url({ message: 'Invalid image URL format' }).optional().nullable(),
  description: z
    .string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .optional()
    .nullable(),
  couponCode: z
    .string()
    .max(50, { message: 'Coupon code must not exceed 50 characters' })
    .optional()
    .nullable(),
  couponExpiration: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable()
    .refine(
      date => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: 'Coupon expiration must be in the future' },
    ),
  url: z.string().url({ message: 'Invalid URL format' }).optional().nullable(),
  public: z.boolean().optional(),
  active: z.boolean().optional(),
});

// Product filters schema
export const productFiltersSchema = z.object({
  public: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  active: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  search: z.string().optional(),
  hasActiveCoupon: z
    .string()
    .transform(val => val === 'true')
    .optional(),
});

// Wishlist schema
export const wishlistSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product ID format' }),
});
