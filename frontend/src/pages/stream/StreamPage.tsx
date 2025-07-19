import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ViewerPlayer } from '@/components/stream/ViewerPlayer';
import EnhancedChatContainer from '@/components/chat/EnhancedChatContainer';
import ProductCard from '@/components/products/ProductCard';
import ViewerCount from '@/components/stream/ViewerCount';
import { ChevronLeft, Share2, Heart, Bell, MoreVertical } from 'lucide-react';
import clsx from 'clsx';

interface StreamData {
  id: string;
  title: string;
  streamerName: string;
  streamerAvatar?: string;
  viewerCount: number;
  category: string;
  isLive: boolean;
  startedAt?: Date;
  description?: string;
  tags?: string[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  stock: number;
  discount?: number;
}

const StreamPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [showDescription, setShowDescription] = useState(false);

  // Mock stream data - replace with real API call
  const streamData: StreamData = {
    id: streamId || '1',
    title: 'My Eco-Friendly Hair Care Faves this Spring',
    streamerName: 'Maria Salvidar',
    streamerAvatar: 'https://ui-avatars.com/api/?name=Maria+Salvidar&background=random',
    viewerCount: 1432,
    category: 'Beauty & Personal Care',
    isLive: true,
    startedAt: new Date(Date.now() - 45 * 60 * 1000),
    description: 'Join me as I share my favorite eco-friendly hair care products that have transformed my hair routine! I\'ll be demonstrating techniques and answering your questions live.',
    tags: ['Hair Care', 'Eco-Friendly', 'Natural Products', 'Spring Beauty']
  };

  // Mock products data
  const featuredProducts: Product[] = [
    {
      id: '1',
      name: 'Pantene Gold Series: Moisture Boost Conditioner',
      price: 12.99,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
      description: 'Professional hair care for moisture and shine',
      stock: 15,
      discount: 20
    },
    {
      id: '2',
      name: 'White Tea Shampoo and Conditioner Set',
      price: 24.99,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400',
      description: 'Gentle cleansing with white tea extract',
      stock: 8
    },
    {
      id: '3',
      name: 'The Ordinary Hair Serum',
      price: 18.99,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
      description: 'Lightweight serum for all hair types',
      stock: 12
    },
    {
      id: '4',
      name: 'Eco-Friendly Bamboo Hair Brush',
      price: 14.99,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400',
      description: 'Sustainable bamboo brush with natural bristles',
      stock: 20
    }
  ];

  // Initialize mock chat data
  useEffect(() => {
    // Mock viewers
    const mockViewers = [
      { id: '1', username: streamData.streamerName, role: 'streamer', isOnline: true },
      { id: '2', username: 'ModeratorMike', role: 'moderator', isOnline: true },
      { id: '3', username: 'ViewerVicky', role: 'viewer', isOnline: true },
      { id: '4', username: 'ChatterChris', role: 'viewer', isOnline: true },
      { id: '5', username: 'BeautyFan22', role: 'viewer', isOnline: true },
      { id: 'current-user', username: 'You', role: 'viewer', isOnline: true }
    ];
    setViewers(mockViewers);

    // Mock initial messages
    const mockMessages = [
      {
        id: '1',
        user: mockViewers[0],
        content: 'Welcome everyone! Today we\'re talking about eco-friendly hair care 🌿',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        isPinned: true
      },
      {
        id: '2',
        user: mockViewers[2],
        content: 'So excited for this stream!',
        timestamp: new Date(Date.now() - 8 * 60 * 1000)
      },
      {
        id: '3',
        user: mockViewers[4],
        content: 'Can you show the bamboo brush up close?',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: '4',
        user: mockViewers[0],
        content: 'Absolutely! Let me grab it',
        timestamp: new Date(Date.now() - 4 * 60 * 1000)
      }
    ];
    setMessages(mockMessages);
  }, [streamId]);

  // Handle sending message
  const handleSendMessage = (content: string, mentions?: string[]) => {
    const newMessage = {
      id: Date.now().toString(),
      user: viewers.find(v => v.id === 'current-user'),
      content,
      timestamp: new Date(),
      mentions
    };
    setMessages(prev => [...prev, newMessage]);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/live-streams')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Back to streams"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <img
                  src={streamData.streamerAvatar}
                  alt={streamData.streamerName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h1 className="font-semibold text-gray-900 dark:text-white">
                    {streamData.streamerName}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {streamData.category}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  isFollowing
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    : "bg-primary-600 text-white hover:bg-primary-700"
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              
              <button
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                  isSubscribed
                    ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                )}
              >
                <Bell className="w-4 h-4" />
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>

              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Share stream"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video and Info Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <ViewerPlayer 
              streamKey={streamData.id}
              viewerCount={streamData.viewerCount}
              isLive={streamData.isLive}
              streamTitle={streamData.title}
              streamerName={streamData.streamerName}
            />

            {/* Stream Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {streamData.title}
                  </h2>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <ViewerCount 
                      count={streamData.viewerCount} 
                      showTrend={true}
                      variant="compact"
                    />
                    {streamData.startedAt && (
                      <span>
                        Started {Math.floor((Date.now() - streamData.startedAt.getTime()) / 1000 / 60)} minutes ago
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {streamData.tags && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {streamData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div>
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-2"
                >
                  {showDescription ? 'Hide' : 'Show'} Description
                </button>
                {showDescription && streamData.description && (
                  <p className="text-gray-700 dark:text-gray-300">
                    {streamData.description}
                  </p>
                )}
              </div>
            </div>

            {/* Featured Products */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Featured in this Stream
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featuredProducts.map(product => (
                  <div key={product.id} className="relative">
                    {product.discount && (
                      <div className="absolute -top-2 -right-2 z-10 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        -{product.discount}%
                      </div>
                    )}
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onQuickView={() => navigate(`/product/${product.id}`)}
                      isInWishlist={wishlistItems.includes(product.id)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Related Streams */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                More from {streamData.streamerName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <Link
                    key={i}
                    to={`/stream/${i + 10}`}
                    className="group"
                  >
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 relative overflow-hidden">
                      <img
                        src={`https://images.unsplash.com/photo-${i === 1 ? '1522337660859-02fbefca4702' : '1560869713-da86a9ec0744'}?w=400`}
                        alt="Stream thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        2 days ago
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      {i === 1 ? 'Spring Skincare Routine' : 'Natural Hair Products Review'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {i === 1 ? '45K views' : '32K views'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[calc(100vh-200px)] sticky top-20 flex flex-col">
              <EnhancedChatContainer
                streamId={streamData.id}
                viewerCount={streamData.viewerCount}
                messages={messages}
                viewers={viewers}
                currentUser={viewers.find(v => v.id === 'current-user')}
                onSendMessage={handleSendMessage}
                showViewerList={false}
                maxMessagesPerMinute={10}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamPage;