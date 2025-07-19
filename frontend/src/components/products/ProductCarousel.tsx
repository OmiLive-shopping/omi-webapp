import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import ProductCard, { Product } from './ProductCard';

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
            <div key={product.id} className="flex-none">
              <ProductCard
                product={product}
                variant="carousel"
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                isInWishlist={wishlistItems.includes(product.id)}
                showCoupon={true}
              />
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