import { faker } from '@faker-js/faker';
import { StreamInfo, StreamStats, Viewer } from '@/stores/stream-store';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: 'USER' | 'STREAMER' | 'ADMIN';
  isFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
  bio?: string;
  createdAt: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  category: string;
  tags: string[];
  inStock: boolean;
  featured: boolean;
  rating: number;
  reviewCount: number;
  seller: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
}

// Chat types
export interface ChatMessage {
  id: string;
  user: {
    id: string;
    username: string;
    role: 'viewer' | 'moderator' | 'streamer';
    avatarUrl?: string;
  };
  content: string;
  timestamp: string;
  type: 'message' | 'system' | 'donation' | 'subscription';
  isPinned?: boolean;
  metadata?: any;
}

// Stream with extended info
export interface ExtendedStreamInfo extends StreamInfo {
  streamer: User;
  viewerCount: number;
  isLive: boolean;
  products: Product[];
}

// Mock data generators
export const mockData = {
  // Generate users
  generateUsers: (count: number = 100): User[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i + 1}`,
      username: faker.internet.username(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatarUrl: faker.image.avatar(),
      role: faker.helpers.arrayElement(['USER', 'STREAMER', 'ADMIN'] as const),
      followerCount: faker.number.int({ min: 0, max: 10000 }),
      followingCount: faker.number.int({ min: 0, max: 1000 }),
      bio: faker.lorem.sentence(),
      createdAt: faker.date.past().toISOString(),
    }));
  },

  // Generate products
  generateProducts: (count: number = 200): Product[] => {
    const categories = ['Electronics', 'Fashion', 'Beauty', 'Home', 'Sports', 'Books', 'Toys', 'Food'];
    
    return Array.from({ length: count }, (_, i) => {
      const price = faker.number.float({ min: 9.99, max: 999.99, fractionDigits: 2 });
      const hasDiscount = faker.datatype.boolean(0.3);
      
      return {
        id: `product-${i + 1}`,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price,
        comparePrice: hasDiscount ? price * faker.number.float({ min: 1.1, max: 1.5, fractionDigits: 2 }) : undefined,
        images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
          faker.image.url({ width: 640, height: 480 })
        ),
        category: faker.helpers.arrayElement(categories),
        tags: faker.helpers.arrayElements(['trending', 'sale', 'new', 'popular', 'exclusive', 'limited'], { min: 0, max: 3 }),
        inStock: faker.datatype.boolean(0.9),
        featured: faker.datatype.boolean(0.2),
        rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
        reviewCount: faker.number.int({ min: 0, max: 500 }),
        seller: {
          id: `seller-${faker.number.int({ min: 1, max: 20 })}`,
          name: faker.company.name(),
          avatarUrl: faker.image.avatar(),
        },
        createdAt: faker.date.past().toISOString(),
        updatedAt: faker.date.recent().toISOString(),
      };
    });
  },

  // Generate streams
  generateStreams: (count: number = 50): ExtendedStreamInfo[] => {
    const streamers = mockData.generateUsers(20).filter(u => u.role === 'STREAMER');
    const products = mockData.generateProducts(100);
    const categories = ['Gaming', 'Fashion', 'Beauty', 'Tech', 'Cooking', 'Music', 'Art', 'Fitness'];
    
    return Array.from({ length: count }, (_, i) => {
      const isLive = faker.datatype.boolean(0.4);
      const streamer = faker.helpers.arrayElement(streamers);
      
      return {
        id: `stream-${i + 1}`,
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        description: faker.lorem.paragraph(),
        category: faker.helpers.arrayElement(categories),
        tags: faker.helpers.arrayElements(['trending', 'new', 'gaming', 'tutorial', 'review'], { min: 1, max: 3 }),
        thumbnailUrl: faker.image.url({ width: 1280, height: 720 }),
        startedAt: isLive ? faker.date.recent({ days: 1 }) : faker.date.past(),
        scheduledFor: !isLive && faker.datatype.boolean(0.5) ? faker.date.future({ days: 7 }) : undefined,
        streamer,
        viewerCount: isLive ? faker.number.int({ min: 10, max: 5000 }) : 0,
        isLive,
        products: faker.helpers.arrayElements(products, { min: 0, max: 10 }),
      };
    });
  },

  // Generate categories
  generateCategories: (): Category[] => {
    return [
      { id: 'cat-1', name: 'Electronics', slug: 'electronics', productCount: 450, imageUrl: faker.image.url() },
      { id: 'cat-2', name: 'Fashion', slug: 'fashion', productCount: 380, imageUrl: faker.image.url() },
      { id: 'cat-3', name: 'Beauty', slug: 'beauty', productCount: 290, imageUrl: faker.image.url() },
      { id: 'cat-4', name: 'Home & Living', slug: 'home-living', productCount: 320, imageUrl: faker.image.url() },
      { id: 'cat-5', name: 'Sports & Outdoors', slug: 'sports-outdoors', productCount: 210, imageUrl: faker.image.url() },
      { id: 'cat-6', name: 'Books & Media', slug: 'books-media', productCount: 180, imageUrl: faker.image.url() },
      { id: 'cat-7', name: 'Toys & Games', slug: 'toys-games', productCount: 150, imageUrl: faker.image.url() },
      { id: 'cat-8', name: 'Food & Beverages', slug: 'food-beverages', productCount: 120, imageUrl: faker.image.url() },
    ];
  },

  // Generate chat messages
  generateChatMessages: (count: number = 50, users: User[]): ChatMessage[] => {
    return Array.from({ length: count }, (_, i) => {
      const user = faker.helpers.arrayElement(users);
      const messageType = faker.helpers.weighted(
        ['message', 'system', 'donation', 'subscription'] as const,
        [0.85, 0.05, 0.05, 0.05]
      );
      
      return {
        id: `msg-${i + 1}`,
        user: {
          id: user.id,
          username: user.username,
          role: user.role === 'STREAMER' ? 'streamer' : 
                user.role === 'ADMIN' ? 'moderator' : 'viewer',
          avatarUrl: user.avatarUrl,
        },
        content: messageType === 'system' ? 'User joined the stream' :
                 messageType === 'donation' ? `Donated $${faker.number.int({ min: 5, max: 100 })}` :
                 messageType === 'subscription' ? 'Subscribed to the channel!' :
                 faker.lorem.sentence(),
        timestamp: faker.date.recent({ days: 1 }).toISOString(),
        type: messageType,
        isPinned: faker.datatype.boolean(0.05),
      };
    });
  },

  // Generate stream stats
  generateStreamStats: (viewerCount: number): StreamStats => {
    return {
      viewerCount,
      peakViewerCount: viewerCount + faker.number.int({ min: 0, max: 500 }),
      duration: faker.number.int({ min: 0, max: 7200 }), // up to 2 hours
      likes: faker.number.int({ min: 0, max: viewerCount * 2 }),
      shares: faker.number.int({ min: 0, max: viewerCount / 2 }),
      chatMessages: faker.number.int({ min: viewerCount, max: viewerCount * 10 }),
      bandwidth: {
        upload: faker.number.float({ min: 2.5, max: 10, fractionDigits: 1 }),
        download: faker.number.float({ min: 0.5, max: 2, fractionDigits: 1 }),
      },
      quality: {
        resolution: faker.helpers.arrayElement(['1080p', '720p', '480p']),
        fps: faker.helpers.arrayElement([30, 60]),
        bitrate: faker.number.int({ min: 2500, max: 8000 }),
      },
    };
  },

  // Generate viewers
  generateViewers: (count: number, users: User[]): Viewer[] => {
    const viewers = faker.helpers.arrayElements(users, { min: count, max: count });
    
    return viewers.map(user => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      joinedAt: faker.date.recent({ days: 1 }),
      isFollowing: faker.datatype.boolean(0.3),
      isSubscribed: faker.datatype.boolean(0.1),
      isModerator: user.role === 'ADMIN',
      watchTime: faker.number.int({ min: 0, max: 7200 }),
    }));
  },
};

// Singleton storage for consistent data
class MockDataStore {
  private static instance: MockDataStore;
  
  users: User[];
  products: Product[];
  streams: ExtendedStreamInfo[];
  categories: Category[];
  
  private constructor() {
    this.users = mockData.generateUsers(100);
    this.products = mockData.generateProducts(200);
    this.streams = mockData.generateStreams(50);
    this.categories = mockData.generateCategories();
  }
  
  static getInstance(): MockDataStore {
    if (!MockDataStore.instance) {
      MockDataStore.instance = new MockDataStore();
    }
    return MockDataStore.instance;
  }
  
  // Get current user (for auth)
  getCurrentUser(): User {
    return this.users.find(u => u.username === 'demo_user') || this.users[0];
  }
  
  // Update stream status
  updateStreamStatus(streamId: string, isLive: boolean) {
    const stream = this.streams.find(s => s.id === streamId);
    if (stream) {
      stream.isLive = isLive;
      stream.viewerCount = isLive ? faker.number.int({ min: 10, max: 5000 }) : 0;
      if (isLive) {
        stream.startedAt = new Date();
      }
    }
  }
}

export const mockDataStore = MockDataStore.getInstance();