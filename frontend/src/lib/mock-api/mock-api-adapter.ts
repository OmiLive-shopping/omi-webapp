import { ApiError, PaginatedResponse, ApiResponse } from '../api-client';
import { mockDataStore, Product, User, ExtendedStreamInfo, ChatMessage, Category, mockData } from './mock-data';
import { StreamInfo, StreamStats } from '@/stores/stream-store';

interface RequestOptions {
  params?: Record<string, any>;
  token?: string;
}

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to simulate random errors
const shouldSimulateError = () => Math.random() < 0.05; // 5% error rate

// Helper to paginate data
function paginate<T>(data: T[], page: number = 1, pageSize: number = 10): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = data.slice(start, end);
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  };
}

// Helper to filter and sort data
function filterAndSort<T>(
  data: T[],
  filters: Record<string, any> = {},
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  let filtered = [...data];
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      filtered = filtered.filter((item: any) => {
        if (key === 'search' && typeof value === 'string') {
          // Search in multiple fields
          const searchLower = value.toLowerCase();
          return Object.values(item).some(v => 
            typeof v === 'string' && v.toLowerCase().includes(searchLower)
          );
        }
        if (key === 'category' && item.category) {
          return item.category === value;
        }
        if (key === 'isLive' && typeof item.isLive === 'boolean') {
          return item.isLive === value;
        }
        if (key === 'featured' && typeof item.featured === 'boolean') {
          return item.featured === value;
        }
        if (key === 'minPrice' && typeof item.price === 'number') {
          return item.price >= value;
        }
        if (key === 'maxPrice' && typeof item.price === 'number') {
          return item.price <= value;
        }
        return true;
      });
    }
  });
  
  // Apply sorting
  if (sortBy) {
    filtered.sort((a: any, b: any) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
  
  return filtered;
}

export class MockApiAdapter {
  private authToken: string | null = null;
  private currentUser: User | null = null;
  private cart: Array<{ product: Product; quantity: number }> = [];
  private wishlist: Product[] = [];

  async request<T>(endpoint: string, options: RequestOptions & { method: string; body?: string }): Promise<T> {
    // Simulate network delay
    await delay(100 + Math.random() * 400);
    
    // Simulate random errors
    if (shouldSimulateError()) {
      throw new ApiError(500, 'Simulated server error for testing');
    }
    
    const { method, params } = options;
    
    // Route to appropriate handler
    if (endpoint.startsWith('/auth')) {
      return this.handleAuthRequests(endpoint, method, options) as T;
    }
    if (endpoint.startsWith('/streams')) {
      return this.handleStreamRequests(endpoint, method, options, params) as T;
    }
    if (endpoint.startsWith('/products')) {
      return this.handleProductRequests(endpoint, method, options, params) as T;
    }
    if (endpoint.startsWith('/users')) {
      return this.handleUserRequests(endpoint, method, options, params) as T;
    }
    if (endpoint.startsWith('/cart')) {
      return this.handleCartRequests(endpoint, method, options) as T;
    }
    if (endpoint.startsWith('/wishlist')) {
      return this.handleWishlistRequests(endpoint, method, options) as T;
    }
    if (endpoint.startsWith('/categories')) {
      return this.handleCategoryRequests(endpoint, method, params) as T;
    }
    
    throw new ApiError(404, `Endpoint ${endpoint} not found`);
  }

  // HTTP methods matching the original API client
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

  // Auth handlers
  private handleAuthRequests(endpoint: string, method: string, options: any) {
    if (endpoint === '/auth/login' && method === 'POST') {
      const data = JSON.parse(options.body);
      const user = mockDataStore.users.find(u => u.email === data.email);
      
      if (!user) {
        throw new ApiError(401, 'Invalid credentials');
      }
      
      this.authToken = `mock-token-${user.id}`;
      this.currentUser = user;
      
      return {
        data: {
          user,
          token: this.authToken,
          refreshToken: `mock-refresh-${user.id}`,
        },
        message: 'Login successful',
      };
    }
    
    if (endpoint === '/auth/register' && method === 'POST') {
      const data = JSON.parse(options.body);
      const newUser: User = {
        id: `user-${mockDataStore.users.length + 1}`,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'USER',
        createdAt: new Date().toISOString(),
        followerCount: 0,
        followingCount: 0,
      };
      
      mockDataStore.users.push(newUser);
      this.authToken = `mock-token-${newUser.id}`;
      this.currentUser = newUser;
      
      return {
        data: {
          user: newUser,
          token: this.authToken,
        },
        message: 'Registration successful',
      };
    }
    
    if (endpoint === '/auth/profile' && method === 'GET') {
      if (!this.currentUser) {
        throw new ApiError(401, 'Not authenticated');
      }
      
      return {
        data: this.currentUser,
      };
    }
    
    if (endpoint === '/auth/logout' && method === 'POST') {
      this.authToken = null;
      this.currentUser = null;
      return { message: 'Logged out successfully' };
    }
    
    throw new ApiError(404, `Auth endpoint ${endpoint} not found`);
  }

  // Stream handlers
  private handleStreamRequests(endpoint: string, method: string, options: any, params?: any) {
    // List streams
    if (endpoint === '/streams' && method === 'GET') {
      const { page = 1, pageSize = 10, isLive, category, search, sortBy } = params || {};
      
      const filtered = filterAndSort(mockDataStore.streams, {
        isLive,
        category,
        search,
      }, sortBy);
      
      return paginate(filtered, page, pageSize);
    }
    
    // Get stream detail
    const streamDetailMatch = endpoint.match(/^\/streams\/([^\/]+)$/);
    if (streamDetailMatch && method === 'GET') {
      const streamId = streamDetailMatch[1];
      const stream = mockDataStore.streams.find(s => s.id === streamId);
      
      if (!stream) {
        throw new ApiError(404, 'Stream not found');
      }
      
      return { data: stream };
    }
    
    // Start stream
    if (endpoint === '/streams/start' && method === 'POST') {
      const data = JSON.parse(options.body);
      const newStream: ExtendedStreamInfo = {
        id: `stream-${mockDataStore.streams.length + 1}`,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        thumbnailUrl: data.thumbnailUrl,
        startedAt: new Date(),
        isLive: true,
        viewerCount: 0,
        streamer: this.currentUser!,
        products: [],
      };
      
      mockDataStore.streams.unshift(newStream);
      return { data: newStream };
    }
    
    // Get stream stats
    const statsMatch = endpoint.match(/^\/streams\/([^\/]+)\/stats$/);
    if (statsMatch && method === 'GET') {
      const streamId = statsMatch[1];
      const stream = mockDataStore.streams.find(s => s.id === streamId);
      
      if (!stream) {
        throw new ApiError(404, 'Stream not found');
      }
      
      return {
        data: mockData.generateStreamStats(stream.viewerCount),
      };
    }
    
    // Get stream viewers
    const viewersMatch = endpoint.match(/^\/streams\/([^\/]+)\/viewers$/);
    if (viewersMatch && method === 'GET') {
      const streamId = viewersMatch[1];
      const stream = mockDataStore.streams.find(s => s.id === streamId);
      
      if (!stream) {
        throw new ApiError(404, 'Stream not found');
      }
      
      const viewers = mockData.generateViewers(stream.viewerCount, mockDataStore.users);
      return { data: viewers };
    }
    
    // Get stream chat
    const chatMatch = endpoint.match(/^\/streams\/([^\/]+)\/chat$/);
    if (chatMatch && method === 'GET') {
      const messages = mockData.generateChatMessages(50, mockDataStore.users);
      return { data: messages };
    }
    
    throw new ApiError(404, `Stream endpoint ${endpoint} not found`);
  }

  // Product handlers
  private handleProductRequests(endpoint: string, method: string, options: any, params?: any) {
    // List products
    if (endpoint === '/products' && method === 'GET') {
      const { page = 1, pageSize = 10, category, featured, minPrice, maxPrice, search, sortBy } = params || {};
      
      const filtered = filterAndSort(mockDataStore.products, {
        category,
        featured,
        minPrice,
        maxPrice,
        search,
      }, sortBy);
      
      return paginate(filtered, page, pageSize);
    }
    
    // Get product detail
    const productDetailMatch = endpoint.match(/^\/products\/([^\/]+)$/);
    if (productDetailMatch && method === 'GET') {
      const productId = productDetailMatch[1];
      const product = mockDataStore.products.find(p => p.id === productId);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }
      
      return { data: product };
    }
    
    // Get product recommendations
    const recommendationsMatch = endpoint.match(/^\/products\/([^\/]+)\/recommendations$/);
    if (recommendationsMatch && method === 'GET') {
      const productId = recommendationsMatch[1];
      const product = mockDataStore.products.find(p => p.id === productId);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }
      
      // Get similar products from same category
      const recommendations = mockDataStore.products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 8);
      
      return { data: recommendations };
    }
    
    throw new ApiError(404, `Product endpoint ${endpoint} not found`);
  }

  // User handlers
  private handleUserRequests(endpoint: string, method: string, options: any, params?: any) {
    // Get user profile
    if (endpoint === '/users/profile' && method === 'GET') {
      if (!this.currentUser) {
        throw new ApiError(401, 'Not authenticated');
      }
      
      return { data: this.currentUser };
    }
    
    // Get user detail
    const userDetailMatch = endpoint.match(/^\/users\/([^\/]+)$/);
    if (userDetailMatch && method === 'GET') {
      const userId = userDetailMatch[1];
      const user = mockDataStore.users.find(u => u.id === userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      
      return { data: user };
    }
    
    // Follow user
    const followMatch = endpoint.match(/^\/users\/([^\/]+)\/follow$/);
    if (followMatch && method === 'POST') {
      const userId = followMatch[1];
      const user = mockDataStore.users.find(u => u.id === userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      
      user.isFollowing = true;
      if (user.followerCount !== undefined) {
        user.followerCount++;
      }
      
      return { message: 'Followed successfully' };
    }
    
    // Unfollow user
    if (followMatch && method === 'DELETE') {
      const userId = followMatch[1];
      const user = mockDataStore.users.find(u => u.id === userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      
      user.isFollowing = false;
      if (user.followerCount !== undefined && user.followerCount > 0) {
        user.followerCount--;
      }
      
      return { message: 'Unfollowed successfully' };
    }
    
    throw new ApiError(404, `User endpoint ${endpoint} not found`);
  }

  // Cart handlers
  private handleCartRequests(endpoint: string, method: string, options: any) {
    if (endpoint === '/cart' && method === 'GET') {
      const total = this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      return {
        data: {
          items: this.cart,
          total,
          count: this.cart.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    }
    
    if (endpoint === '/cart/add' && method === 'POST') {
      const { productId, quantity = 1 } = JSON.parse(options.body);
      const product = mockDataStore.products.find(p => p.id === productId);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }
      
      const existingItem = this.cart.find(item => item.product.id === productId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        this.cart.push({ product, quantity });
      }
      
      return { message: 'Added to cart' };
    }
    
    if (endpoint === '/cart/clear' && method === 'POST') {
      this.cart = [];
      return { message: 'Cart cleared' };
    }
    
    throw new ApiError(404, `Cart endpoint ${endpoint} not found`);
  }

  // Wishlist handlers
  private handleWishlistRequests(endpoint: string, method: string, options: any) {
    if (endpoint === '/wishlist' && method === 'GET') {
      return { data: this.wishlist };
    }
    
    if (endpoint === '/wishlist/add' && method === 'POST') {
      const { productId } = JSON.parse(options.body);
      const product = mockDataStore.products.find(p => p.id === productId);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }
      
      if (!this.wishlist.find(p => p.id === productId)) {
        this.wishlist.push(product);
      }
      
      return { message: 'Added to wishlist' };
    }
    
    if (endpoint === '/wishlist/remove' && method === 'POST') {
      const { productId } = JSON.parse(options.body);
      this.wishlist = this.wishlist.filter(p => p.id !== productId);
      
      return { message: 'Removed from wishlist' };
    }
    
    throw new ApiError(404, `Wishlist endpoint ${endpoint} not found`);
  }

  // Category handlers
  private handleCategoryRequests(endpoint: string, method: string, params?: any) {
    if (endpoint === '/categories' && method === 'GET') {
      return { data: mockDataStore.categories };
    }
    
    throw new ApiError(404, `Category endpoint ${endpoint} not found`);
  }
}