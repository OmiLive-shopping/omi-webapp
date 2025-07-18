export interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  streamKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  streamId: string;
  createdAt: string;
}

export interface ViewerState {
  count: number;
  isWatching: boolean;
  setCount: (count: number) => void;
  incrementCount: () => void;
  decrementCount: () => void;
  setWatching: (watching: boolean) => void;
}

export interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setConnected: (connected: boolean) => void;
}

export interface AppState {
  chat: ChatState;
  viewer: ViewerState;
}