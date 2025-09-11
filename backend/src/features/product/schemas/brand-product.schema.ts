import { z } from 'zod';

// Brand product creation schema - includes all fields brands should control
export const createBrandProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Product name is required' })
    .max(200, { message: 'Product name must not exceed 200 characters' }),
  
  // Images
  imageUrl: z.string().url({ message: 'Invalid image URL format' }).optional().nullable(),
  images: z
    .array(z.string().url({ message: 'Invalid image URL format' }))
    .max(10, { message: 'Maximum 10 images allowed' })
    .optional()
    .default([]),
  
  description: z
    .string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .optional()
    .nullable(),
  
  // Pricing
  price: z
    .number()
    .min(0, { message: 'Price must be 0 or greater' })
    .max(999999.99, { message: 'Price cannot exceed $999,999.99' }),
  originalPrice: z
    .number()
    .min(0, { message: 'Original price must be 0 or greater' })
    .max(999999.99, { message: 'Original price cannot exceed $999,999.99' })
    .optional()
    .nullable(),
  
  // Coupons
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
  
  // External link
  url: z.string().url({ message: 'Invalid URL format' }).optional().nullable(),
  
  // Visibility and status
  public: z.boolean().optional().default(true),
  active: z.boolean().optional().default(true),
  
  // Inventory
  inStock: z.boolean().optional().default(true),
  stockCount: z
    .number()
    .int()
    .min(0, { message: 'Stock count must be 0 or greater' })
    .optional()
    .nullable(),
  
  // Marketing
  featured: z.boolean().optional().default(false),
  
  // Categorization
  categoryId: z.string().uuid({ message: 'Invalid category ID format' }).optional().nullable(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, { message: 'Maximum 20 tags allowed' })
    .optional()
    .default([]),
});

// Brand product update schema - all fields optional
export const updateBrandProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Product name cannot be empty' })
    .max(200, { message: 'Product name must not exceed 200 characters' })
    .optional(),
  
  // Images
  imageUrl: z.string().url({ message: 'Invalid image URL format' }).optional().nullable(),
  images: z
    .array(z.string().url({ message: 'Invalid image URL format' }))
    .max(10, { message: 'Maximum 10 images allowed' })
    .optional(),
  
  description: z
    .string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .optional()
    .nullable(),
  
  // Pricing
  price: z
    .number()
    .min(0, { message: 'Price must be 0 or greater' })
    .max(999999.99, { message: 'Price cannot exceed $999,999.99' })
    .optional(),
  originalPrice: z
    .number()
    .min(0, { message: 'Original price must be 0 or greater' })
    .max(999999.99, { message: 'Original price cannot exceed $999,999.99' })
    .optional()
    .nullable(),
  
  // Coupons
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
  
  // External link
  url: z.string().url({ message: 'Invalid URL format' }).optional().nullable(),
  
  // Visibility and status
  public: z.boolean().optional(),
  active: z.boolean().optional(),
  
  // Inventory
  inStock: z.boolean().optional(),
  stockCount: z
    .number()
    .int()
    .min(0, { message: 'Stock count must be 0 or greater' })
    .optional()
    .nullable(),
  
  // Marketing
  featured: z.boolean().optional(),
  
  // Categorization
  categoryId: z.string().uuid({ message: 'Invalid category ID format' }).optional().nullable(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, { message: 'Maximum 20 tags allowed' })
    .optional(),
});

// Brand product filters schema - extends basic filtering with brand-specific needs
export const brandProductFiltersSchema = z.object({
  // Basic filters
  public: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  active: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  search: z.string().optional(),
  
  // Inventory filters
  inStock: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  lowStock: z
    .string()
    .transform(val => val === 'true')
    .optional(), // For products with stockCount < 10
  
  // Marketing filters
  featured: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  hasActiveCoupon: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  
  // Category and tags
  categoryId: z.string().uuid().optional(),
  tags: z
    .string()
    .transform(val => val.split(',').filter(Boolean))
    .optional(),
  
  // Price filtering
  minPrice: z
    .string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(0))
    .optional(),
  maxPrice: z
    .string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(0))
    .optional(),
  
  // Approval status (for brands to see their own pending/approved products)
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  
  // Pagination and sorting
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  sortBy: z.enum(['price', 'name', 'createdAt', 'updatedAt', 'stockCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Type exports for use in controllers/services
export type CreateBrandProductData = z.infer<typeof createBrandProductSchema>;
export type UpdateBrandProductData = z.infer<typeof updateBrandProductSchema>;
export type BrandProductFilters = z.infer<typeof brandProductFiltersSchema>;
