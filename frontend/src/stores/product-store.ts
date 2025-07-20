import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  tags: string[];
  inStock: boolean;
  stockCount?: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  discount?: {
    percentage: number;
    validUntil: Date;
  };
  rating?: {
    average: number;
    count: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: Date;
  notes?: string;
}

export interface WishlistItem {
  product: Product;
  addedAt: Date;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface Coupon {
  code: string;
  discount: number; // percentage
  validUntil: Date;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
}

interface ProductState {
  // Products
  products: Map<string, Product>;
  featuredProducts: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  removeProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  updateCartItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  isInCart: (productId: string) => boolean;
  
  // Wishlist
  wishlist: WishlistItem[];
  addToWishlist: (product: Product, priority?: WishlistItem['priority'], notes?: string) => void;
  removeFromWishlist: (productId: string) => void;
  updateWishlistItem: (productId: string, updates: Partial<WishlistItem>) => void;
  clearWishlist: () => void;
  moveToCart: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  
  // Coupons
  activeCoupon: Coupon | null;
  availableCoupons: Coupon[];
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  validateCoupon: (coupon: Coupon) => boolean;
  getDiscountAmount: () => number;
  getFinalTotal: () => number;
  
  // Search and Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  priceRange: [number, number] | null;
  setPriceRange: (range: [number, number] | null) => void;
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'newest' | 'rating';
  setSortBy: (sortBy: ProductState['sortBy']) => void;
  
  // Utilities
  getFilteredProducts: () => Product[];
  getCategories: () => string[];
  getRecommendedProducts: (productId: string, limit?: number) => Product[];
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      // Products
      products: new Map(),
      featuredProducts: [],
      setProducts: (products) => {
        const productsMap = new Map(products.map(p => [p.id, p]));
        const featured = products.filter(p => p.featured);
        set({ products: productsMap, featuredProducts: featured });
      },
      addProduct: (product) => set((state) => {
        const newProducts = new Map(state.products);
        newProducts.set(product.id, product);
        return { 
          products: newProducts,
          featuredProducts: product.featured 
            ? [...state.featuredProducts, product]
            : state.featuredProducts
        };
      }),
      updateProduct: (productId, updates) => set((state) => {
        const newProducts = new Map(state.products);
        const product = newProducts.get(productId);
        if (product) {
          const updatedProduct = { ...product, ...updates };
          newProducts.set(productId, updatedProduct);
        }
        return { products: newProducts };
      }),
      removeProduct: (productId) => set((state) => {
        const newProducts = new Map(state.products);
        newProducts.delete(productId);
        return { 
          products: newProducts,
          featuredProducts: state.featuredProducts.filter(p => p.id !== productId)
        };
      }),
      getProductById: (productId) => get().products.get(productId),
      
      // Cart
      cart: [],
      addToCart: (product, quantity = 1, notes) => set((state) => {
        const existingItem = state.cart.find(item => item.product.id === product.id);
        if (existingItem) {
          return {
            cart: state.cart.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          };
        }
        return {
          cart: [...state.cart, { product, quantity, addedAt: new Date(), notes }],
        };
      }),
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.product.id !== productId),
      })),
      updateCartItemQuantity: (productId, quantity) => set((state) => ({
        cart: quantity <= 0
          ? state.cart.filter(item => item.product.id !== productId)
          : state.cart.map(item =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
      })),
      updateCartItemNotes: (productId, notes) => set((state) => ({
        cart: state.cart.map(item =>
          item.product.id === productId ? { ...item, notes } : item
        ),
      })),
      clearCart: () => set({ cart: [] }),
      getCartTotal: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },
      getCartItemCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
      },
      isInCart: (productId) => get().cart.some(item => item.product.id === productId),
      
      // Wishlist
      wishlist: [],
      addToWishlist: (product, priority = 'medium', notes) => set((state) => {
        if (state.wishlist.some(item => item.product.id === product.id)) {
          return state;
        }
        return {
          wishlist: [...state.wishlist, { product, addedAt: new Date(), priority, notes }],
        };
      }),
      removeFromWishlist: (productId) => set((state) => ({
        wishlist: state.wishlist.filter(item => item.product.id !== productId),
      })),
      updateWishlistItem: (productId, updates) => set((state) => ({
        wishlist: state.wishlist.map(item =>
          item.product.id === productId ? { ...item, ...updates } : item
        ),
      })),
      clearWishlist: () => set({ wishlist: [] }),
      moveToCart: (productId) => {
        const { wishlist, addToCart, removeFromWishlist } = get();
        const item = wishlist.find(item => item.product.id === productId);
        if (item) {
          addToCart(item.product, 1, item.notes);
          removeFromWishlist(productId);
        }
      },
      isInWishlist: (productId) => get().wishlist.some(item => item.product.id === productId),
      
      // Coupons
      activeCoupon: null,
      availableCoupons: [],
      applyCoupon: (code) => {
        const { availableCoupons, validateCoupon } = get();
        const coupon = availableCoupons.find(c => c.code === code);
        if (coupon && validateCoupon(coupon)) {
          set({ activeCoupon: coupon });
          return true;
        }
        return false;
      },
      removeCoupon: () => set({ activeCoupon: null }),
      validateCoupon: (coupon) => {
        const { getCartTotal } = get();
        const cartTotal = getCartTotal();
        
        // Check expiry
        if (new Date() > new Date(coupon.validUntil)) return false;
        
        // Check minimum purchase
        if (coupon.minPurchase && cartTotal < coupon.minPurchase) return false;
        
        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
        
        return true;
      },
      getDiscountAmount: () => {
        const { activeCoupon, getCartTotal } = get();
        if (!activeCoupon) return 0;
        
        const cartTotal = getCartTotal();
        const discountAmount = cartTotal * (activeCoupon.discount / 100);
        
        if (activeCoupon.maxDiscount) {
          return Math.min(discountAmount, activeCoupon.maxDiscount);
        }
        
        return discountAmount;
      },
      getFinalTotal: () => {
        const { getCartTotal, getDiscountAmount } = get();
        return Math.max(0, getCartTotal() - getDiscountAmount());
      },
      
      // Search and Filter
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      selectedCategory: null,
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      priceRange: null,
      setPriceRange: (priceRange) => set({ priceRange }),
      sortBy: 'newest',
      setSortBy: (sortBy) => set({ sortBy }),
      
      // Utilities
      getFilteredProducts: () => {
        const { products, searchQuery, selectedCategory, priceRange, sortBy } = get();
        let filtered = Array.from(products.values());
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        
        // Category filter
        if (selectedCategory) {
          filtered = filtered.filter(p => p.category === selectedCategory);
        }
        
        // Price filter
        if (priceRange) {
          filtered = filtered.filter(p => 
            p.price >= priceRange[0] && p.price <= priceRange[1]
          );
        }
        
        // Sort
        switch (sortBy) {
          case 'price-asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price-desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
          case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'newest':
            filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            break;
          case 'rating':
            filtered.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
            break;
        }
        
        return filtered;
      },
      getCategories: () => {
        const { products } = get();
        const categories = new Set<string>();
        products.forEach(p => categories.add(p.category));
        return Array.from(categories).sort();
      },
      getRecommendedProducts: (productId, limit = 4) => {
        const { products } = get();
        const product = products.get(productId);
        if (!product) return [];
        
        // Simple recommendation based on category and tags
        const recommendations = Array.from(products.values())
          .filter(p => p.id !== productId)
          .map(p => ({
            product: p,
            score: (p.category === product.category ? 2 : 0) +
                   p.tags.filter(tag => product.tags.includes(tag)).length
          }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(({ product }) => product);
        
        return recommendations;
      },
    }),
    {
      name: 'product-store',
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
      }),
    }
  )
);