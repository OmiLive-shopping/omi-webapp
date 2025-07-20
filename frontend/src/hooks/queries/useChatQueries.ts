import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS, PaginatedResponse, ApiResponse } from '@/lib/api-client';
import { queryKeys, queryUtils } from '@/lib/query-client';
import { ChatMessage, ChatEmote, useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';

// Types
export interface ChatMessageParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  type?: string;
}

export interface SendMessageData {
  content: string;
  replyTo?: string;
}

export interface ModerateUserData {
  userId: string;
  action: 'timeout' | 'ban' | 'unban';
  reason?: string;
  duration?: number; // For timeout in seconds
}

// Query hooks
export function useChatMessages(streamId: string, params?: ChatMessageParams) {
  const { addMessage } = useChatStore();
  
  return useQuery({
    queryKey: queryKeys.chatMessages(streamId, params),
    queryFn: () => apiClient.get<PaginatedResponse<ChatMessage>>(
      API_ENDPOINTS.chat.messages(streamId),
      { params }
    ),
    enabled: !!streamId,
    staleTime: 0, // Always consider stale (real-time data)
    refetchInterval: false, // Use websockets for real-time updates
    onSuccess: (data) => {
      // Add messages to local store
      data.data.forEach(message => {
        addMessage(message);
      });
    },
  });
}

export function useChatEmotes() {
  const { setEmotes } = useChatStore();
  
  return useQuery({
    queryKey: queryKeys.chatEmotes(),
    queryFn: () => apiClient.get<ApiResponse<ChatEmote[]>>(
      API_ENDPOINTS.chat.emotes
    ),
    staleTime: 24 * 60 * 60 * 1000, // Consider fresh for 24 hours
    onSuccess: (response) => {
      // Update local store with emotes
      setEmotes(response.data);
    },
  });
}

export function useChatModerators(streamId: string) {
  return useQuery({
    queryKey: queryKeys.chatModerators(streamId),
    queryFn: () => apiClient.get<ApiResponse<string[]>>(
      API_ENDPOINTS.chat.moderators(streamId)
    ),
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Mutation hooks
export function useSendMessage(streamId: string) {
  const queryClient = useQueryClient();
  const { addMessage, canUserSendMessage, recordUserMessage } = useChatStore();
  const { showToast } = useUIStore();
  const currentUserId = 'current-user'; // This should come from auth store

  return useMutation({
    mutationFn: (data: SendMessageData) =>
      apiClient.post<ApiResponse<ChatMessage>>(
        API_ENDPOINTS.chat.send(streamId),
        data
      ),
    
    onMutate: async (data) => {
      // Check if user can send message (slow mode)
      if (!canUserSendMessage(currentUserId)) {
        throw new Error('Please wait before sending another message');
      }
      
      // Create optimistic message
      const optimisticMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        userId: currentUserId,
        username: 'You', // This should come from auth store
        content: data.content,
        type: 'message',
        isPinned: false,
        isDeleted: false,
        replyTo: data.replyTo,
      };
      
      // Add to local store optimistically
      addMessage(optimisticMessage);
      
      // Record message for slow mode
      recordUserMessage(currentUserId);
      
      return { optimisticMessage };
    },
    
    onError: (error, data, context) => {
      // Show error toast
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
      
      // Could remove optimistic message here if we tracked it
    },
    
    onSuccess: (response) => {
      // Message already added optimistically
      // Could update with server response if needed
      
      // Invalidate messages query to ensure sync
      queryUtils.invalidateQueries(queryKeys.chatMessages(streamId));
    },
  });
}

export function useDeleteMessage(streamId: string) {
  const { deleteMessage } = useChatStore();
  
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.delete<ApiResponse<void>>(
        API_ENDPOINTS.chat.delete(streamId, messageId)
      ),
    
    onMutate: async (messageId) => {
      // Optimistically delete the message
      deleteMessage(messageId);
      
      return { messageId };
    },
    
    onError: (error, messageId) => {
      // Revert by refetching messages
      queryUtils.invalidateQueries(queryKeys.chatMessages(streamId));
    },
    
    onSuccess: () => {
      // Sync with server
      queryUtils.invalidateQueries(queryKeys.chatMessages(streamId));
    },
  });
}

export function useModerateUser(streamId: string) {
  const { timeoutUser, banUser, unbanUser } = useChatStore();
  const { showToast } = useUIStore();
  
  return useMutation({
    mutationFn: (data: ModerateUserData) =>
      apiClient.post<ApiResponse<void>>(
        `/streams/${streamId}/moderate`,
        data
      ),
    
    onMutate: async (data) => {
      // Apply moderation action optimistically
      switch (data.action) {
        case 'timeout':
          if (data.duration) {
            timeoutUser(data.userId, data.duration, data.reason);
          }
          break;
        case 'ban':
          banUser(data.userId, data.reason);
          break;
        case 'unban':
          unbanUser(data.userId);
          break;
      }
      
      return { data };
    },
    
    onError: (error, data) => {
      // Show error
      showToast({
        type: 'error',
        message: `Failed to ${data.action} user`,
      });
      
      // Revert by refetching
      queryUtils.invalidateQueries(queryKeys.chatMessages(streamId));
    },
    
    onSuccess: (_, data) => {
      // Show success
      showToast({
        type: 'success',
        message: `User ${data.action}${data.action === 'timeout' ? 'ed' : data.action === 'ban' ? 'ned' : 'ned'} successfully`,
      });
    },
  });
}

// Utility hook for pinning messages
export function usePinMessage(streamId: string) {
  const { pinMessage, unpinMessage } = useChatStore();
  
  return useMutation({
    mutationFn: ({ messageId, pin }: { messageId: string; pin: boolean }) =>
      apiClient.post<ApiResponse<void>>(
        `/streams/${streamId}/chat/${messageId}/pin`,
        { pin }
      ),
    
    onMutate: async ({ messageId, pin }) => {
      // Optimistically pin/unpin
      if (pin) {
        pinMessage(messageId);
      } else {
        unpinMessage();
      }
      
      return { messageId, pin };
    },
    
    onError: () => {
      // Revert by refetching
      queryUtils.invalidateQueries(queryKeys.chatMessages(streamId));
    },
  });
}