import { create } from 'zustand';
import { ChatMessage, ChatState, ViewerState } from '@/types/store';

interface AppStore {
  chat: ChatState;
  viewer: ViewerState;
}

export const useAppStore = create<AppStore>((set) => ({
  chat: {
    messages: [],
    isConnected: false,
    addMessage: (message: ChatMessage) =>
      set((state) => ({
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, message],
        },
      })),
    clearMessages: () =>
      set((state) => ({
        chat: {
          ...state.chat,
          messages: [],
        },
      })),
    setConnected: (connected: boolean) =>
      set((state) => ({
        chat: {
          ...state.chat,
          isConnected: connected,
        },
      })),
  },
  viewer: {
    count: 0,
    isWatching: false,
    setCount: (count: number) =>
      set((state) => ({
        viewer: {
          ...state.viewer,
          count,
        },
      })),
    incrementCount: () =>
      set((state) => ({
        viewer: {
          ...state.viewer,
          count: state.viewer.count + 1,
        },
      })),
    decrementCount: () =>
      set((state) => ({
        viewer: {
          ...state.viewer,
          count: Math.max(0, state.viewer.count - 1),
        },
      })),
    setWatching: (watching: boolean) =>
      set((state) => ({
        viewer: {
          ...state.viewer,
          isWatching: watching,
        },
      })),
  },
}));