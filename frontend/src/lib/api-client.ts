// TODO: Replace with Better Auth
// import { useAuthStore } from '@/stores/auth.store';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const serverURL = import.meta.env.VITE_SERVER_URL || 'http://localhost:9000';
    const apiBase = import.meta.env.VITE_API_BASE || '/v1';
    this.baseUrl = baseUrl || `${serverURL}${apiBase}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, token, ...requestOptions } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Get auth token
    // TODO: Replace with Better Auth
    // const authToken = token || useAuthStore.getState().token;
    const authToken = token || null; // Temporary placeholder

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...requestOptions.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers,
        credentials: 'include', // Include cookies for Better Auth sessions
      });

      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.message || `Request failed with status ${response.status}`,
          errorData
        );
      }

      // Handle empty responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      // Re-throw ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        throw new ApiError(0, error.message);
      }

      throw new ApiError(0, 'An unknown error occurred');
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create default instance
export const apiClient = new ApiClient();

// Type definitions for API responses
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// API endpoints
export const API_ENDPOINTS = {
  // Auth - Note: These are not used with Better Auth client
  // Better Auth handles auth endpoints internally
  auth: {
    login: '/auth/sign-in/email',
    register: '/auth/sign-up/email',
    logout: '/auth/sign-out',
    refresh: '/auth/refresh', // Not used in Better Auth
    profile: '/users/profile', // User profile is at /v1/users/profile
  },

  // Streams
  streams: {
    list: '/streams',
    detail: (id: string) => `/streams/${id}`,
    start: '/streams/start',
    end: (id: string) => `/streams/${id}/end`,
    stats: (id: string) => `/streams/${id}/stats`,
    viewers: (id: string) => `/streams/${id}/viewers`,
  },

  // Products
  products: {
    list: '/products',
    detail: (id: string) => `/products/${id}`,
    create: '/products',
    update: (id: string) => `/products/${id}`,
    delete: (id: string) => `/products/${id}`,
    recommendations: (id: string) => `/products/${id}/recommendations`,
  },

  // Users
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    profile: '/users/profile',
    update: (id: string) => `/users/${id}`,
  },

  // Chat
  chat: {
    messages: (streamId: string) => `/streams/${streamId}/chat`,
    send: (streamId: string) => `/streams/${streamId}/chat`,
    delete: (streamId: string, messageId: string) => `/streams/${streamId}/chat/${messageId}`,
    emotes: '/chat/emotes',
    moderators: (streamId: string) => `/streams/${streamId}/moderators`,
  },

  // Cart
  cart: {
    get: '/cart',
    add: '/cart/add',
    update: '/cart/update',
    remove: '/cart/remove',
    clear: '/cart/clear',
  },

  // Wishlist
  wishlist: {
    get: '/wishlist',
    add: '/wishlist/add',
    remove: '/wishlist/remove',
    clear: '/wishlist/clear',
  },

  // Coupons
  coupons: {
    list: '/coupons',
    validate: (code: string) => `/coupons/validate/${code}`,
    apply: '/coupons/apply',
  },
};