import { QueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';

// Default error handler
const defaultErrorHandler = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An error occurred';
  
  // Show error toast using UI store
  useUIStore.getState().showToast({
    type: 'error',
    message,
    duration: 5000,
  });
  
  console.error('Query error:', error);
};

// Create and configure QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes('401') || message.includes('403') || message.includes('404')) {
            return false;
          }
        }
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus
      refetchOnWindowFocus: true,
      
      // Don't refetch on reconnect by default
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Global error handler for mutations
      onError: defaultErrorHandler,
      
      // Retry mutations once
      retry: 1,
      
      // Retry delay
      retryDelay: 1000,
    },
  },
});

// Query key factories for consistent key generation
export const queryKeys = {
  all: ['api'] as const,
  
  // Streams
  streams: () => [...queryKeys.all, 'streams'] as const,
  streamList: (filters?: Record<string, any>) => 
    [...queryKeys.streams(), 'list', filters] as const,
  streamDetail: (id: string) => 
    [...queryKeys.streams(), 'detail', id] as const,
  streamStats: (id: string) => 
    [...queryKeys.streams(), 'stats', id] as const,
  streamViewers: (id: string) => 
    [...queryKeys.streams(), 'viewers', id] as const,
  
  // Products
  products: () => [...queryKeys.all, 'products'] as const,
  productList: (filters?: Record<string, any>) => 
    [...queryKeys.products(), 'list', filters] as const,
  productDetail: (id: string) => 
    [...queryKeys.products(), 'detail', id] as const,
  productRecommendations: (id: string) => 
    [...queryKeys.products(), 'recommendations', id] as const,
  
  // Users
  users: () => [...queryKeys.all, 'users'] as const,
  userList: (filters?: Record<string, any>) => 
    [...queryKeys.users(), 'list', filters] as const,
  userDetail: (id: string) => 
    [...queryKeys.users(), 'detail', id] as const,
  userProfile: () => 
    [...queryKeys.users(), 'profile'] as const,
  
  // Chat
  chat: () => [...queryKeys.all, 'chat'] as const,
  chatMessages: (streamId: string, filters?: Record<string, any>) => 
    [...queryKeys.chat(), 'messages', streamId, filters] as const,
  chatEmotes: () => 
    [...queryKeys.chat(), 'emotes'] as const,
  chatModerators: (streamId: string) => 
    [...queryKeys.chat(), 'moderators', streamId] as const,
  
  // Wishlist
  wishlist: () => [...queryKeys.all, 'wishlist'] as const,
  
  // Cart
  cart: () => [...queryKeys.all, 'cart'] as const,
  
  // Coupons
  coupons: () => [...queryKeys.all, 'coupons'] as const,
  couponValidate: (code: string) => 
    [...queryKeys.coupons(), 'validate', code] as const,
};

// Mutation key factories
export const mutationKeys = {
  // Stream mutations
  streamStart: () => ['stream', 'start'] as const,
  streamEnd: () => ['stream', 'end'] as const,
  streamUpdate: (id: string) => ['stream', 'update', id] as const,
  
  // Product mutations
  productCreate: () => ['product', 'create'] as const,
  productUpdate: (id: string) => ['product', 'update', id] as const,
  productDelete: (id: string) => ['product', 'delete', id] as const,
  
  // Cart mutations
  cartAdd: () => ['cart', 'add'] as const,
  cartUpdate: () => ['cart', 'update'] as const,
  cartRemove: () => ['cart', 'remove'] as const,
  cartClear: () => ['cart', 'clear'] as const,
  
  // Wishlist mutations
  wishlistAdd: () => ['wishlist', 'add'] as const,
  wishlistRemove: () => ['wishlist', 'remove'] as const,
  wishlistClear: () => ['wishlist', 'clear'] as const,
  
  // Chat mutations
  chatSendMessage: () => ['chat', 'send'] as const,
  chatDeleteMessage: () => ['chat', 'delete'] as const,
  chatModerate: () => ['chat', 'moderate'] as const,
};

// Utility functions for cache management
export const queryUtils = {
  // Invalidate and refetch queries
  invalidateQueries: (keys: readonly unknown[]) => {
    return queryClient.invalidateQueries({ queryKey: keys });
  },
  
  // Set query data optimistically
  setQueryData: <T>(keys: readonly unknown[], data: T) => {
    return queryClient.setQueryData(keys, data);
  },
  
  // Get cached query data
  getQueryData: <T>(keys: readonly unknown[]) => {
    return queryClient.getQueryData<T>(keys);
  },
  
  // Cancel queries
  cancelQueries: (keys: readonly unknown[]) => {
    return queryClient.cancelQueries({ queryKey: keys });
  },
  
  // Prefetch query
  prefetchQuery: (options: any) => {
    return queryClient.prefetchQuery(options);
  },
};