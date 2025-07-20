import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS, PaginatedResponse, ApiResponse } from '@/lib/api-client';
import { queryKeys, queryUtils } from '@/lib/query-client';
import { Product, useProductStore } from '@/stores/product-store';

// Types
export interface ProductListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'name' | 'newest' | 'rating';
}

export interface ProductCreateData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  tags: string[];
  inStock: boolean;
  stockCount?: number;
  featured: boolean;
}

// Query hooks
export function useProductList(params?: ProductListParams) {
  return useQuery({
    queryKey: queryKeys.productList(params),
    queryFn: () => apiClient.get<PaginatedResponse<Product>>(
      API_ENDPOINTS.products.list,
      { params }
    ),
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useProductDetail(productId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.productDetail(productId),
    queryFn: () => apiClient.get<ApiResponse<Product>>(
      API_ENDPOINTS.products.detail(productId)
    ),
    enabled: enabled && !!productId,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
  });
}

export function useProductRecommendations(productId: string, limit = 4) {
  return useQuery({
    queryKey: queryKeys.productRecommendations(productId),
    queryFn: () => apiClient.get<ApiResponse<Product[]>>(
      API_ENDPOINTS.products.recommendations(productId),
      { params: { limit } }
    ),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Mutation hooks
export function useProductCreate() {
  const queryClient = useQueryClient();
  const { addProduct } = useProductStore();

  return useMutation({
    mutationFn: (data: ProductCreateData) =>
      apiClient.post<ApiResponse<Product>>(API_ENDPOINTS.products.create, data),
    
    onSuccess: (response) => {
      const product = response.data;
      
      // Update local store
      addProduct(product);
      
      // Invalidate product list
      queryUtils.invalidateQueries(queryKeys.productList());
      
      // Add to cache
      queryUtils.setQueryData(
        queryKeys.productDetail(product.id),
        response
      );
    },
  });
}

export function useProductUpdate() {
  const queryClient = useQueryClient();
  const { updateProduct } = useProductStore();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<Product> }) =>
      apiClient.patch<ApiResponse<Product>>(
        API_ENDPOINTS.products.update(productId),
        data
      ),
    
    onMutate: async ({ productId, data }) => {
      // Cancel any outgoing refetches
      await queryUtils.cancelQueries(queryKeys.productDetail(productId));
      
      // Snapshot the previous value
      const previousProduct = queryUtils.getQueryData<ApiResponse<Product>>(
        queryKeys.productDetail(productId)
      );
      
      // Optimistically update
      if (previousProduct?.data) {
        const updatedProduct = {
          ...previousProduct,
          data: {
            ...previousProduct.data,
            ...data,
            updatedAt: new Date(),
          },
        };
        
        queryUtils.setQueryData(
          queryKeys.productDetail(productId),
          updatedProduct
        );
        
        // Update local store
        updateProduct(productId, data);
      }
      
      return { previousProduct };
    },
    
    onError: (error, { productId }, context) => {
      // Revert optimistic update
      if (context?.previousProduct) {
        queryUtils.setQueryData(
          queryKeys.productDetail(productId),
          context.previousProduct
        );
      }
    },
    
    onSuccess: (response, { productId }) => {
      // Update with server response
      queryUtils.setQueryData(
        queryKeys.productDetail(productId),
        response
      );
      
      // Invalidate lists and recommendations
      queryUtils.invalidateQueries(queryKeys.productList());
      queryUtils.invalidateQueries(queryKeys.productRecommendations(productId));
    },
  });
}

export function useProductDelete() {
  const queryClient = useQueryClient();
  const { removeProduct } = useProductStore();

  return useMutation({
    mutationFn: (productId: string) =>
      apiClient.delete<ApiResponse<void>>(
        API_ENDPOINTS.products.delete(productId)
      ),
    
    onMutate: async (productId) => {
      // Cancel any outgoing refetches
      await queryUtils.cancelQueries(queryKeys.productDetail(productId));
      
      // Remove from local store optimistically
      removeProduct(productId);
      
      return { productId };
    },
    
    onSuccess: (_, productId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: queryKeys.productDetail(productId),
      });
      
      // Invalidate lists
      queryUtils.invalidateQueries(queryKeys.productList());
    },
    
    onError: (error, productId) => {
      // Re-fetch to restore state
      queryUtils.invalidateQueries(queryKeys.productDetail(productId));
      queryUtils.invalidateQueries(queryKeys.productList());
    },
  });
}

// Cart mutations with optimistic updates
export function useCartAdd() {
  const queryClient = useQueryClient();
  const { addToCart } = useProductStore();

  return useMutation({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) =>
      apiClient.post<ApiResponse<void>>(API_ENDPOINTS.cart.add, {
        productId: product.id,
        quantity,
      }),
    
    onMutate: async ({ product, quantity }) => {
      // Optimistically update local store
      addToCart(product, quantity);
      
      // Cancel cart queries
      await queryUtils.cancelQueries(queryKeys.cart());
      
      return { product, quantity };
    },
    
    onError: (error, { product }) => {
      // Revert by re-fetching cart
      queryUtils.invalidateQueries(queryKeys.cart());
    },
    
    onSuccess: () => {
      // Refetch cart to sync with server
      queryUtils.invalidateQueries(queryKeys.cart());
    },
  });
}

export function useCartRemove() {
  const queryClient = useQueryClient();
  const { removeFromCart } = useProductStore();

  return useMutation({
    mutationFn: (productId: string) =>
      apiClient.post<ApiResponse<void>>(API_ENDPOINTS.cart.remove, { productId }),
    
    onMutate: async (productId) => {
      // Optimistically update local store
      removeFromCart(productId);
      
      // Cancel cart queries
      await queryUtils.cancelQueries(queryKeys.cart());
      
      return { productId };
    },
    
    onError: () => {
      // Revert by re-fetching cart
      queryUtils.invalidateQueries(queryKeys.cart());
    },
    
    onSuccess: () => {
      // Refetch cart to sync with server
      queryUtils.invalidateQueries(queryKeys.cart());
    },
  });
}

// Wishlist mutations
export function useWishlistAdd() {
  const queryClient = useQueryClient();
  const { addToWishlist } = useProductStore();

  return useMutation({
    mutationFn: (product: Product) =>
      apiClient.post<ApiResponse<void>>(API_ENDPOINTS.wishlist.add, {
        productId: product.id,
      }),
    
    onMutate: async (product) => {
      // Optimistically update local store
      addToWishlist(product);
      
      // Cancel wishlist queries
      await queryUtils.cancelQueries(queryKeys.wishlist());
      
      return { product };
    },
    
    onError: () => {
      // Revert by re-fetching wishlist
      queryUtils.invalidateQueries(queryKeys.wishlist());
    },
    
    onSuccess: () => {
      // Refetch wishlist to sync with server
      queryUtils.invalidateQueries(queryKeys.wishlist());
    },
  });
}

export function useWishlistRemove() {
  const queryClient = useQueryClient();
  const { removeFromWishlist } = useProductStore();

  return useMutation({
    mutationFn: (productId: string) =>
      apiClient.post<ApiResponse<void>>(API_ENDPOINTS.wishlist.remove, { productId }),
    
    onMutate: async (productId) => {
      // Optimistically update local store
      removeFromWishlist(productId);
      
      // Cancel wishlist queries
      await queryUtils.cancelQueries(queryKeys.wishlist());
      
      return { productId };
    },
    
    onError: () => {
      // Revert by re-fetching wishlist
      queryUtils.invalidateQueries(queryKeys.wishlist());
    },
    
    onSuccess: () => {
      // Refetch wishlist to sync with server
      queryUtils.invalidateQueries(queryKeys.wishlist());
    },
  });
}