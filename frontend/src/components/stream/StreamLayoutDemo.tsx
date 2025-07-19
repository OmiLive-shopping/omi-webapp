import React, { useState } from 'react';
import StreamLayout, { LayoutMode } from './StreamLayout';
import { ViewerPlayer } from './ViewerPlayer';
import EnhancedChatContainer from '../chat/EnhancedChatContainer';
import ProductCard from '../products/ProductCard';
import { Video } from 'lucide-react';

// Mock data
const mockProducts = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 149.99,
    currency: 'USD',
    image: 'https://via.placeholder.com/200x200?text=Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    stock: 15,
    originalPrice: 199.99
  },
  {
    id: '2',
    name: 'Smart Watch Pro',
    price: 299.99,
    currency: 'USD',
    image: 'https://via.placeholder.com/200x200?text=Smart+Watch',
    description: 'Advanced fitness tracking and health monitoring',
    stock: 8,
    originalPrice: 399.99
  },
  {
    id: '3',
    name: 'Gaming Keyboard RGB',
    price: 89.99,
    currency: 'USD',
    image: 'https://via.placeholder.com/200x200?text=Keyboard',
    description: 'Mechanical gaming keyboard with customizable RGB lighting',
    stock: 25
  },
  {
    id: '4',
    name: 'Webcam HD 1080p',
    price: 59.99,
    currency: 'USD',
    image: 'https://via.placeholder.com/200x200?text=Webcam',
    description: 'Crystal clear video for streaming and video calls',
    stock: 30
  },
  {
    id: '5',
    name: 'USB Microphone',
    price: 79.99,
    currency: 'USD',
    image: 'https://via.placeholder.com/200x200?text=Microphone',
    description: 'Professional quality USB microphone for content creators',
    stock: 12
  }
];

const mockMessages = [
  {
    id: '1',
    user: { id: 'streamer', username: 'StreamerGuy', role: 'streamer' as const },
    content: 'Welcome everyone to today\'s stream! 🎉',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    isPinned: true
  },
  {
    id: '2',
    user: { id: 'viewer1', username: 'ViewerVicky', role: 'viewer' as const },
    content: 'First! Excited for the stream!',
    timestamp: new Date(Date.now() - 9 * 60 * 1000)
  },
  {
    id: '3',
    user: { id: 'mod', username: 'ModeratorMike', role: 'moderator' as const },
    content: 'Don\'t forget to check out the products below!',
    timestamp: new Date(Date.now() - 8 * 60 * 1000)
  }
];

const mockViewers = [
  { id: 'streamer', username: 'StreamerGuy', role: 'streamer' as const, isOnline: true },
  { id: 'mod', username: 'ModeratorMike', role: 'moderator' as const, isOnline: true },
  { id: 'viewer1', username: 'ViewerVicky', role: 'viewer' as const, isOnline: true },
  { id: 'current-user', username: 'You', role: 'viewer' as const, isOnline: true }
];

export const StreamLayoutDemo: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<LayoutMode>('default');
  const [messages, setMessages] = useState(mockMessages);
  const [showProductsInTheater, setShowProductsInTheater] = useState(false);

  const handleSendMessage = (content: string, mentions?: string[]) => {
    const newMessage = {
      id: Date.now().toString(),
      user: mockViewers.find(v => v.id === 'current-user')!,
      content,
      timestamp: new Date(),
      mentions
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Video component
  const videoComponent = (
    <ViewerPlayer
      streamKey="demo-stream"
      viewerCount={1250}
      isLive={true}
      streamTitle="Building Amazing Products Live!"
      streamerName="StreamerGuy"
    />
  );

  // Chat component
  const chatComponent = (
    <EnhancedChatContainer
      streamId="demo-stream"
      viewerCount={1250}
      messages={messages}
      viewers={mockViewers}
      currentUser={mockViewers.find(v => v.id === 'current-user')}
      onSendMessage={handleSendMessage}
      showViewerList={false}
      maxMessagesPerMinute={10}
    />
  );

  // Products component
  const productsComponent = (
    <div className="h-full">
      <div className="flex items-center gap-4 h-full px-4">
        {mockProducts.map(product => (
          <div key={product.id} className="flex-shrink-0 w-48">
            <ProductCard
              product={product}
              onAddToCart={() => console.log('Add to cart:', product.name)}
              onQuickView={() => console.log('Quick view:', product.name)}
              isInWishlist={false}
              onToggleWishlist={() => console.log('Toggle wishlist:', product.name)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Demo Header */}
      {currentMode !== 'fullscreen' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Stream Layout Demo
            </h1>
            
            <div className="space-y-4">
              {/* Mode Info */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Current Mode:
                </span>
                <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-semibold">
                  {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
                </span>
              </div>

              {/* Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showProductsInTheater}
                    onChange={(e) => setShowProductsInTheater(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show products in theater mode
                  </span>
                </label>
              </div>

              {/* Mode descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                    <Video className="w-4 h-4" />
                    Default Mode
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Video on left (2/3), chat on right (1/3), products below video
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                    <Video className="w-4 h-4" />
                    Theater Mode
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Large video, collapsible chat overlay, optional mini products
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                    <Video className="w-4 h-4" />
                    Fullscreen Mode
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Video only with overlay controls, true fullscreen experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stream Layout */}
      <div className={currentMode === 'fullscreen' ? '' : 'p-4'}>
        <div className={currentMode === 'fullscreen' ? 'h-screen' : 'max-w-7xl mx-auto h-[calc(100vh-250px)]'}>
          <StreamLayout
            videoComponent={videoComponent}
            chatComponent={chatComponent}
            productsComponent={productsComponent}
            defaultMode={currentMode}
            onModeChange={setCurrentMode}
            showLayoutControls={true}
            showProductsInTheater={showProductsInTheater}
          />
        </div>
      </div>
    </div>
  );
};

export default StreamLayoutDemo;