import React, { useState, useRef, useEffect } from 'react';
import { 
  Video,
  Radio,
  StopCircle,
  Settings,
  Users,
  Clock,
  Wifi,
  Package,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import StreamControls from './StreamControls';
// No longer need separate API call for stream key
import { useAuthState, isStreamer } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';

interface StreamerStudioProps {
  onStreamStart: () => void;
  onStreamEnd: () => void;
}

interface StreamSettings {
  camera: boolean;
  microphone: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  bitrate: number;
}

export const StreamerStudio: React.FC<StreamerStudioProps> = ({
  onStreamStart,
  onStreamEnd
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [settings, setSettings] = useState<StreamSettings>({
    camera: true,
    microphone: true,
    quality: 'high',
    bitrate: 2500
  });
  const [streamStats] = useState({
    viewers: 0,
    duration: '00:00:00',
    fps: 30,
    bitrate: 0
  });
  const [activeTab, setActiveTab] = useState<'products' | 'chat' | 'settings'>('products');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const navigate = useNavigate();
  const canStream = isStreamer(user);

  // Debug logging
  console.log('StreamerStudio - Current user:', user);
  console.log('StreamerStudio - User role:', user?.role);
  console.log('StreamerStudio - Can stream:', canStream);

  // Stream key is already in the user object from Better Auth
  const streamKeyData = user?.streamKey ? {
    streamKey: user.streamKey,
    vdoRoomName: `room-${user.id}` // Generate room name from user ID
  } : null;
  const loadingKey = false; // No need to load separately
  const error = !user?.streamKey ? new Error('No stream key found') : null;


  const handleStreamStart = () => {
    setIsStreaming(true);
    onStreamStart();
  };

  const handleStreamEnd = () => {
    setIsStreaming(false);
    onStreamEnd();
  };

  // Handle authentication and authorization
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    } else if (!authLoading && isAuthenticated && !canStream) {
      // User is authenticated but not a streamer
      console.log('User is not authorized to stream');
    }
  }, [authLoading, isAuthenticated, canStream, navigate]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user can't stream
  if (!canStream) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Streaming Access Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need streamer permissions to access this feature.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Contact an administrator to upgrade your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Main Video Area */}
        <div className="col-span-8 h-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stream Preview</h2>
                {isStreaming && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold animate-pulse">
                    <Radio className="w-4 h-4" />
                    LIVE
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 relative bg-black">
              {(() => {
                console.log('StreamerStudio - Rendering decision:', {
                  loadingKey,
                  hasStreamKeyData: !!streamKeyData,
                  streamKeyData,
                  error
                });
                
                if (loadingKey) {
                  console.log('StreamerStudio - Showing loading state');
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-white">Loading stream configuration...</div>
                    </div>
                  );
                } else if (streamKeyData) {
                  console.log('StreamerStudio - Showing iframe with VDO.ninja');
                  return (
                    <iframe
                      ref={iframeRef}
                      src={`https://vdo.ninja/?room=${streamKeyData.vdoRoomName}&push=${streamKeyData.streamKey}&meshcast&webcam&bitrate=${settings.bitrate}&director=1`}
                      className="w-full h-full"
                      allow="camera; microphone; autoplay"
                      style={{ border: 'none' }}
                    />
                  );
                } else {
                  console.log('StreamerStudio - Showing error state');
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                      <AlertCircle className="w-12 h-12 mb-4" />
                      <p>Unable to load stream configuration</p>
                      <p className="text-sm text-gray-400 mt-2">Make sure you have streamer permissions</p>
                      {error && (
                        <p className="text-sm text-red-400 mt-2">Error: {error.message}</p>
                      )}
                    </div>
                  );
                }
              })()}
              {/* Stream Stats Overlay */}
              <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-sm p-3 rounded-lg">
                <div className="flex items-center gap-4 text-white text-sm">
                  <span>FPS: {streamStats.fps}</span>
                  <span>Bitrate: {streamStats.bitrate} kbps</span>
                  <span>Duration: {streamStats.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls Sidebar */}
        <div className="col-span-4 h-full flex flex-col gap-4">
          {/* Stream Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Stream Controls</h3>
              
              <StreamControls 
                iframeRef={iframeRef}
                onControlsChange={(controls) => {
                  // Update bitrate based on quality
                  const qualityBitrateMap = {
                    '1080p': 4000,
                    '720p': 2500,
                    '480p': 1000,
                    '360p': 600,
                    'auto': 2500
                  };
                  setSettings(prev => ({
                    ...prev,
                    camera: controls.isCameraOn,
                    microphone: controls.isMicOn,
                    bitrate: qualityBitrateMap[controls.quality] || 2500
                  }));
                }}
              />
              
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                {!isStreaming ? (
                  <button
                    onClick={handleStreamStart}
                    className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    Start Streaming
                  </button>
                ) : (
                  <button
                    onClick={handleStreamEnd}
                    className="w-full py-3 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" />
                    End Stream
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stream Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Stream Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Viewers</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">{streamStats.viewers}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Duration</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">{streamStats.duration}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">FPS</span>
                <span className="font-semibold text-gray-900 dark:text-white">{streamStats.fps}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Bitrate</span>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">{streamStats.bitrate} kbps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Settings Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('products')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'products' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <Package className="w-4 h-4" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'chat' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={clsx(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    activeTab === 'settings' 
                      ? "text-primary-600 border-b-2 border-primary-600" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-6">
              {activeTab === 'products' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Product management panel coming soon
                </div>
              )}
              
              {activeTab === 'chat' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Chat moderation tools coming soon
                </div>
              )}
              
              {activeTab === 'settings' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Advanced settings coming soon
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};