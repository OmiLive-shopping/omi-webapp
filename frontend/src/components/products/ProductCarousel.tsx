import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart,
  ShoppingCart,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Tag,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import clsx from 'clsx';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  stock: number;
  discount?: number;
  isOnSale?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

interface ProductCarouselProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistItems?: string[];
  showTimer?: boolean;
  saleEndTime?: Date;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  onAddToCart,
  onToggleWishlist,
  wishlistItems = [],
  showTimer = false,
  saleEndTime
}) => {
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Timer countdown
  useEffect(() => {
    if (!showTimer || !saleEndTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = saleEndTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Sale Ended');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [showTimer, saleEndTime]);

  const isInWishlist = (productId: string) => {
    return wishlistItems.includes(productId);
  };

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const scrollAmount = index * 320; // Approximate card width
      scrollContainerRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const handlePrevious = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(products.length - 1, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  return (
    <div className="w-full">
      {/* Sale Timer */}
      {showTimer && saleEndTime && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-semibold text-red-600 dark:text-red-400">
              Flash Sale Ends In:
            </span>
            <span className="font-mono text-lg text-red-600 dark:text-red-400">
              {timeLeft}
            </span>
          </div>
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={clsx(
            "absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg transition-opacity",
            currentIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentIndex >= products.length - 4}
          className={clsx(
            "absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg transition-opacity",
            currentIndex >= products.length - 4 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Products Container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-none w-80"
              onMouseEnter={() => setHoveredProductId(product.id)}
              onMouseLeave={() => setHoveredProductId(null)}
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden h-full flex flex-col">
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className={clsx(
                      "w-full h-full object-cover transition-transform duration-300",
                      hoveredProductId === product.id && "scale-105"
                    )}
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.isFeatured && (
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                        Featured
                      </span>
                    )}
                    {product.discount && product.discount > 0 && (
                      <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                        -{product.discount}%
                      </span>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="px-2 py-1 bg-orange-600 text-white text-xs font-semibold rounded">
                        Low Stock
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="px-2 py-1 bg-gray-600 text-white text-xs font-semibold rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  
                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(product.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-gray-900 transition-colors"
                  >
                    <Heart 
                      className={clsx(
                        "w-5 h-5 transition-colors",
                        isInWishlist(product.id) 
                          ? "fill-red-500 text-red-500" 
                          : "text-gray-600 dark:text-gray-400 hover:text-red-500"
                      )}
                    />
                  </button>
                  
                  {/* Quick View Overlay */}
                  {hoveredProductId === product.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
                      <button className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Quick View
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 p-4 flex flex-col">
                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {product.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {product.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          +{product.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  
                  <div className="mt-auto">
                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(product.price, product.currency)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(product.originalPrice, product.currency)}
                        </span>
                      )}
                    </div>
                    
                    {/* Stock Warning */}
                    {product.stock > 0 && product.stock <= 10 && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Only {product.stock} left in stock
                      </p>
                    )}
                    
                    {/* Add to Cart Button */}
                    <button
                      onClick={() => onAddToCart(product.id)}
                      disabled={product.stock === 0}
                      className={clsx(
                        "w-full py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2",
                        product.stock === 0
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                          : "bg-primary-600 text-white hover:bg-primary-700"
                      )}
                    >
                      {product.stock === 0 ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Out of Stock
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View All Products Link */}
      <div className="text-center mt-6">
        <button className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
          View All Products
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};