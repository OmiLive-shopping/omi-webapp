import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS, PaginatedResponse, ApiResponse } from '@/lib/api';
import { queryKeys, queryUtils } from '@/lib/query-client';
import { StreamInfo, StreamStats, Viewer } from '@/stores/stream-store';
import { useStreamStore } from '@/stores/stream-store';

// Types
export interface StreamListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  isLive?: boolean;
  sortBy?: 'viewers' | 'newest' | 'oldest';
}

export interface StreamStartData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl?: string;
  scheduledFor?: string;
}

// Query hooks
export function useStreamList(params?: StreamListParams) {
  return useQuery({
    queryKey: queryKeys.streamList(params),
    queryFn: () => apiClient.get<PaginatedResponse<StreamInfo>>(
      API_ENDPOINTS.streams.list,
      { params }
    ),
    staleTime: 10 * 1000, // Consider fresh for 10 seconds
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });
}

export function useStreamDetail(streamId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.streamDetail(streamId),
    queryFn: () => apiClient.get<ApiResponse<StreamInfo>>(
      API_ENDPOINTS.streams.detail(streamId)
    ),
    enabled: enabled && !!streamId,
    staleTime: 30 * 1000,
  });
}

export function useStreamStats(streamId: string, refetchInterval?: number) {
  return useQuery({
    queryKey: queryKeys.streamStats(streamId),
    queryFn: () => apiClient.get<ApiResponse<StreamStats>>(
      API_ENDPOINTS.streams.stats(streamId)
    ),
    enabled: !!streamId,
    refetchInterval: refetchInterval || 5000, // Refetch every 5 seconds by default
    staleTime: 0, // Always consider stale (real-time data)
  });
}

export function useStreamViewers(streamId: string, refetchInterval?: number) {
  return useQuery({
    queryKey: queryKeys.streamViewers(streamId),
    queryFn: () => apiClient.get<ApiResponse<Viewer[]>>(
      API_ENDPOINTS.streams.viewers(streamId)
    ),
    enabled: !!streamId,
    refetchInterval: refetchInterval || 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });
}

// Mutation hooks
export function useStreamStart() {
  const queryClient = useQueryClient();
  const { goLive } = useStreamStore();

  return useMutation({
    mutationFn: (data: StreamStartData) => 
      apiClient.post<ApiResponse<StreamInfo>>(API_ENDPOINTS.streams.start, data),
    
    onSuccess: (response) => {
      const stream = response.data;
      
      // Update local state
      goLive(stream);
      
      // Invalidate stream list
      queryUtils.invalidateQueries(queryKeys.streamList());
      
      // Set the stream detail in cache
      queryUtils.setQueryData(
        queryKeys.streamDetail(stream.id),
        { data: stream }
      );
    },
    
    onError: (error) => {
      console.error('Failed to start stream:', error);
    },
  });
}

export function useStreamEnd() {
  const queryClient = useQueryClient();
  const { currentStream, endStream } = useStreamStore();

  return useMutation({
    mutationFn: (streamId: string) => 
      apiClient.post<ApiResponse<void>>(API_ENDPOINTS.streams.end(streamId)),
    
    onMutate: async (streamId) => {
      // Cancel any outgoing refetches
      await queryUtils.cancelQueries(queryKeys.streamDetail(streamId));
      await queryUtils.cancelQueries(queryKeys.streamStats(streamId));
      
      // Optimistically update the stream status
      const previousStream = queryUtils.getQueryData<ApiResponse<StreamInfo>>(
        queryKeys.streamDetail(streamId)
      );
      
      if (previousStream?.data) {
        queryUtils.setQueryData(
          queryKeys.streamDetail(streamId),
          {
            ...previousStream,
            data: {
              ...previousStream.data,
              status: 'ended',
            },
          }
        );
      }
      
      return { previousStream };
    },
    
    onSuccess: () => {
      // Update local state
      endStream();
      
      // Invalidate queries
      if (currentStream?.id) {
        queryUtils.invalidateQueries(queryKeys.streamDetail(currentStream.id));
        queryUtils.invalidateQueries(queryKeys.streamStats(currentStream.id));
        queryUtils.invalidateQueries(queryKeys.streamViewers(currentStream.id));
      }
      queryUtils.invalidateQueries(queryKeys.streamList());
    },
    
    onError: (error, streamId, context) => {
      // Revert optimistic update on error
      if (context?.previousStream) {
        queryUtils.setQueryData(
          queryKeys.streamDetail(streamId),
          context.previousStream
        );
      }
      console.error('Failed to end stream:', error);
    },
  });
}

export function useStreamUpdate() {
  const queryClient = useQueryClient();
  const { updateStreamInfo } = useStreamStore();

  return useMutation({
    mutationFn: ({ streamId, data }: { streamId: string; data: Partial<StreamInfo> }) =>
      apiClient.patch<ApiResponse<StreamInfo>>(
        API_ENDPOINTS.streams.detail(streamId),
        data
      ),
    
    onMutate: async ({ streamId, data }) => {
      // Cancel any outgoing refetches
      await queryUtils.cancelQueries(queryKeys.streamDetail(streamId));
      
      // Snapshot the previous value
      const previousStream = queryUtils.getQueryData<ApiResponse<StreamInfo>>(
        queryKeys.streamDetail(streamId)
      );
      
      // Optimistically update
      if (previousStream?.data) {
        queryUtils.setQueryData(
          queryKeys.streamDetail(streamId),
          {
            ...previousStream,
            data: {
              ...previousStream.data,
              ...data,
            },
          }
        );
      }
      
      // Update local state
      updateStreamInfo(data);
      
      return { previousStream };
    },
    
    onSuccess: (response, { streamId }) => {
      // Update cache with server response
      queryUtils.setQueryData(
        queryKeys.streamDetail(streamId),
        response
      );
      
      // Invalidate list to reflect changes
      queryUtils.invalidateQueries(queryKeys.streamList());
    },
    
    onError: (error, { streamId }, context) => {
      // Revert optimistic update
      if (context?.previousStream) {
        queryUtils.setQueryData(
          queryKeys.streamDetail(streamId),
          context.previousStream
        );
      }
      console.error('Failed to update stream:', error);
    },
  });
}