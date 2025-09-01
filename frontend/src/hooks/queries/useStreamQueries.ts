import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Stream {
  id: string;
  title: string;
  description?: string;
  vdoRoomId: string;
  streamerId: string;
  streamer?: {
    id: string;
    username: string;
    email: string;
  };
  isLive: boolean;
  startedAt?: string;
  endedAt?: string;
  viewerCount: number;
  category?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch all streams
export const useStreams = (filter?: 'live' | 'all') => {
  return useQuery({
    queryKey: ['streams', filter],
    queryFn: async () => {
      const params = filter === 'live' ? { isLive: true } : {};
      const response = await apiClient.get<any>('/streams', { params });
      // The backend returns { success, message, data: [...] }
      return response.data || response || [];
    },
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });
};

// Fetch single stream by ID
export const useStream = (streamId: string | null) => {
  return useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      if (!streamId) return null;
      const response = await apiClient.get<any>(`/streams/${streamId}`);
      // The backend returns { success, message, data: {...} }
      return response.data || response || null;
    },
    enabled: !!streamId,
    refetchInterval: 5000, // Refetch every 5 seconds for live stream
  });
};

// Create new stream
export const useCreateStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamData: { title: string; description?: string; vdoRoomId?: string }) => {
      const response = await apiClient.post<any>('/streams', streamData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
};

// Update stream (go live, update title, etc.)
export const useUpdateStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      streamId, 
      data 
    }: { 
      streamId: string; 
      data: Partial<Stream> 
    }) => {
      const response = await apiClient.patch<any>(`/streams/${streamId}`, data);
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['stream', response.data?.id || response.id] });
    },
  });
};

// Go live with stream
export const useGoLive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const response = await apiClient.post<any>(`/streams/${streamId}/go-live`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
};

// End stream
export const useEndStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const response = await apiClient.post<any>(`/streams/${streamId}/end`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
};