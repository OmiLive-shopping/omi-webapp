import React, { useState } from 'react';
import { 
  ShoppingCart,
  Eye,
  Tag,
  AlertCircle,
  Copy,
  Check,
  ImageOff
} from 'lucide-react';
import clsx from 'clsx';
import WishlistButton from './WishlistButton';

export interface Product {
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
  couponCode?: string;
  couponDiscount?: number;
}

interface ProductCardProps {
  product: Product;
  variant?: 'carousel' | 'grid' | 'list' | 'compact';
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  isInWishlist?: boolean;
  showCoupon?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  isInWishlist = false,
  showCoupon = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const handleCopyCoupon = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.couponCode) {
      try {
        await navigator.clipboard.writeText(product.couponCode);
        setCopiedCoupon(true);
        setTimeout(() => setCopiedCoupon(false), 2000);
      } catch (err) {
        console.error('Failed to copy coupon:', err);
      }
    }
  };


  const calculateDiscountedPrice = () => {
    if (product.couponDiscount) {
      return product.price * (1 - product.couponDiscount / 100);
    }
    return product.price;
  };

  // List variant
  if (variant === 'list') {
    return (
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative w-32 h-32 flex-shrink-0">
            {imageError ? (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <ImageOff className="w-8 h-8 text-gray-400" />
              </div>
            ) : (
              <img 
                src={product.image} 
                alt={product.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover rounded-lg"
              />
            )}
            {/* Badges */}
            {product.discount && product.discount > 0 && (
              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
                -{product.discount}%
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {product.description}
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <WishlistButton
                  productId={product.id}
                  isInWishlist={isInWishlist}
                  size="md"
                  onToggleWishlist={onToggleWishlist}
                />
                {onQuickView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickView(product.id);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto pt-2">
              {/* Price */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatPrice(calculateDiscountedPrice(), product.currency)}
                  </span>
                  {(product.originalPrice || product.couponDiscount) && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.originalPrice || product.price, product.currency)}
                    </span>
                  )}
                </div>
                {product.stock > 0 && product.stock <= 10 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Only {product.stock} left
                  </p>
                )}
              </div>

              {/* Add to Cart */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product.id);
                }}
                disabled={product.stock === 0}
                className={clsx(
                  "px-4 py-2 rounded-lg font-semibold transition-colors text-sm",
                  product.stock === 0
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-primary-600 text-white hover:bg-primary-700"
                )}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

            {/* Coupon */}
            {showCoupon && product.couponCode && (
              <div className="mt-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {product.couponDiscount}% off with code:
                </span>
                <button
                  onClick={handleCopyCoupon}
                  className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm font-mono hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                  {product.couponCode}
                  {copiedCoupon ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (like the reference image)
  if (variant === 'compact') {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200" style={{ backgroundColor: '#EAE7E2' }}>
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
          {imageError ? (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-gray-300" />
            </div>
          ) : (
            <img 
              src={product.image} 
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Small stock indicator in top left */}
          {product.stock > 0 && product.stock <= 10 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
              {product.stock} left
            </div>
          )}
          
          {/* Wishlist button in top right */}
          <div className="absolute top-2 right-2">
            <WishlistButton
              productId={product.id}
              isInWishlist={isInWishlist}
              size="sm"
              onToggleWishlist={onToggleWishlist}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 shadow-sm"
            />
          </div>

          {/* Small viewer count indicator like in reference */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 text-white rounded-full">
            <Eye className="w-3 h-3" />
            <span className="text-xs">{Math.floor(Math.random() * 50 + 10)}</span>
          </div>
        </div>
        
        {/* Compact Product Info */}
        <div className="p-3">
          <p className="text-xs text-gray-600 mb-1">
            {product.description}
          </p>
          
          <h3 className="font-medium text-sm text-gray-800 line-clamp-2 mb-2">
            {product.name}
          </h3>
          
          {/* Compact footer with price and cart icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold text-gray-800">
                {formatPrice(calculateDiscountedPrice(), product.currency)}
              </span>
              {(product.originalPrice || product.couponDiscount) && (
                <span className="text-xs text-gray-500 line-through">
                  {formatPrice(product.originalPrice || product.price, product.currency)}
                </span>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product.id);
              }}
              disabled={product.stock === 0}
              className={clsx(
                "p-1.5 rounded-full transition-colors",
                product.stock === 0
                  ? "bg-white/50 text-gray-400 cursor-not-allowed"
                  : "bg-white/70 text-gray-700 hover:bg-white/90"
              )}
              aria-label="Add to cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid and Carousel variants (card style)
  const cardClasses = clsx(
    "bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden h-full flex flex-col",
    variant === 'carousel' && "w-80"
  );

  return (
    <div
      className={cardClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-12 h-12 text-gray-400" />
          </div>
        ) : (
          <img 
            src={product.image} 
            alt={product.name}
            onError={() => setImageError(true)}
            className={clsx(
              "w-full h-full object-cover transition-transform duration-300",
              isHovered && "scale-105"
            )}
          />
        )}
        
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
        <div className="absolute top-2 right-2">
          <WishlistButton
            productId={product.id}
            isInWishlist={isInWishlist}
            size="md"
            onToggleWishlist={onToggleWishlist}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900"
          />
        </div>
        
        {/* Quick View Overlay */}
        {isHovered && onQuickView && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product.id);
              }}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
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

        {/* Coupon Code */}
        {showCoupon && product.couponCode && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                  {product.couponDiscount}% OFF
                </span>
              </div>
              <button
                onClick={handleCopyCoupon}
                className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white rounded text-xs font-mono hover:bg-green-700 transition-colors"
              >
                {product.couponCode}
                {copiedCoupon ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-auto">
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {formatPrice(calculateDiscountedPrice(), product.currency)}
            </span>
            {(product.originalPrice || product.couponDiscount) && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.originalPrice || product.price, product.currency)}
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
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product.id);
            }}
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
  );
};

export default ProductCard;