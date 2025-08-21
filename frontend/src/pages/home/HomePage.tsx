import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';
import ProductCard from '@/components/products/ProductCard';
import { LivestreamCard } from '@/components/stream/LivestreamCard';
import { ChevronLeft, ChevronRight, Play, Eye, Calendar } from 'lucide-react';
import clsx from 'clsx';

// Hero carousel data
const heroSlides = [
  {
    id: 1,
    title: 'My Eco-Friendly Hair Care Faves this Spring',
    streamer: 'Maria Salvidar',
    viewers: 1432,
    products: ['Hair', 'Vinamalita Local', 'Paraben-Free', 'Jumbo'],
    image: 'https://images.unsplash.com/photo-1576828831022-ca41d3905fb7?w=1200',
    isLive: true
  },
  {
    id: 2,
    title: 'Summer Skincare Essentials',
    streamer: 'Beauty Expert',
    viewers: 892,
    products: ['Skincare', 'Natural', 'SPF Protection'],
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
    isLive: true
  },
  {
    id: 3,
    title: 'Home Decor Must-Haves',
    streamer: 'Interior Designer',
    viewers: 567,
    products: ['Home', 'Decor', 'Sustainable'],
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200',
    isLive: false
  }
];

// Live and upcoming streams data
const liveStreams = [
  {
    id: '1',
    title: 'My Eco-Friendly Hair Care Faves this Spring',
    hostName: 'Maria Salvidar',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&h=450&fit=crop',
    isLive: true,
    viewerCount: 1234,
    category: 'Beauty'
  },
  {
    id: '2',
    title: 'Summer Skincare Routine for Glowing Skin',
    hostName: 'Emma Chen',
    hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=450&fit=crop',
    isLive: true,
    viewerCount: 856,
    category: 'Skincare'
  },
  {
    id: '3',
    title: 'Natural Makeup Tutorial: No-Makeup Look',
    hostName: 'Sophie Anderson',
    thumbnail: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=450&fit=crop',
    isLive: false,
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    category: 'Makeup'
  },
  {
    id: '4',
    title: 'DIY Hair Masks with Kitchen Ingredients',
    hostName: 'Zara Williams',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=450&fit=crop',
    isLive: false,
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    category: 'Hair Care'
  }
];

// Categories data
const categories = [
  {
    id: 'haircare',
    name: 'Hair Care',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400',
    link: '/products?category=haircare'
  },
  {
    id: 'home',
    name: 'Home',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    link: '/products?category=home'
  },
  {
    id: 'apparel',
    name: 'Apparel',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
    link: '/products?category=apparel'
  }
];

// Popular products data
const popularProducts = [
  {
    id: '1',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 12.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    stock: 15,
    timeLeft: '23h',
    viewers: 23
  },
  {
    id: '2',
    name: 'White Tea Shampoo and Conditioner',
    brand: 'Westin Hotels',
    price: 24.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400',
    stock: 8,
    timeLeft: '12h',
    viewers: 54,
    isHot: true
  },
  {
    id: '3',
    name: 'The Ordinary Shampoo and Conditioner',
    brand: 'The Ordinary',
    price: 18.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    stock: 30,
    timeLeft: '8h',
    viewers: 11
  },
  {
    id: '4',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 14.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
    stock: 12,
    timeLeft: '22h',
    viewers: 32
  },
  {
    id: '5',
    name: 'White Tea Shampoo and Conditioner',
    brand: 'Westin Hotels',
    price: 22.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=400',
    stock: 5,
    timeLeft: '6h',
    viewers: 41
  },
  {
    id: '6',
    name: 'The Ordinary Shampoo and Conditioner',
    brand: 'The Ordinary',
    price: 16.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400',
    stock: 20,
    timeLeft: '8h',
    viewers: 62
  },
  {
    id: '7',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 13.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1571781418606-70265b9cce90?w=400',
    stock: 10,
    timeLeft: '9h',
    viewers: 50
  },
  {
    id: '8',
    name: 'Gold Series: Moisture Boost Conditioner',
    brand: 'Pantene Shampoo',
    price: 15.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400',
    stock: 18,
    timeLeft: '11h',
    viewers: 80
  }
];

const HomePage: React.FC = () => {
  usePageTitle('Home');
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Carousel */}
      <section className="relative h-[500px] overflow-hidden">
        <div className="relative h-full">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={clsx(
                "absolute inset-0 transition-opacity duration-1000",
                index === currentSlide ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="relative h-full">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                
                <div className="absolute inset-0 flex items-center">
                  <div className="container mx-auto px-4">
                    <div className="max-w-2xl">
                      {slide.isLive && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded-full mb-4">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          LIVE
                        </div>
                      )}
                      
                      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        {slide.title}
                      </h1>
                      
                      <div className="flex items-center gap-4 text-white mb-6">
                        <span className="flex items-center gap-2">
                          <img
                            src={`https://ui-avatars.com/api/?name=${slide.streamer}&background=random`}
                            alt={slide.streamer}
                            className="w-8 h-8 rounded-full"
                          />
                          hosted by {slide.streamer}
                        </span>
                        {slide.isLive && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {slide.viewers.toLocaleString()} watching
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-8">
                        {slide.products.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => navigate('/live-streams')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        {slide.isLive ? (
                          <>
                            Tune In
                            <Play className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            View Schedule
                            <Calendar className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Controls */}
        <button
          onClick={goToPrevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goToNextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={clsx(
                "w-2 h-2 rounded-full transition-all",
                index === currentSlide
                  ? "w-8 bg-white"
                  : "bg-white/50 hover:bg-white/70"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Live and Upcoming Streams */}
      <section className="py-12 container mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Live and Upcoming Streams
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {liveStreams.map((stream) => (
            <LivestreamCard
              key={stream.id}
              {...stream}
            />
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/live-streams"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Show More →
          </Link>
        </div>
      </section>

      {/* Streams and Products by Category */}
      <section className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Streams and Products by Category
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={category.link}
                className="group"
              >
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {category.name}
                    </h3>
                    <span className="text-white/90 group-hover:text-white transition-colors">
                      View →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="py-12 container mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Popular Products
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {popularProducts.map((product) => (
            <div key={product.id} className="relative">
              {product.isHot && (
                <div className="absolute -top-2 -right-2 z-10 px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
                  HOT!
                </div>
              )}
              <ProductCard
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  currency: product.currency,
                  image: product.image,
                  description: product.brand,
                  stock: product.stock
                }}
                onAddToCart={handleAddToCart}
                onQuickView={() => navigate(`/product/${product.id}`)}
                isInWishlist={wishlistItems.includes(product.id)}
                onToggleWishlist={handleToggleWishlist}
              />
              
              {/* Product Meta Info */}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  {product.viewers}
                </span>
                <span>{product.timeLeft}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/products"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Show More →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;