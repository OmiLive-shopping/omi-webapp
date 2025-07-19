import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';
import ProductCard from '@/components/products/ProductCard';
import { 
  Search, 
  SlidersHorizontal, 
  X,
  ChevronDown,
  Star,
  Package,
  Zap,
  DollarSign
} from 'lucide-react';
import clsx from 'clsx';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  stock: number;
  category: string;
  subcategory: string;
  rating: number;
  reviews: number;
  isNew?: boolean;
  discount?: number;
  isTrending?: boolean;
}

interface FilterState {
  categories: string[];
  priceRange: [number, number];
  inStock: boolean;
  onSale: boolean;
  minRating: number;
  brands: string[];
}

// Mock products data - replace with real API
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Pantene Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene',
    price: 12.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    description: 'Professional hair care for moisture and shine',
    stock: 15,
    category: 'Hair Care',
    subcategory: 'Conditioner',
    rating: 4.5,
    reviews: 234,
    discount: 20
  },
  {
    id: '2',
    name: 'White Tea Shampoo and Conditioner Set',
    brand: 'Westin Hotels',
    price: 24.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400',
    description: 'Luxury hotel-quality hair care',
    stock: 8,
    category: 'Hair Care',
    subcategory: 'Sets',
    rating: 4.8,
    reviews: 156,
    isNew: true
  },
  {
    id: '3',
    name: 'The Ordinary Hair Serum',
    brand: 'The Ordinary',
    price: 18.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    description: 'Lightweight serum for all hair types',
    stock: 12,
    category: 'Hair Care',
    subcategory: 'Treatment',
    rating: 4.3,
    reviews: 189,
    isTrending: true
  },
  {
    id: '4',
    name: 'Eco-Friendly Bamboo Hair Brush',
    brand: 'EcoBeauty',
    price: 14.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400',
    description: 'Sustainable bamboo brush with natural bristles',
    stock: 20,
    category: 'Hair Care',
    subcategory: 'Accessories',
    rating: 4.7,
    reviews: 92
  },
  {
    id: '5',
    name: 'Natural Face Moisturizer',
    brand: 'Pure Skin',
    price: 32.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400',
    description: 'Hydrating moisturizer with natural ingredients',
    stock: 25,
    category: 'Skincare',
    subcategory: 'Moisturizer',
    rating: 4.6,
    reviews: 312,
    discount: 15
  },
  {
    id: '6',
    name: 'Vitamin C Serum',
    brand: 'GlowLab',
    price: 28.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    description: 'Brightening serum with 20% Vitamin C',
    stock: 0,
    category: 'Skincare',
    subcategory: 'Serum',
    rating: 4.9,
    reviews: 456,
    isTrending: true
  },
  {
    id: '7',
    name: 'Minimalist Throw Pillow Set',
    brand: 'HomeStyle',
    price: 45.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400',
    description: 'Set of 2 modern throw pillows',
    stock: 10,
    category: 'Home',
    subcategory: 'Decor',
    rating: 4.4,
    reviews: 78,
    isNew: true
  },
  {
    id: '8',
    name: 'Aromatherapy Candle Collection',
    brand: 'ZenScents',
    price: 35.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1602607213586-f94eb9b99b48?w=400',
    description: 'Set of 3 relaxing scented candles',
    stock: 18,
    category: 'Home',
    subcategory: 'Fragrance',
    rating: 4.7,
    reviews: 234,
    discount: 10
  },
  {
    id: '9',
    name: 'Organic Cotton T-Shirt',
    brand: 'EcoWear',
    price: 24.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    description: '100% organic cotton, sustainably made',
    stock: 30,
    category: 'Apparel',
    subcategory: 'Tops',
    rating: 4.5,
    reviews: 167
  },
  {
    id: '10',
    name: 'Linen Summer Dress',
    brand: 'NaturalStyle',
    price: 68.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
    description: 'Breathable linen dress perfect for summer',
    stock: 5,
    category: 'Apparel',
    subcategory: 'Dresses',
    rating: 4.8,
    reviews: 89,
    isNew: true
  },
  {
    id: '11',
    name: 'Professional Hair Dryer',
    brand: 'SalonPro',
    price: 89.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400',
    description: 'Ionic technology for faster drying',
    stock: 7,
    category: 'Hair Care',
    subcategory: 'Tools',
    rating: 4.6,
    reviews: 201,
    discount: 25
  },
  {
    id: '12',
    name: 'Anti-Aging Night Cream',
    brand: 'TimelessBeauty',
    price: 54.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38e39?w=400',
    description: 'Retinol-based night treatment',
    stock: 14,
    category: 'Skincare',
    subcategory: 'Moisturizer',
    rating: 4.7,
    reviews: 178
  }
];

const categories = ['All', 'Hair Care', 'Skincare', 'Home', 'Apparel'];
const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' }
];

const ProductsPage: React.FC = () => {
  usePageTitle('Shop All Products');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const categoryFromUrl = searchParams.get('category') || 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    categories: categoryFromUrl !== 'All' ? [categoryFromUrl] : [],
    priceRange: [0, 200],
    inStock: false,
    onSale: false,
    minRating: 0,
    brands: []
  });

  // Get unique brands from products
  const allBrands = useMemo(() => {
    const brands = new Set(mockProducts.map(p => p.brand));
    return Array.from(brands).sort();
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = mockProducts;

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    // Additional filters
    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0);
    }
    if (filters.onSale) {
      filtered = filtered.filter(p => p.discount);
    }
    if (filters.minRating > 0) {
      filtered = filtered.filter(p => p.rating >= filters.minRating);
    }
    if (filters.brands.length > 0) {
      filtered = filtered.filter(p => filters.brands.includes(p.brand));
    }
    filtered = filtered.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return filtered;
  }, [selectedCategory, searchQuery, filters, sortBy]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  const handleAddToCart = (productId: string) => {
    console.log('Add to cart:', productId);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistItems(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleBrandFilter = (brand: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: [0, 200],
      inStock: false,
      onSale: false,
      minRating: 0,
      brands: []
    });
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const activeFilterCount = 
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.brands.length > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 200 ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop All Products</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredProducts.length} products found
              </p>
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                showFilters
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={clsx(
                  "px-4 py-2 rounded-full whitespace-nowrap transition-colors",
                  selectedCategory === category
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear all
                  </button>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Price Range</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.priceRange[0]}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: [Number(e.target.value), prev.priceRange[1]]
                      }))}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                      min="0"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={filters.priceRange[1]}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: [prev.priceRange[0], Number(e.target.value)]
                      }))}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                      min="0"
                    />
                  </div>
                </div>

                {/* Availability */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Availability</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">In Stock Only</span>
                  </label>
                </div>

                {/* Deals */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Deals</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.onSale}
                      onChange={(e) => setFilters(prev => ({ ...prev, onSale: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">On Sale</span>
                  </label>
                </div>

                {/* Rating */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Customer Rating</h4>
                  <div className="space-y-2">
                    {[4, 3, 2, 1].map(rating => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          checked={filters.minRating === rating}
                          onChange={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={clsx(
                                "w-4 h-4",
                                i < rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">& up</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Brands</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.brands.includes(brand)}
                          onChange={() => toggleBrandFilter(brand)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="relative">
                    {/* Badges */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {product.isNew && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          NEW
                        </span>
                      )}
                      {product.isTrending && (
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          HOT
                        </span>
                      )}
                      {product.discount && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                          -{product.discount}%
                        </span>
                      )}
                    </div>
                    
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onQuickView={() => navigate(`/product/${product.id}`)}
                      isInWishlist={wishlistItems.includes(product.id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                    
                    {/* Product Meta */}
                    <div className="mt-2">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={clsx(
                                "w-3 h-3",
                                i < Math.floor(product.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          ({product.reviews})
                        </span>
                      </div>
                      {product.stock === 0 && (
                        <p className="text-xs text-red-600 dark:text-red-400">Out of stock</p>
                      )}
                      {product.stock > 0 && product.stock <= 5 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Only {product.stock} left
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredProducts.length > 0 && (
              <div className="text-center mt-8">
                <button className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Load More Products
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;