import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  Star, 
  Filter,
  ChevronDown,
  Share2,
  Bell,
  BellOff,
  Play
} from 'lucide-react';

interface WishlistItem {
  id: number;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  addedDate: string;
  category: string;
  priceAlert: boolean;
  streamer?: {
    id: number;
    name: string;
    isLive: boolean;
  };
}

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Mock wishlist data
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([
    {
      id: 2,
      title: "Smart Watch Pro",
      price: 249.99,
      image: "/placeholder-product.jpg",
      rating: 4.3,
      reviews: 189,
      inStock: true,
      addedDate: "1 week ago",
      category: "Electronics",
      priceAlert: false
    },
    {
      id: 3,
      title: "Yoga Mat Premium",
      price: 49.99,
      originalPrice: 79.99,
      image: "/placeholder-product.jpg",
      rating: 4.7,
      reviews: 567,
      inStock: false,
      addedDate: "2 weeks ago",
      category: "Sports",
      priceAlert: true
    },
    {
      id: 4,
      title: "Coffee Maker Deluxe",
      price: 149.99,
      image: "/placeholder-product.jpg",
      rating: 4.6,
      reviews: 234,
      inStock: true,
      addedDate: "3 weeks ago",
      category: "Home",
      priceAlert: false
    }
  ]);

  const categories = ['all', 'Electronics', 'Sports', 'Home', 'Fashion', 'Beauty'];
  
  const handleRemoveItem = (id: number) => {
    setWishlistItems(wishlistItems.filter(item => item.id !== id));
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  };

  const handleRemoveSelected = () => {
    setWishlistItems(wishlistItems.filter(item => !selectedItems.includes(item.id)));
    setSelectedItems([]);
  };

  const handleToggleSelect = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleTogglePriceAlert = (id: number) => {
    setWishlistItems(wishlistItems.map(item => 
      item.id === id ? { ...item, priceAlert: !item.priceAlert } : item
    ));
  };

  const handleAddToCart = (item: WishlistItem) => {
    console.log('Adding to cart:', item.id);
    handleRemoveItem(item.id);
  };

  const handleAddAllToCart = () => {
    const inStockItems = filteredItems.filter(item => item.inStock);
    console.log('Adding all to cart:', inStockItems.map(item => item.id));
    setWishlistItems(wishlistItems.filter(item => !inStockItems.some(inStock => inStock.id === item.id)));
  };

  // Filter and sort items
  const filteredItems = wishlistItems
    .filter(item => filterCategory === 'all' || item.category === filterCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return 0; // Would sort by actual date in real app
        case 'oldest':
          return 0; // Would sort by actual date in real app
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  const totalValue = filteredItems.reduce((sum, item) => sum + item.price, 0);
  const totalSavings = filteredItems.reduce((sum, item) => {
    return sum + (item.originalPrice ? item.originalPrice - item.price : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">My Wishlist</h1>
          <p className="text-gray-600 dark:text-gray-400">{filteredItems.length} items saved</p>
        </div>

        {/* Stats Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Potential Savings</p>
              <p className="text-2xl font-bold text-green-500 dark:text-green-400">${totalSavings.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Price Alerts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{wishlistItems.filter(item => item.priceAlert).length} active</p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Select All */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Select All</span>
            </label>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRemoveSelected}
                  className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove Selected ({selectedItems.length})
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Filter */}
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Filter className="w-4 h-4" />
                <span>{filterCategory === 'all' ? 'All Categories' : filterCategory}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setFilterCategory(category);
                        setShowFilters(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>

            {/* Add All to Cart */}
            <button 
              onClick={handleAddAllToCart}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Add All to Cart
            </button>
          </div>
        </div>

        {/* Wishlist Items */}
        {filteredItems.length > 0 ? (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 shadow-sm"
              >
                {/* Checkbox */}
                <div className="flex items-start">
                  <input 
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleToggleSelect(item.id)}
                    className="w-4 h-4 mt-1 text-primary-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                  />
                </div>

                {/* Product Image */}
                <div className="relative w-full md:w-32 h-32 flex-shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => navigate(`/products/${item.id}`)}
                  />
                  {item.streamer?.isLive && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                      <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse mr-1"></span>
                      LIVE
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <div className="mb-2">
                    <h3 
                      className="text-lg font-semibold mb-1 text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => navigate(`/products/${item.id}`)}
                    >
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < Math.floor(item.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} 
                            />
                          ))}
                        </div>
                        <span>({item.reviews})</span>
                      </div>
                      <span>Added {item.addedDate}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">${item.price}</span>
                    {item.originalPrice && (
                      <>
                        <span className="text-gray-500 dark:text-gray-400 line-through">${item.originalPrice}</span>
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs">
                          {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center gap-4 mb-3">
                    {item.inStock ? (
                      <span className="text-green-400 text-sm">✓ In Stock</span>
                    ) : (
                      <span className="text-red-400 text-sm">Out of Stock</span>
                    )}
                    {item.streamer && (
                      <button 
                        onClick={() => navigate(`/stream/${item.streamer!.id}`)}
                        className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Watch {item.streamer.name}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                        item.inStock 
                          ? 'bg-primary-600 text-white hover:bg-primary-700' 
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>

                    <button 
                      onClick={() => handleTogglePriceAlert(item.id)}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${
                        item.priceAlert 
                          ? 'border-primary-500 text-primary-500 dark:text-primary-400' 
                          : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      {item.priceAlert ? (
                        <>
                          <Bell className="w-4 h-4" />
                          Price Alert On
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4" />
                          Price Alert Off
                        </>
                      )}
                    </button>

                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
            <Heart className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Your wishlist is empty</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start adding items you love to keep track of them</p>
            <button 
              onClick={() => navigate('/products')}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Browse Products
            </button>
          </div>
        )}

        {/* Recommendations */}
        {filteredItems.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-transform shadow-sm"
                  onClick={() => navigate(`/products/${i + 10}`)}
                >
                  <img 
                    src="/placeholder-product.jpg" 
                    alt="Product"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-2 text-gray-900 dark:text-white">Recommended Product {i}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">(89)</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">$99.99</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;