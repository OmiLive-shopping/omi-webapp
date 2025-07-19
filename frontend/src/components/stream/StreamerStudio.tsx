import React, { useState } from 'react';
import { 
  Video,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Radio,
  StopCircle,
  Settings,
  Users,
  Clock,
  Wifi,
  Package,
  MessageSquare,
  MoreVertical
} from 'lucide-react';
import clsx from 'clsx';

interface StreamerStudioProps {
  streamKey: string;
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
  streamKey,
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
  const [streamStats, setStreamStats] = useState({
    viewers: 0,
    duration: '00:00:00',
    fps: 30,
    bitrate: 0
  });
  const [activeTab, setActiveTab] = useState<'products' | 'chat' | 'settings'>('products');

  const handleStreamStart = () => {
    setIsStreaming(true);
    onStreamStart();
  };

  const handleStreamEnd = () => {
    setIsStreaming(false);
    onStreamEnd();
  };

  const qualityOptions = [
    { value: 'low', label: 'Low (480p)', bitrate: 1000 },
    { value: 'medium', label: 'Medium (720p)', bitrate: 2000 },
    { value: 'high', label: 'High (1080p)', bitrate: 2500 },
    { value: 'ultra', label: 'Ultra (4K)', bitrate: 5000 }
  ];

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
              <iframe
                src={`https://vdo.ninja/?push=${streamKey}&meshcast&webcam&bitrate=${settings.bitrate}`}
                className="w-full h-full"
                allow="camera; microphone; autoplay"
                style={{ border: 'none' }}
              />
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Stream Controls</h3>
            
            <div className="space-y-4">
              {/* Camera Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Camera</span>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, camera: !prev.camera }))}
                  className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.camera ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.camera ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                  <span className="sr-only">Toggle camera</span>
                </button>
              </div>

              {/* Microphone Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Microphone</span>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, microphone: !prev.microphone }))}
                  className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.microphone ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.microphone ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                  <span className="sr-only">Toggle microphone</span>
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stream Quality
                </label>
                <select
                  value={settings.quality}
                  onChange={(e) => {
                    const selected = qualityOptions.find(opt => opt.value === e.target.value);
                    if (selected) {
                      setSettings(prev => ({ 
                        ...prev, 
                        quality: e.target.value as StreamSettings['quality'],
                        bitrate: selected.bitrate
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {qualityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
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