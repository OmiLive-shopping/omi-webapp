import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Settings, Volume2, VolumeX, Camera, CameraOff,
  Wifi, WifiOff, Radio, Activity, Gauge, Sliders,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle,
  Headphones, Speaker, Smartphone, Laptop, RefreshCw,
  MoreVertical, X, Square, Circle, Play, Pause
} from 'lucide-react';
import { useMediaControls } from '@/hooks/useMediaControls';
import type { MediaControlsState, MediaDevice, QualityPreset } from '@/hooks/useMediaControls';

export interface MediaControlPanelProps {
  // Control options
  streamId?: string;
  showAdvancedControls?: boolean;
  showDeviceSelection?: boolean;
  showQualitySettings?: boolean;
  showConnectionStatus?: boolean;
  showRecordingControls?: boolean;
  
  // Layout options
  layout?: 'horizontal' | 'vertical' | 'compact' | 'expanded';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark' | 'auto';
  
  // Callbacks
  onStateChange?: (state: MediaControlsState) => void;
  onDeviceChange?: (type: 'audio' | 'video', device: MediaDevice) => void;
  onQualityChange?: (preset: QualityPreset) => void;
  onError?: (error: Error) => void;
  
  // Custom styling
  className?: string;
  controlsClassName?: string;
  statusClassName?: string;
}

export const MediaControlPanel: React.FC<MediaControlPanelProps> = ({
  streamId,
  showAdvancedControls = true,
  showDeviceSelection = true,
  showQualitySettings = true,
  showConnectionStatus = true,
  showRecordingControls = false,
  layout = 'horizontal',
  size = 'md',
  theme = 'auto',
  onStateChange,
  onDeviceChange,
  onQualityChange,
  onError,
  className = '',
  controlsClassName = '',
  statusClassName = ''
}) => {
  const {
    state,
    devices,
    permissions,
    capabilities,
    queueStatus,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleRecording,
    setAudioDevice,
    setVideoDevice,
    setQuality,
    setBitrate,
    setVolume,
    refreshDevices,
    requestPermissions,
    processOfflineQueue,
    getDeviceCapabilities
  } = useMediaControls({
    onStateChange,
    onError
  });
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showDeviceMenu, setShowDeviceMenu] = useState<'audio' | 'video' | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Button size classes based on size prop
  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };
  
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  // Layout classes
  const layoutClasses = {
    horizontal: 'flex flex-row items-center gap-2',
    vertical: 'flex flex-col gap-2',
    compact: 'inline-flex items-center gap-1',
    expanded: 'grid grid-cols-2 md:grid-cols-4 gap-3'
  };
  
  // Connection status indicator
  const connectionStatus = useMemo(() => {
    if (!state.isConnected) return { color: 'bg-gray-400', text: 'Disconnected' };
    if (state.connectionQuality === 'excellent') return { color: 'bg-green-500', text: 'Excellent' };
    if (state.connectionQuality === 'good') return { color: 'bg-blue-500', text: 'Good' };
    if (state.connectionQuality === 'fair') return { color: 'bg-yellow-500', text: 'Fair' };
    if (state.connectionQuality === 'poor') return { color: 'bg-orange-500', text: 'Poor' };
    return { color: 'bg-red-500', text: 'Critical' };
  }, [state.isConnected, state.connectionQuality]);
  
  // Handle device selection
  const handleDeviceSelect = useCallback(async (type: 'audio' | 'video', device: MediaDevice) => {
    try {
      if (type === 'audio') {
        await setAudioDevice(device.deviceId);
      } else {
        await setVideoDevice(device.deviceId);
      }
      setShowDeviceMenu(null);
      onDeviceChange?.(type, device);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [setAudioDevice, setVideoDevice, onDeviceChange, onError]);
  
  // Handle quality preset selection
  const handleQualitySelect = useCallback(async (preset: QualityPreset) => {
    try {
      await setQuality(preset);
      setShowQualityMenu(false);
      onQualityChange?.(preset);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [setQuality, onQualityChange, onError]);
  
  // Primary control button component
  const ControlButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    icon: React.ReactNode;
    activeIcon?: React.ReactNode;
    label: string;
    variant?: 'primary' | 'danger' | 'warning' | 'success';
    showLabel?: boolean;
  }> = ({ onClick, disabled, active, icon, activeIcon, label, variant = 'primary', showLabel = false }) => {
    const variantClasses = {
      primary: active ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      danger: 'bg-red-600 text-white',
      warning: 'bg-yellow-600 text-white',
      success: 'bg-green-600 text-white'
    };
    
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg font-medium transition-all duration-200
          hover:opacity-90 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${showLabel ? 'px-4' : ''}
        `}
        aria-label={label}
        title={label}
      >
        <span className={iconSizes[size]}>
          {active && activeIcon ? activeIcon : icon}
        </span>
        {showLabel && <span>{label}</span>}
      </button>
    );
  };
  
  // Device menu component
  const DeviceMenu: React.FC<{ type: 'audio' | 'video' }> = ({ type }) => {
    const deviceList = type === 'audio' ? devices.audioInputs : devices.videoInputs;
    const currentDevice = type === 'audio' ? state.currentAudioDevice : state.currentVideoDevice;
    
    return (
      <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-medium">{type === 'audio' ? 'Audio Devices' : 'Video Devices'}</span>
            <button
              onClick={() => setShowDeviceMenu(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {deviceList.length === 0 ? (
            <div className="px-2 py-3 text-sm text-gray-500">No devices found</div>
          ) : (
            <div className="space-y-1">
              {deviceList.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(type, device)}
                  className={`
                    w-full text-left px-2 py-2 rounded text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    flex items-center justify-between
                    ${device.deviceId === currentDevice ? 'bg-primary-100 dark:bg-primary-900' : ''}
                  `}
                >
                  <span className="truncate">{device.label || `${type} device`}</span>
                  {device.deviceId === currentDevice && (
                    <CheckCircle className="w-3.5 h-3.5 text-primary-600" />
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={refreshDevices}
              className="w-full px-2 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Devices
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Quality menu component
  const QualityMenu: React.FC = () => {
    const presets: { value: QualityPreset; label: string; description: string }[] = [
      { value: 'low', label: 'Low', description: '480p, 1 Mbps' },
      { value: 'medium', label: 'Medium', description: '720p, 2.5 Mbps' },
      { value: 'high', label: 'High', description: '1080p, 5 Mbps' },
      { value: 'ultra', label: 'Ultra', description: '4K, 10 Mbps' }
    ];
    
    return (
      <div className="absolute top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-medium">Quality Settings</span>
            <button
              onClick={() => setShowQualityMenu(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleQualitySelect(preset.value)}
                className={`
                  w-full text-left px-2 py-2 rounded
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  ${state.currentQuality === preset.value ? 'bg-primary-100 dark:bg-primary-900' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{preset.label}</div>
                    <div className="text-xs text-gray-500">{preset.description}</div>
                  </div>
                  {state.currentQuality === preset.value && (
                    <CheckCircle className="w-3.5 h-3.5 text-primary-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 px-2">
            <div className="text-xs text-gray-500">
              Current: {state.bitrate ? `${Math.round(state.bitrate / 1000)} kbps` : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Connection status component
  const ConnectionStatus: React.FC = () => {
    if (!showConnectionStatus) return null;
    
    return (
      <div className={`flex items-center gap-2 ${statusClassName}`}>
        <div className={`w-2 h-2 rounded-full ${connectionStatus.color} animate-pulse`} />
        <span className="text-xs font-medium">{connectionStatus.text}</span>
        {state.bitrate > 0 && (
          <>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs">{Math.round(state.bitrate / 1000)} kbps</span>
          </>
        )}
        {queueStatus.size > 0 && (
          <>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-yellow-600">{queueStatus.size} queued</span>
          </>
        )}
      </div>
    );
  };
  
  // Main render
  return (
    <div className={`media-control-panel ${className}`}>
      {/* Connection Status Bar */}
      {showConnectionStatus && layout !== 'compact' && (
        <div className="mb-3">
          <ConnectionStatus />
        </div>
      )}
      
      {/* Primary Controls */}
      <div className={`${layoutClasses[layout]} ${controlsClassName}`}>
        {/* Audio Control */}
        <div className="relative">
          <ControlButton
            onClick={toggleAudio}
            disabled={!permissions.audio}
            active={state.audioEnabled}
            icon={<MicOff />}
            activeIcon={<Mic />}
            label={state.audioEnabled ? 'Mute' : 'Unmute'}
            variant={state.audioEnabled ? 'primary' : 'danger'}
            showLabel={layout === 'expanded'}
          />
          {showDeviceSelection && layout !== 'compact' && (
            <button
              onClick={() => setShowDeviceMenu(showDeviceMenu === 'audio' ? null : 'audio')}
              className="absolute -bottom-1 -right-1 p-0.5 bg-gray-600 text-white rounded-full hover:bg-gray-700"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          )}
          {showDeviceMenu === 'audio' && <DeviceMenu type="audio" />}
        </div>
        
        {/* Video Control */}
        <div className="relative">
          <ControlButton
            onClick={toggleVideo}
            disabled={!permissions.video}
            active={state.videoEnabled}
            icon={<VideoOff />}
            activeIcon={<Video />}
            label={state.videoEnabled ? 'Hide Video' : 'Show Video'}
            variant={state.videoEnabled ? 'primary' : 'danger'}
            showLabel={layout === 'expanded'}
          />
          {showDeviceSelection && layout !== 'compact' && (
            <button
              onClick={() => setShowDeviceMenu(showDeviceMenu === 'video' ? null : 'video')}
              className="absolute -bottom-1 -right-1 p-0.5 bg-gray-600 text-white rounded-full hover:bg-gray-700"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          )}
          {showDeviceMenu === 'video' && <DeviceMenu type="video" />}
        </div>
        
        {/* Screen Share Control */}
        {showAdvancedControls && (
          <ControlButton
            onClick={toggleScreenShare}
            disabled={!capabilities.screenShare}
            active={state.screenShareEnabled}
            icon={<MonitorOff />}
            activeIcon={<Monitor />}
            label={state.screenShareEnabled ? 'Stop Sharing' : 'Share Screen'}
            variant={state.screenShareEnabled ? 'warning' : 'primary'}
            showLabel={layout === 'expanded'}
          />
        )}
        
        {/* Recording Control */}
        {showRecordingControls && (
          <ControlButton
            onClick={toggleRecording}
            disabled={!capabilities.recording}
            active={state.isRecording}
            icon={<Circle />}
            activeIcon={<Square />}
            label={state.isRecording ? 'Stop Recording' : 'Start Recording'}
            variant={state.isRecording ? 'danger' : 'primary'}
            showLabel={layout === 'expanded'}
          />
        )}
        
        {/* Quality Settings */}
        {showQualitySettings && layout !== 'compact' && (
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className={`
                ${sizeClasses[size]}
                bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                rounded-lg font-medium transition-all duration-200
                hover:opacity-90 active:scale-95
                flex items-center justify-center gap-2
              `}
              aria-label="Quality Settings"
            >
              <Gauge className={iconSizes[size]} />
              {layout === 'expanded' && <span>Quality</span>}
            </button>
            {showQualityMenu && <QualityMenu />}
          </div>
        )}
        
        {/* Advanced Settings */}
        {showAdvancedControls && layout === 'expanded' && (
          <button
            onClick={() => setExpandedSection(expandedSection === 'advanced' ? null : 'advanced')}
            className={`
              ${sizeClasses[size]}
              bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
              rounded-lg font-medium transition-all duration-200
              hover:opacity-90 active:scale-95
              flex items-center justify-center gap-2
            `}
            aria-label="Advanced Settings"
          >
            <Settings className={iconSizes[size]} />
            <span>Settings</span>
          </button>
        )}
      </div>
      
      {/* Advanced Settings Panel */}
      {expandedSection === 'advanced' && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium mb-3">Advanced Settings</h3>
          
          {/* Volume Control */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Volume
            </label>
            <div className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-gray-500" />
              <input
                type="range"
                min="0"
                max="100"
                value={state.volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="flex-1"
              />
              <Volume2 className="w-4 h-4 text-gray-500" />
              <span className="text-xs w-10 text-right">{state.volume}%</span>
            </div>
          </div>
          
          {/* Bitrate Control */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Bitrate (kbps)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2500, 5000].map(bitrate => (
                <button
                  key={bitrate}
                  onClick={() => setBitrate(bitrate * 1000)}
                  className={`
                    px-2 py-1 text-xs rounded
                    ${state.bitrate === bitrate * 1000 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}
                  `}
                >
                  {bitrate}
                </button>
              ))}
            </div>
          </div>
          
          {/* Permission Status */}
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Permissions</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                {permissions.audio ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs">Audio</span>
              </div>
              <div className="flex items-center gap-1">
                {permissions.video ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs">Video</span>
              </div>
              <div className="flex items-center gap-1">
                {permissions.screen ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-xs">Screen</span>
              </div>
            </div>
            {(!permissions.audio || !permissions.video) && (
              <button
                onClick={requestPermissions}
                className="mt-2 text-xs text-primary-600 hover:underline"
              >
                Request Permissions
              </button>
            )}
          </div>
          
          {/* Queue Status */}
          {queueStatus.size > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {queueStatus.size} commands queued
              </span>
              <button
                onClick={processOfflineQueue}
                disabled={queueStatus.isProcessing}
                className="text-xs text-primary-600 hover:underline disabled:opacity-50"
              >
                {queueStatus.isProcessing ? 'Processing...' : 'Process Queue'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaControlPanel;