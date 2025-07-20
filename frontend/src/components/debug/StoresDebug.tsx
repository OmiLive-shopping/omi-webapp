import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useStreamStore } from '@/stores/stream-store';
import { useProductStore } from '@/stores/product-store';
import { useChatStore } from '@/stores/chat-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const StoresDebug: React.FC = () => {
  // UI Store
  const {
    theme,
    setTheme,
    sidebarOpen,
    toggleSidebar,
    layoutMode,
    setLayoutMode,
    showToast,
  } = useUIStore();

  // Stream Store
  const {
    isLive,
    status,
    stats,
    goLive,
    endStream,
    incrementViewerCount,
    decrementViewerCount,
  } = useStreamStore();

  // Product Store
  const {
    cart,
    wishlist,
    addToCart,
    addToWishlist,
    getCartTotal,
    getCartItemCount,
  } = useProductStore();

  // Chat Store
  const {
    messages,
    addMessage,
    clearMessages,
    settings: chatSettings,
    updateSettings: updateChatSettings,
  } = useChatStore();

  // Test data
  const testProduct = {
    id: 'test-1',
    name: 'Test Product',
    description: 'A test product for debugging',
    price: 99.99,
    images: ['https://via.placeholder.com/150'],
    category: 'Test',
    tags: ['debug', 'test'],
    inStock: true,
    featured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testStream = {
    id: 'stream-1',
    title: 'Test Stream',
    description: 'Testing the stream store',
    category: 'Gaming',
    tags: ['test', 'debug'],
    startedAt: new Date(),
  };

  return (
    <div className="p-4 space-y-4">
      {/* UI Store Test */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">UI Store</h2>
          <div className="space-y-2">
            <div>Theme: {theme}</div>
            <div>Sidebar: {sidebarOpen ? 'Open' : 'Closed'}</div>
            <div>Layout Mode: {layoutMode}</div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => setTheme('light')}>Light</Button>
              <Button size="sm" onClick={() => setTheme('dark')}>Dark</Button>
              <Button size="sm" onClick={() => setTheme('system')}>System</Button>
              <Button size="sm" onClick={toggleSidebar}>Toggle Sidebar</Button>
              <Button size="sm" onClick={() => setLayoutMode('theater')}>Theater Mode</Button>
              <Button 
                size="sm" 
                onClick={() => showToast({
                  type: 'success',
                  message: 'Test toast notification!'
                })}
              >
                Show Toast
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stream Store Test */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Stream Store</h2>
          <div className="space-y-2">
            <div>Status: {status}</div>
            <div>Is Live: {isLive ? 'Yes' : 'No'}</div>
            <div>Viewers: {stats.viewerCount}</div>
            <div>Peak Viewers: {stats.peakViewerCount}</div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => goLive(testStream)}
                disabled={isLive}
              >
                Go Live
              </Button>
              <Button 
                size="sm" 
                onClick={endStream}
                disabled={!isLive}
              >
                End Stream
              </Button>
              <Button 
                size="sm" 
                onClick={incrementViewerCount}
                disabled={!isLive}
              >
                Add Viewer
              </Button>
              <Button 
                size="sm" 
                onClick={decrementViewerCount}
                disabled={!isLive}
              >
                Remove Viewer
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Product Store Test */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Product Store</h2>
          <div className="space-y-2">
            <div>Cart Items: {getCartItemCount()}</div>
            <div>Cart Total: ${getCartTotal().toFixed(2)}</div>
            <div>Wishlist Items: {wishlist.length}</div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => addToCart(testProduct)}
              >
                Add to Cart
              </Button>
              <Button 
                size="sm" 
                onClick={() => addToWishlist(testProduct)}
              >
                Add to Wishlist
              </Button>
            </div>
            {cart.length > 0 && (
              <div className="mt-2">
                <h3 className="font-medium">Cart Contents:</h3>
                {cart.map(item => (
                  <div key={item.product.id} className="text-sm">
                    {item.product.name} x{item.quantity} - ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Chat Store Test */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Chat Store</h2>
          <div className="space-y-2">
            <div>Messages: {messages.length}</div>
            <div>Slow Mode: {chatSettings.slowMode ? `${chatSettings.slowModeDelay}s` : 'Off'}</div>
            <div>Subscriber Only: {chatSettings.subscriberOnly ? 'Yes' : 'No'}</div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => addMessage({
                  userId: 'user-1',
                  username: 'TestUser',
                  content: `Test message ${Date.now()}`,
                  type: 'message',
                  isPinned: false,
                  isDeleted: false,
                })}
              >
                Add Message
              </Button>
              <Button 
                size="sm" 
                onClick={clearMessages}
              >
                Clear Chat
              </Button>
              <Button 
                size="sm" 
                onClick={() => updateChatSettings({ slowMode: !chatSettings.slowMode })}
              >
                Toggle Slow Mode
              </Button>
            </div>
            {messages.slice(-5).map(msg => (
              <div key={msg.id} className="text-sm">
                [{msg.timestamp.toLocaleTimeString()}] {msg.username}: {msg.content}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Persistence Test */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Persistence Test</h2>
          <p className="text-sm text-gray-600 mb-2">
            The following data should persist after page reload:
          </p>
          <ul className="text-sm space-y-1">
            <li>✓ UI Store: theme, sidebar width, preferences</li>
            <li>✓ Product Store: cart and wishlist items</li>
            <li>✗ Stream Store: no persistence (resets on reload)</li>
            <li>✗ Chat Store: no persistence (resets on reload)</li>
          </ul>
          <Button 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </Card>
    </div>
  );
};