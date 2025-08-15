import React, { useMemo, useEffect, useState } from 'react';
import {
  Circle, Square, Play, Pause, Radio, RadioOff,
  Users, Eye, EyeOff, Wifi, WifiOff, AlertTriangle,
  Activity, Clock, TrendingUp, TrendingDown, Loader2,
  CheckCircle, XCircle, AlertCircle, Info, Signal,
  SignalHigh, SignalLow, SignalMedium, SignalZero
} from 'lucide-react';
import { useStreamState } from '@/hooks/useStreamState';
import type { StreamState } from '@/hooks/useStreamState';

export interface StreamStatusIndicatorProps {
  // Stream identification
  streamId?: string;
  
  // Display options
  showStreamState?: boolean;
  showViewerCount?: boolean;
  showDuration?: boolean;
  showConnectionQuality?: boolean;
  showRecordingStatus?: boolean;
  showMetrics?: boolean;
  showAnimations?: boolean;
  
  // Layout options
  layout?: 'horizontal' | 'vertical' | 'compact' | 'minimal' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  position?: 'inline' | 'fixed-top-left' | 'fixed-top-right' | 'fixed-bottom-left' | 'fixed-bottom-right';
  
  // Style variants
  variant?: 'default' | 'glass' | 'solid' | 'outline';
  theme?: 'light' | 'dark' | 'auto';
  
  // Callbacks
  onClick?: () => void;
  onViewerCountClick?: () => void;
  
  // Custom styling
  className?: string;
  style?: React.CSSProperties;
}

export const StreamStatusIndicator: React.FC<StreamStatusIndicatorProps> = ({
  streamId,
  showStreamState = true,
  showViewerCount = true,
  showDuration = true,
  showConnectionQuality = true,
  showRecordingStatus = true,
  showMetrics = false,
  showAnimations = true,
  layout = 'horizontal',
  size = 'md',
  position = 'inline',
  variant = 'default',
  theme = 'auto',
  onClick,
  onViewerCountClick,
  className = '',
  style
}) => {
  const { state, streamDuration } = useStreamState({ streamId });
  const [displayDuration, setDisplayDuration] = useState('00:00:00');
  
  // Update duration every second
  useEffect(() => {
    if (!showDuration) return;
    
    const updateDuration = () => {
      const duration = streamDuration || 0;
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      setDisplayDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    
    return () => clearInterval(interval);
  }, [streamDuration, showDuration]);
  
  // Size configurations
  const sizeConfig = {
    xs: {
      container: 'text-xs px-2 py-1',
      icon: 'w-3 h-3',
      gap: 'gap-1',
      fontSize: 'text-xs'
    },
    sm: {
      container: 'text-sm px-3 py-1.5',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1.5',
      fontSize: 'text-sm'
    },
    md: {
      container: 'text-base px-4 py-2',
      icon: 'w-4 h-4',
      gap: 'gap-2',
      fontSize: 'text-base'
    },
    lg: {
      container: 'text-lg px-5 py-2.5',
      icon: 'w-5 h-5',
      gap: 'gap-2.5',
      fontSize: 'text-lg'
    }
  };
  
  const sizes = sizeConfig[size];
  
  // Variant styles
  const variantStyles = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
    glass: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 shadow-lg',
    solid: 'bg-gray-900 text-white shadow-lg',
    outline: 'border-2 border-gray-300 dark:border-gray-600 bg-transparent'
  };
  
  // Position styles
  const positionStyles = {
    inline: '',
    'fixed-top-left': 'fixed top-4 left-4 z-50',
    'fixed-top-right': 'fixed top-4 right-4 z-50',
    'fixed-bottom-left': 'fixed bottom-4 left-4 z-50',
    'fixed-bottom-right': 'fixed bottom-4 right-4 z-50'
  };
  
  // Stream state configuration
  const streamStateConfig = {
    offline: {
      icon: <RadioOff className={sizes.icon} />,
      label: 'Offline',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500',
      pulseColor: 'bg-gray-400'
    },
    initializing: {
      icon: <Loader2 className={`${sizes.icon} animate-spin`} />,
      label: 'Initializing',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      pulseColor: 'bg-blue-400'
    },
    connecting: {
      icon: <Activity className={`${sizes.icon} ${showAnimations ? 'animate-pulse' : ''}`} />,
      label: 'Connecting',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      pulseColor: 'bg-yellow-400'
    },
    connected: {
      icon: <CheckCircle className={sizes.icon} />,
      label: 'Connected',
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      pulseColor: 'bg-green-400'
    },
    streaming: {
      icon: <Radio className={sizes.icon} />,
      label: 'Live',
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      pulseColor: 'bg-red-400'
    },
    paused: {
      icon: <Pause className={sizes.icon} />,
      label: 'Paused',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
      pulseColor: 'bg-orange-400'
    },
    reconnecting: {
      icon: <Loader2 className={`${sizes.icon} animate-spin`} />,
      label: 'Reconnecting',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      pulseColor: 'bg-yellow-400'
    },
    error: {
      icon: <AlertTriangle className={sizes.icon} />,
      label: 'Error',
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      pulseColor: 'bg-red-400'
    },
    ended: {
      icon: <Square className={sizes.icon} />,
      label: 'Ended',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500',
      pulseColor: 'bg-gray-400'
    }
  };
  
  const stateConfig = streamStateConfig[state.streamState];
  
  // Connection quality icon
  const getConnectionIcon = () => {
    switch (state.connectionQuality) {
      case 'excellent':
        return <SignalHigh className={`${sizes.icon} text-green-500`} />;
      case 'good':
        return <Signal className={`${sizes.icon} text-blue-500`} />;
      case 'fair':
        return <SignalMedium className={`${sizes.icon} text-yellow-500`} />;
      case 'poor':
        return <SignalLow className={`${sizes.icon} text-orange-500`} />;
      case 'critical':
        return <SignalZero className={`${sizes.icon} text-red-500`} />;
      default:
        return <WifiOff className={`${sizes.icon} text-gray-500`} />;
    }
  };
  
  // Layout components
  const StreamStateDisplay = () => {
    if (!showStreamState) return null;
    
    return (
      <div className={`flex items-center ${sizes.gap}`}>
        {state.streamState === 'streaming' && showAnimations && (
          <div className="relative">
            <div className={`absolute inset-0 ${stateConfig.bgColor} rounded-full animate-ping opacity-75`} />
            <div className={`relative ${stateConfig.bgColor} rounded-full p-1`}>
              <Circle className="w-2 h-2 text-white fill-current" />
            </div>
          </div>
        )}
        <span className={stateConfig.color}>{stateConfig.icon}</span>
        {layout !== 'minimal' && (
          <span className={`font-medium ${sizes.fontSize} ${stateConfig.color}`}>
            {stateConfig.label}
          </span>
        )}
      </div>
    );
  };
  
  const ViewerCount = () => {
    if (!showViewerCount) return null;
    
    return (
      <button
        onClick={onViewerCountClick}
        className={`flex items-center ${sizes.gap} hover:opacity-80 transition-opacity`}
        disabled={!onViewerCountClick}
      >
        <Users className={`${sizes.icon} text-gray-600 dark:text-gray-400`} />
        <span className={`font-medium ${sizes.fontSize}`}>
          {state.viewerCount}
        </span>
      </button>
    );
  };
  
  const Duration = () => {
    if (!showDuration) return null;
    
    return (
      <div className={`flex items-center ${sizes.gap}`}>
        <Clock className={`${sizes.icon} text-gray-600 dark:text-gray-400`} />
        <span className={`font-mono ${sizes.fontSize}`}>
          {displayDuration}
        </span>
      </div>
    );
  };
  
  const ConnectionQuality = () => {
    if (!showConnectionQuality || layout === 'minimal') return null;
    
    return (
      <div className={`flex items-center ${sizes.gap}`}>
        {getConnectionIcon()}
        {layout === 'full' && (
          <span className={`text-xs ${sizes.fontSize}`}>
            {state.connectionQuality}
          </span>
        )}
      </div>
    );
  };
  
  const RecordingStatus = () => {
    if (!showRecordingStatus || !state.isRecording) return null;
    
    return (
      <div className={`flex items-center ${sizes.gap}`}>
        <div className="relative">
          {showAnimations && (
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
          )}
          <Circle className={`${sizes.icon} text-red-500 fill-current relative`} />
        </div>
        {layout !== 'minimal' && layout !== 'compact' && (
          <span className={`text-red-500 font-medium ${sizes.fontSize}`}>
            REC
          </span>
        )}
      </div>
    );
  };
  
  const Metrics = () => {
    if (!showMetrics || layout === 'minimal' || layout === 'compact') return null;
    
    return (
      <div className={`flex items-center ${sizes.gap} text-gray-600 dark:text-gray-400 ${sizes.fontSize}`}>
        {state.bitrate > 0 && (
          <span>{Math.round(state.bitrate / 1000)} kbps</span>
        )}
        {state.framerate > 0 && (
          <span>{state.framerate} fps</span>
        )}
      </div>
    );
  };
  
  // Layout arrangements
  const renderContent = () => {
    switch (layout) {
      case 'minimal':
        return (
          <>
            <StreamStateDisplay />
            {state.streamState === 'streaming' && <ViewerCount />}
          </>
        );
      
      case 'compact':
        return (
          <>
            <StreamStateDisplay />
            <ViewerCount />
            <RecordingStatus />
          </>
        );
      
      case 'vertical':
        return (
          <div className="flex flex-col gap-2">
            <div className={`flex items-center ${sizes.gap}`}>
              <StreamStateDisplay />
              <RecordingStatus />
            </div>
            <div className={`flex items-center ${sizes.gap}`}>
              <ViewerCount />
              <Duration />
            </div>
            <div className={`flex items-center ${sizes.gap}`}>
              <ConnectionQuality />
              <Metrics />
            </div>
          </div>
        );
      
      case 'full':
        return (
          <>
            <StreamStateDisplay />
            <div className="border-l border-gray-300 dark:border-gray-600 h-4" />
            <ViewerCount />
            <div className="border-l border-gray-300 dark:border-gray-600 h-4" />
            <Duration />
            <div className="border-l border-gray-300 dark:border-gray-600 h-4" />
            <ConnectionQuality />
            <RecordingStatus />
            <Metrics />
          </>
        );
      
      default: // horizontal
        return (
          <>
            <StreamStateDisplay />
            <ViewerCount />
            <Duration />
            <ConnectionQuality />
            <RecordingStatus />
            <Metrics />
          </>
        );
    }
  };
  
  const containerClasses = `
    stream-status-indicator
    ${sizes.container}
    ${variantStyles[variant]}
    ${positionStyles[position]}
    ${layout === 'vertical' ? '' : `flex items-center ${sizes.gap}`}
    rounded-lg
    transition-all duration-200
    ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
    ${className}
  `;
  
  return (
    <div
      className={containerClasses}
      onClick={onClick}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {renderContent()}
    </div>
  );
};

export default StreamStatusIndicator;