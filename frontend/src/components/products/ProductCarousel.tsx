import React, { useState } from 'react';
import { 
  Carousel, 
  Card, 
  Image, 
  Button, 
  IconButton, 
  Price,
  Badge,
  Text,
  Heading,
  Timer,
  Tooltip,
  Icon
} from '@bolt/ui';

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

  const isInWishlist = (productId: string) => {
    return wishlistItems.includes(productId);
  };

  const calculateDiscountPercentage = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  return (
    <div className="w-full">
      {showTimer && saleEndTime && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
            <Icon name="clock" size="sm" className="text-red-600 dark:text-red-400" />
            <Text weight="semibold" className="text-red-600 dark:text-red-400">
              Flash Sale Ends In:
            </Text>
            <Timer
              endTime={saleEndTime}
              format="DD:HH:MM:SS"
              onExpire={() => console.log('Sale ended!')}
              className="font-mono text-red-600 dark:text-red-400"
            />
          </div>
        </div>
      )}

      <Carousel
        items={products}
        itemsPerView={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
        spacing={4}
        autoPlay={products.length > 5}
        loop
        showControls
        showIndicators
        className="pb-8"
      >
        {(product) => (
          <Card 
            hoverable
            className="h-full flex flex-col"
            onMouseEnter={() => setHoveredProductId(product.id)}
            onMouseLeave={() => setHoveredProductId(null)}
          >
            <Card.Media className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300"
                style={{
                  transform: hoveredProductId === product.id ? 'scale(1.05)' : 'scale(1)'
                }}
              />
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.isFeatured && (
                  <Badge variant="primary" size="sm">
                    Featured
                  </Badge>
                )}
                {product.discount && product.discount > 0 && (
                  <Badge variant="danger" size="sm">
                    -{product.discount}%
                  </Badge>
                )}
                {product.stock <= 5 && product.stock > 0 && (
                  <Badge variant="warning" size="sm">
                    Low Stock
                  </Badge>
                )}
                {product.stock === 0 && (
                  <Badge variant="default" size="sm">
                    Out of Stock
                  </Badge>
                )}
              </div>
              
              {/* Wishlist Button */}
              <Card.MediaOverlay position="top-right" className="p-2">
                <Tooltip content={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}>
                  <IconButton
                    icon={isInWishlist(product.id) ? "heart" : "heart"}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(product.id);
                    }}
                    className={`
                      bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
                      ${isInWishlist(product.id) ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}
                      hover:text-red-500 transition-colors
                    `}
                  />
                </Tooltip>
              </Card.MediaOverlay>
              
              {/* Quick View on Hover */}
              {hoveredProductId === product.id && (
                <Card.MediaOverlay className="bg-black/50 flex items-center justify-center">
                  <Button variant="secondary" size="sm">
                    <Icon name="eye" size="sm" className="mr-2" />
                    Quick View
                  </Button>
                </Card.MediaOverlay>
              )}
            </Card.Media>
            
            <Card.Body className="flex-1 flex flex-col">
              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex gap-1 mb-2">
                  {product.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" size="xs">
                      {tag}
                    </Badge>
                  ))}
                  {product.tags.length > 2 && (
                    <Badge variant="outline" size="xs">
                      +{product.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
              
              <Card.Title className="text-sm line-clamp-2 flex-1">
                {product.name}
              </Card.Title>
              
              <Text variant="muted" size="xs" className="line-clamp-2 mb-3">
                {product.description}
              </Text>
              
              <div className="mt-auto">
                <Price 
                  value={product.price} 
                  currency={product.currency}
                  size="lg"
                  showOriginal={product.originalPrice}
                  originalValue={product.originalPrice}
                  className="mb-3"
                />
                
                {product.stock > 0 && product.stock <= 10 && (
                  <Text variant="warning" size="xs" className="mb-2">
                    Only {product.stock} left in stock
                  </Text>
                )}
              </div>
            </Card.Body>
            
            <Card.Footer>
              <Button 
                variant="primary" 
                size="sm" 
                fullWidth
                disabled={product.stock === 0}
                onClick={() => onAddToCart(product.id)}
              >
                {product.stock === 0 ? (
                  <>
                    <Icon name="x-circle" size="sm" className="mr-2" />
                    Out of Stock
                  </>
                ) : (
                  <>
                    <Icon name="shopping-cart" size="sm" className="mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        )}
      </Carousel>
      
      {/* View All Products Link */}
      <div className="text-center mt-4">
        <Button variant="outline" size="sm">
          View All Products
          <Icon name="arrow-right" size="sm" className="ml-2" />
        </Button>
      </div>
    </div>
  );
};