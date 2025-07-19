import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';
import { ViewerPlayer } from '@/components/stream/ViewerPlayer';
import { ProductCarousel } from '@/components/products/ProductCarousel';
import { TrendingUp, Users, ShoppingBag, Calendar } from 'lucide-react';

// Mock data for demonstration
const mockProducts = [
  {
    id: '1',
    name: 'Premium Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 299.99,
    originalPrice: 399.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    stock: 5,
    discount: 25,
    isOnSale: true,
    isFeatured: true,
    tags: ['Electronics', 'Audio', 'Premium']
  },
  {
    id: '2',
    name: 'Smart Watch Pro',
    description: 'Advanced fitness tracking and health monitoring',
    price: 449.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    stock: 12,
    isFeatured: true,
    tags: ['Electronics', 'Wearables', 'Fitness']
  },
  {
    id: '3',
    name: 'Portable Speaker',
    description: 'Waterproof Bluetooth speaker with 20-hour battery',
    price: 79.99,
    originalPrice: 99.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    stock: 0,
    discount: 20,
    isOnSale: true,
    tags: ['Electronics', 'Audio']
  },
  {
    id: '4',
    name: 'Gaming Keyboard',
    description: 'RGB mechanical keyboard for gaming enthusiasts',
    price: 159.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
    stock: 8,
    tags: ['Gaming', 'Accessories']
  },
  {
    id: '5',
    name: 'Webcam HD',
    description: '1080p webcam perfect for streaming',
    price: 89.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1596495717926-089dd69a4722?w=400',
    stock: 15,
    tags: ['Streaming', 'Electronics']
  }
];

const featuredStreams = [
  {
    id: '1',
    streamKey: 'demo-stream-1',
    title: 'Tech Review Tuesday',
    streamerName: 'TechGuru',
    viewerCount: 1234,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600'
  },
  {
    id: '2',
    streamKey: 'demo-stream-2',
    title: 'Fashion Week Special',
    streamerName: 'StyleMaster',
    viewerCount: 856,
    isLive: true,
    thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600'
  },
  {
    id: '3',
    streamKey: 'demo-stream-3',
    title: 'Gaming Marathon',
    streamerName: 'ProGamer123',
    viewerCount: 2341,
    isLive: false,
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600'
  }
];

const HomePage: React.FC = () => {
  usePageTitle('Home');
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);

  const handleAddToCart = (productId: string) => {
    console.log('Add to cart:', productId);
    // TODO: Implement cart functionality
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistItems(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-5xl font-bold mb-4">Welcome to OMI Live</h1>
            <p className="text-xl mb-8 text-primary-100">
              Your platform for live streaming shopping experiences. Watch, interact, and shop in real-time.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/streams" 
                className="px-6 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                Browse Live Streams
              </Link>
              <Link 
                to="/studio" 
                className="px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-900 transition-colors inline-flex items-center gap-2 border border-primary-500"
              >
                <Users className="w-5 h-5" />
                Start Streaming
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">10K+</div>
              <div className="text-gray-600 dark:text-gray-400">Active Streamers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">500K+</div>
              <div className="text-gray-600 dark:text-gray-400">Products Sold</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">2M+</div>
              <div className="text-gray-600 dark:text-gray-400">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">Live Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Streams */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Featured Streams</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Watch the hottest live shopping streams</p>
            </div>
            <Link 
              to="/streams" 
              className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              View All
              <span className="text-xl">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredStreams.map((stream) => (
              <Link 
                key={stream.id} 
                to={`/stream/${stream.id}`}
                className="group block"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
                  {stream.isLive ? (
                    <ViewerPlayer
                      streamKey={stream.streamKey}
                      viewerCount={stream.viewerCount}
                      isLive={stream.isLive}
                      streamTitle={stream.title}
                      streamerName={stream.streamerName}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <img 
                        src={stream.thumbnail} 
                        alt={stream.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Calendar className="w-12 h-12 mx-auto mb-2" />
                          <p>Stream Offline</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white font-semibold">{stream.title}</h3>
                    <p className="text-gray-300 text-sm">{stream.streamerName}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Trending Products</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Hot deals from today's live streams</p>
            </div>
            <Link 
              to="/products" 
              className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              <ShoppingBag className="w-5 h-5" />
              Shop All
            </Link>
          </div>

          <ProductCarousel
            products={mockProducts}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistItems={wishlistItems}
            showTimer={true}
            saleEndTime={new Date(Date.now() + 3600000 * 24)} // 24 hours from now
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Streaming?</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are revolutionizing online shopping with live streaming.
          </p>
          <Link 
            to="/auth" 
            className="px-8 py-4 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2 text-lg"
          >
            Get Started Free
            <span className="text-xl">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;