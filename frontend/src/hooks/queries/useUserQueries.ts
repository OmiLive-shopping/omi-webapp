import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS, PaginatedResponse, ApiResponse } from '@/lib/api';
import { queryKeys, queryUtils } from '@/lib/query-client';
// TODO: Replace with Better Auth
// import { useAuthStore } from '@/stores/auth.store';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  role: 'viewer' | 'streamer' | 'moderator' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  isFollowing?: boolean;
  isSubscribed?: boolean;
  followerCount?: number;
  followingCount?: number;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  role?: string;
  search?: string;
  sortBy?: 'newest' | 'followers' | 'username';
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
}

// Query hooks
export function useUserList(params?: UserListParams) {
  return useQuery({
    queryKey: queryKeys.userList(params),
    queryFn: () => apiClient.get<PaginatedResponse<User>>(
      API_ENDPOINTS.users.list,
      { params }
    ),
    staleTime: 60 * 1000, // Consider fresh for 1 minute
  });
}

export function useUserDetail(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.userDetail(userId),
    queryFn: () => apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.users.detail(userId)
    ),
    enabled: enabled && !!userId,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
  });
}

export function useUserProfile() {
  // TODO: Replace with Better Auth
  // const { token } = useAuthStore();
  const token = null; // Temporary placeholder
  
  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: () => apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.users.profile
    ),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Mutation hooks
export function useUserUpdate() {
  // TODO: Replace with Better Auth
  // const { user } = useAuthStore();
  const user = null; // Temporary placeholder
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdateData }) =>
      apiClient.patch<ApiResponse<User>>(
        API_ENDPOINTS.users.update(userId),
        data
      ),
    
    onMutate: async ({ userId, data }) => {
      // Cancel any outgoing refetches
      await queryUtils.cancelQueries(queryKeys.userDetail(userId));
      
      // If updating current user, also cancel profile query
      if (user?.id === userId) {
        await queryUtils.cancelQueries(queryKeys.userProfile());
      }
      
      // Snapshot the previous value
      const previousUser = queryUtils.getQueryData<ApiResponse<User>>(
        queryKeys.userDetail(userId)
      );
      
      // Optimistically update
      if (previousUser?.data) {
        const updatedUser = {
          ...previousUser,
          data: {
            ...previousUser.data,
            ...data,
            updatedAt: new Date(),
          },
        };
        
        queryUtils.setQueryData(
          queryKeys.userDetail(userId),
          updatedUser
        );
        
        // Also update profile if it's the current user
        if (user?.id === userId) {
          queryUtils.setQueryData(
            queryKeys.userProfile(),
            updatedUser
          );
        }
      }
      
      return { previousUser, userId };
    },
    
    onError: (error, { userId }, context) => {
      // Revert optimistic update
      if (context?.previousUser) {
        queryUtils.setQueryData(
          queryKeys.userDetail(userId),
          context.previousUser
        );
        
        // Also revert profile if it's the current user
        if (user?.id === userId) {
          queryUtils.setQueryData(
            queryKeys.userProfile(),
            context.previousUser
          );
        }
      }
    },
    
    onSuccess: (response, { userId }) => {
      // Update with server response
      queryUtils.setQueryData(
        queryKeys.userDetail(userId),
        response
      );
      
      // Update profile if it's the current user
      if (user?.id === userId) {
        queryUtils.setQueryData(
          queryKeys.userProfile(),
          response
        );
      }
      
      // Invalidate user list
      queryUtils.invalidateQueries(queryKeys.userList());
    },
  });
}

// Follow/Unfollow mutations
export function useFollowUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<ApiResponse<void>>(`/users/${userId}/follow`),
    
    onMutate: async (userId) => {
      // Update the user detail optimistically
      const previousUser = queryUtils.getQueryData<ApiResponse<User>>(
        queryKeys.userDetail(userId)
      );
      
      if (previousUser?.data) {
        queryUtils.setQueryData(
          queryKeys.userDetail(userId),
          {
            ...previousUser,
            data: {
              ...previousUser.data,
              isFollowing: true,
              followerCount: (previousUser.data.followerCount || 0) + 1,
            },
          }
        );
      }
      
      return { previousUser, userId };
    },
    
    onError: (error, userId, context) => {
      // Revert optimistic update
      if (context?.previousUser) {
        queryUtils.setQueryData(
          queryKeys.userDetail(userId),
          context.previousUser
        );
      }
    },
    
    onSuccess: (_, userId) => {
      // Refetch to sync with server
      queryUtils.invalidateQueries(queryKeys.userDetail(userId));
    },
  });
}

export function useUnfollowUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete<ApiResponse<void>>(`/users/${userId}/follow`),
    
    onMutate: async (userId) => {
      // Update the user detail optimistically
      const previousUser = queryUtils.getQueryData<ApiResponse<User>>(
        queryKeys.userDetail(userId)
      );
      
      if (previousUser?.data) {
        queryUtils.setQueryData(
          queryKeys.userDetail(userId),
          {
            ...previousUser,
            data: {
              ...previousUser.data,
              isFollowing: false,
              followerCount: Math.max(0, (previousUser.data.followerCount || 1) - 1),
            },
          }
        );
      }
      
      return { previousUser, userId };
    },
    
    onError: (error, userId, context) => {
      // Revert optimistic update
      if (context?.previousUser) {
        queryUtils.setQueryData(
          queryKeys.userDetail(userId),
          context.previousUser
        );
      }
    },
    
    onSuccess: (_, userId) => {
      // Refetch to sync with server
      queryUtils.invalidateQueries(queryKeys.userDetail(userId));
    },
  });
}