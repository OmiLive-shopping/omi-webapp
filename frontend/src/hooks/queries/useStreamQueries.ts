import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

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
      const params = filter === 'live' ? '?isLive=true' : '';
      const { data } = await axios.get(`${API_URL}/v1/streams${params}`);
      // The backend returns { success, message, data: [...] }
      return data.data || data || [];
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
      const { data } = await axios.get(`${API_URL}/v1/streams/${streamId}`);
      // The backend returns { success, message, data: {...} }
      return data.data || data || null;
    },
    enabled: !!streamId,
    refetchInterval: 5000, // Refetch every 5 seconds for live stream
  });
};

// Create new stream
export const useCreateStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamData: { title: string; description?: string }) => {
      const { data } = await axios.post<Stream>(`${API_URL}/v1/streams`, streamData);
      return data;
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
      const response = await axios.patch<Stream>(`${API_URL}/v1/streams/${streamId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['stream', data.id] });
    },
  });
};

// End stream
export const useEndStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { data } = await axios.post(`${API_URL}/v1/streams/${streamId}/end`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
};