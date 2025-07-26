// Construct API URL from server URL and API base path
const serverURL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const apiBase = import.meta.env.VITE_API_BASE || '/v1';
export const API_BASE_URL = `${serverURL}${apiBase}`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/users/register',
    profile: '/users/profile',
  },
  products: {
    list: '/products',
    get: (id: string) => `/products/${id}`,
    create: '/products',
    update: (id: string) => `/products/${id}`,
    delete: (id: string) => `/products/${id}`,
    wishlist: {
      add: '/products/wishlist/add',
      remove: (id: string) => `/products/wishlist/${id}`,
      my: '/products/wishlist/my',
    },
  },
  streams: {
    list: '/streams',
    get: (id: string) => `/streams/${id}`,
    create: '/streams',
    update: (id: string) => `/streams/${id}`,
    delete: (id: string) => `/streams/${id}`,
    goLive: '/streams/go-live',
    endStream: '/streams/end-stream',
    products: (id: string) => `/streams/${id}/products`,
    comments: (id: string) => `/streams/${id}/comments`,
    viewerCount: (id: string) => `/streams/${id}/viewer-count`,
  },
} as const;