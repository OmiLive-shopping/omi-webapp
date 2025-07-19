import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  FullScreen,
  Button,
  Icon,
  Tooltip,
  Select,
  Badge,
  Text
} from '@bolt/ui';
import { ViewerPlayer } from './ViewerPlayer';
import { ChatContainer } from '../chat/ChatContainer';
import { ProductCarousel } from '../products/ProductCarousel';

interface StreamLayoutProps {
  streamKey: string;
  streamTitle: string;
  streamerName: string;
  isLive: boolean;
  viewerCount: number;
  messages: any[];
  products: any[];
  onSendMessage: (message: string) => void;
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistItems?: string[];
  currentUserId?: string;
}

type LayoutMode = 'default' | 'theater' | 'fullscreen' | 'chat-only' | 'minimal';

export const StreamLayout: React.FC<StreamLayoutProps> = ({
  streamKey,
  streamTitle,
  streamerName,
  isLive,
  viewerCount,
  messages,
  products,
  onSendMessage,
  onAddToCart,
  onToggleWishlist,
  wishlistItems = [],
  currentUserId
}) => {
  const [layout, setLayout] = useState<LayoutMode>('default');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isProductsCollapsed, setIsProductsCollapsed] = useState(false);
  const [chatWidth, setChatWidth] = useState(320);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 't':
          setLayout(prev => prev === 'theater' ? 'default' : 'theater');
          break;
        case 'f':
          if (!e.metaKey && !e.ctrlKey) {
            setLayout(prev => prev === 'fullscreen' ? 'default' : 'fullscreen');
          }
          break;
        case 'c':
          setIsChatCollapsed(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const layoutOptions = [
    { value: 'default', label: 'Default', icon: 'layout' },
    { value: 'theater', label: 'Theater', icon: 'maximize-2' },
    { value: 'fullscreen', label: 'Fullscreen', icon: 'maximize' },
    { value: 'chat-only', label: 'Chat Focus', icon: 'message-square' },
    { value: 'minimal', label: 'Minimal', icon: 'minimize-2' }
  ];

  const getLayoutConfig = () => {
    switch (layout) {
      case 'theater':
        return {
          videoSpan: 12,
          chatSpan: 3,
          productSpan: 12,
          showProducts: !isProductsCollapsed,
          chatPosition: 'overlay' as const
        };
      case 'fullscreen':
        return {
          videoSpan: 12,
          chatSpan: 0,
          productSpan: 0,
          showProducts: false,
          chatPosition: 'hidden' as const
        };
      case 'chat-only':
        return {
          videoSpan: 6,
          chatSpan: 6,
          productSpan: 0,
          showProducts: false,
          chatPosition: 'side' as const
        };
      case 'minimal':
        return {
          videoSpan: 12,
          chatSpan: 0,
          productSpan: 0,
          showProducts: false,
          chatPosition: 'hidden' as const
        };
      default:
        return {
          videoSpan: 8,
          chatSpan: 4,
          productSpan: 12,
          showProducts: !isProductsCollapsed,
          chatPosition: 'side' as const
        };
    }
  };

  const config = getLayoutConfig();

  return (
    <Layout.Manager
      className="h-screen bg-gray-100 dark:bg-gray-900"
      breakpoints={{
        sm: { cols: 1, layout: 'mobile' },
        md: { cols: 12, layout: 'tablet' },
        lg: { cols: 12, layout: 'desktop' }
      }}
    >
      {/* Layout Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <Select
          value={layout}
          onValueChange={(value) => setLayout(value as LayoutMode)}
          options={layoutOptions.map(opt => ({
            value: opt.value,
            label: (
              <div className="flex items-center gap-2">
                <Icon name={opt.icon} size="sm" />
                <span>{opt.label}</span>
              </div>
            )
          }))}
          size="sm"
        />
        
        <Tooltip content="Toggle Chat (C)">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            className={isChatCollapsed ? 'opacity-50' : ''}
          >
            <Icon name="message-square" size="sm" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Toggle Products">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProductsCollapsed(!isProductsCollapsed)}
            className={isProductsCollapsed ? 'opacity-50' : ''}
          >
            <Icon name="shopping-bag" size="sm" />
          </Button>
        </Tooltip>
      </div>

      {/* Main Layout Grid */}
      <Layout.Grid cols={12} gap={0} className="h-full">
        {/* Video Panel */}
        <Layout.Panel 
          id="video" 
          span={config.videoSpan}
          priority={1}
          className={`
            ${layout === 'fullscreen' ? 'col-span-12' : ''}
            ${layout === 'theater' ? 'col-span-12' : ''}
            relative
          `}
        >
          <ViewerPlayer
            streamKey={streamKey}
            viewerCount={viewerCount}
            isLive={isLive}
            streamTitle={streamTitle}
            streamerName={streamerName}
          />
          
          {/* Overlay Chat for Theater Mode */}
          {layout === 'theater' && !isChatCollapsed && (
            <div className="absolute top-0 right-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl">
              <ChatContainer
                streamId={streamKey}
                viewerCount={viewerCount}
                onSendMessage={onSendMessage}
                messages={messages}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </Layout.Panel>
        
        {/* Chat Panel */}
        {config.chatPosition === 'side' && !isChatCollapsed && (
          <Layout.Panel 
            id="chat" 
            span={config.chatSpan}
            resizable
            minWidth={280}
            maxWidth={480}
            defaultWidth={chatWidth}
            onResize={(width) => setChatWidth(width)}
            className="border-l border-gray-200 dark:border-gray-700"
          >
            <ChatContainer
              streamId={streamKey}
              viewerCount={viewerCount}
              onSendMessage={onSendMessage}
              messages={messages}
              currentUserId={currentUserId}
            />
          </Layout.Panel>
        )}
        
        {/* Products Panel */}
        {config.showProducts && products.length > 0 && (
          <Layout.Panel 
            id="products" 
            span={config.productSpan}
            collapsible
            defaultCollapsed={false}
            className="col-span-12 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="shopping-bag" size="md" className="text-primary-500" />
                <Text weight="semibold" size="lg">Featured Products</Text>
                <Badge variant="secondary">{products.length} items</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsProductsCollapsed(true)}
              >
                <Icon name="chevron-down" size="sm" />
              </Button>
            </div>
            
            <ProductCarousel
              products={products}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
              wishlistItems={wishlistItems}
              showTimer={true}
              saleEndTime={new Date(Date.now() + 3600000)} // 1 hour from now
            />
          </Layout.Panel>
        )}
      </Layout.Grid>
      
      {/* Fullscreen Toggle */}
      {layout === 'fullscreen' && (
        <FullScreen.Exit
          onClick={() => setLayout('default')}
          className="absolute bottom-4 right-4"
        />
      )}
      
      {/* Mobile Layout Indicator */}
      <div className="lg:hidden fixed bottom-4 left-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm">
        <Icon name="smartphone" size="xs" className="mr-1" />
        Mobile View
      </div>
    </Layout.Manager>
  );
};