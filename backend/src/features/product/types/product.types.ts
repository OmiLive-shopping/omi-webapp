export interface CreateProductInput {
  name: string;
  imageUrl?: string;
  images?: string[];
  description?: string;
  price?: number;
  originalPrice?: number;
  couponCode?: string;
  couponExpiration?: string | Date;
  url?: string;
  public?: boolean;
  active?: boolean;
  inStock?: boolean;
  stockCount?: number;
  featured?: boolean;
  categoryId?: string;
  tags?: string[];
}

export interface UpdateProductInput {
  name?: string;
  imageUrl?: string;
  images?: string[];
  description?: string;
  price?: number;
  originalPrice?: number;
  couponCode?: string;
  couponExpiration?: string | Date | null;
  url?: string;
  public?: boolean;
  active?: boolean;
  inStock?: boolean;
  stockCount?: number;
  featured?: boolean;
  categoryId?: string;
  tags?: string[];
}

export interface ProductFilters {
  public?: boolean;
  active?: boolean;
  search?: string;
  hasActiveCoupon?: boolean;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'name' | 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface WishlistInput {
  productId: string;
}
