export interface CreateProductInput {
  name: string;
  imageUrl?: string;
  description?: string;
  couponCode?: string;
  couponExpiration?: string | Date;
  url?: string;
  public?: boolean;
  active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  imageUrl?: string;
  description?: string;
  couponCode?: string;
  couponExpiration?: string | Date | null;
  url?: string;
  public?: boolean;
  active?: boolean;
}

export interface ProductFilters {
  public?: boolean;
  active?: boolean;
  search?: string;
  hasActiveCoupon?: boolean;
}

export interface WishlistInput {
  productId: string;
}
