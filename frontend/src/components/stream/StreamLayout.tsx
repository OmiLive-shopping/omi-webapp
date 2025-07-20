import React, { useState, useEffect, useCallback } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Layout, 
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import clsx from 'clsx';

export type LayoutMode = 'default' | 'theater' | 'fullscreen';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface StreamLayoutProps {
  // Components to render
  videoComponent: React.ReactNode;
  chatComponent: React.ReactNode;
  productsComponent?: React.ReactNode;
  // Layout control
  defaultMode?: LayoutMode;
  onModeChange?: (mode: LayoutMode) => void;
  // Customization
  className?: string;
  showLayoutControls?: boolean;
  showProductsInTheater?: boolean;
}

export const StreamLayout: React.FC<StreamLayoutProps> = ({
  videoComponent,
  chatComponent,
  productsComponent,
  defaultMode = 'default',
  onModeChange,
  className,
  showLayoutControls = true,
  showProductsInTheater = false
}) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(defaultMode);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  // Detect device type based on viewport width
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenActive(!!document.fullscreenElement);
      if (!document.fullscreenElement && layoutMode === 'fullscreen') {
        setLayoutMode('default');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [layoutMode]);

  // Handle layout mode changes
  const handleModeChange = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    onModeChange?.(mode);

    // Handle fullscreen mode
    if (mode === 'fullscreen') {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Fullscreen request failed:', err);
        setLayoutMode('theater'); // Fallback to theater mode
      });
    } else if (isFullscreenActive) {
      document.exitFullscreen();
    }

    // Auto-collapse chat in theater mode
    if (mode === 'theater') {
      setIsChatCollapsed(true);
    } else if (mode === 'default') {
      setIsChatCollapsed(false);
    }
  }, [onModeChange, isFullscreenActive]);

  // Toggle chat visibility (for theater mode)
  const toggleChat = useCallback(() => {
    setIsChatCollapsed(prev => !prev);
  }, []);

  // Get layout classes based on mode and device
  const getLayoutClasses = () => {
    const baseClasses = "relative w-full h-full";
    
    if (layoutMode === 'fullscreen') {
      return clsx(baseClasses, "fixed inset-0 z-50 bg-black");
    }

    if (deviceType === 'mobile') {
      return clsx(baseClasses, "flex flex-col");
    }

    if (deviceType === 'tablet') {
      if (layoutMode === 'theater') {
        return clsx(baseClasses, "flex flex-col");
      }
      return clsx(baseClasses, "grid grid-cols-1 lg:grid-cols-2 gap-4");
    }

    // Desktop layouts
    if (layoutMode === 'theater') {
      return clsx(baseClasses, "flex flex-col");
    }

    return clsx(baseClasses, "grid grid-cols-1 lg:grid-cols-3 gap-4");
  };

  // Render layout controls
  const renderLayoutControls = () => {
    if (!showLayoutControls || deviceType === 'mobile') return null;

    return (
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
          <button
            onClick={() => handleModeChange('default')}
            className={clsx(
              "p-2 rounded transition-colors",
              layoutMode === 'default'
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            title="Default Layout"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleModeChange('theater')}
            className={clsx(
              "p-2 rounded transition-colors",
              layoutMode === 'theater'
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            title="Theater Mode"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleModeChange('fullscreen')}
            className={clsx(
              "p-2 rounded transition-colors",
              layoutMode === 'fullscreen'
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            title="Fullscreen"
          >
            {isFullscreenActive ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Device indicator (development helper) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 text-white/70 text-xs flex items-center gap-1">
            {deviceType === 'mobile' && <Smartphone className="w-3 h-3" />}
            {deviceType === 'tablet' && <Tablet className="w-3 h-3" />}
            {deviceType === 'desktop' && <Monitor className="w-3 h-3" />}
            {deviceType}
          </div>
        )}
      </div>
    );
  };

  // Render layout based on mode
  const renderLayout = () => {
    // Mobile layout (always stacked)
    if (deviceType === 'mobile') {
      return (
        <>
          <div className="relative w-full aspect-video bg-black">
            {videoComponent}
          </div>
          <div className="flex-1 min-h-0">
            {chatComponent}
          </div>
          {productsComponent && (
            <div className="mt-4">
              {productsComponent}
            </div>
          )}
        </>
      );
    }

    // Fullscreen layout
    if (layoutMode === 'fullscreen') {
      return (
        <div className="relative w-full h-full">
          {videoComponent}
          {renderLayoutControls()}
        </div>
      );
    }

    // Theater mode layout
    if (layoutMode === 'theater') {
      return (
        <>
          <div className="relative w-full flex-1 bg-black">
            {videoComponent}
            {renderLayoutControls()}
          </div>
          
          {/* Collapsible chat overlay */}
          <div className={clsx(
            "absolute bottom-0 right-0 transition-all duration-300 z-10",
            isChatCollapsed ? "w-80" : "w-96",
            deviceType === 'tablet' ? "h-full" : "h-96"
          )}>
            <div className="relative h-full">
              {/* Chat toggle button */}
              <button
                onClick={toggleChat}
                className="absolute -left-12 top-4 bg-black/50 backdrop-blur-sm text-white p-2 rounded-l-lg hover:bg-black/60 transition-colors"
              >
                {isChatCollapsed ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              
              <div className={clsx(
                "h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300",
                isChatCollapsed && "opacity-90"
              )}>
                {chatComponent}
              </div>
            </div>
          </div>

          {/* Mini products bar (optional) */}
          {showProductsInTheater && productsComponent && (
            <div className="absolute bottom-0 left-0 right-96 h-24 bg-black/50 backdrop-blur-sm p-2 overflow-x-auto">
              <div className="h-full">
                {productsComponent}
              </div>
            </div>
          )}
        </>
      );
    }

    // Default layout (desktop)
    return (
      <>
        {/* Video section - takes up 2 columns */}
        <div className="lg:col-span-2 relative">
          <div className="relative w-full aspect-video bg-black">
            {videoComponent}
            {renderLayoutControls()}
          </div>
          
          {/* Products below video on desktop */}
          {productsComponent && deviceType === 'desktop' && (
            <div className="mt-4">
              {productsComponent}
            </div>
          )}
        </div>

        {/* Chat section - 1 column */}
        <div className="lg:col-span-1 h-full">
          {chatComponent}
        </div>

        {/* Products for tablet (full width below) */}
        {productsComponent && deviceType === 'tablet' && (
          <div className="lg:col-span-2">
            {productsComponent}
          </div>
        )}
      </>
    );
  };

  return (
    <div className={clsx(getLayoutClasses(), className)}>
      {renderLayout()}
    </div>
  );
};

export default StreamLayout;