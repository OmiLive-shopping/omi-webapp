import React, { useState, useEffect } from 'react';
import { 
  Video, 
  StopCircle, 
  Info,
  ExternalLink,
  Copy,
  Check,
  Loader,
  Eye,
  MessageSquare,
  Settings,
  Users,
  Activity
} from 'lucide-react';
import clsx from 'clsx';
import { apiClient } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';
import { EnhancedChatContainer } from '@/components/chat/EnhancedChatContainer';
import { ChatMessage, Viewer } from '@/types';
import { socketManager } from '@/lib/socket';

interface SimpleStreamControlsProps {
  vdoRoomId: string;  // The actual VDO.Ninja room ID being used
  isStreaming: boolean;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  currentStreamId?: string;
  onStreamCreated?: (streamId: string, actualVdoRoomId?: string) => void;
  isPreviewMode?: boolean;
}

export const SimpleStreamControls: React.FC<SimpleStreamControlsProps> = ({
  vdoRoomId,
  isStreaming,
  onStreamStart,
  onStreamEnd,
  currentStreamId,
  onStreamCreated,
  isPreviewMode = false
}) => {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [isCreatingStream, setIsCreatingStream] = React.useState(false);
  const [streamId, setStreamId] = React.useState<string | null>(currentStreamId || null);
  const [activeTab, setActiveTab] = useState<'stream' | 'chat' | 'viewers' | 'stats'>('stream');
  const navigate = useNavigate();
  
  // Use local state for chat and viewers
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState<Viewer[]>([]);

  // Set up socket listeners for chat messages
  React.useEffect(() => {
    if (!streamId) return;

    const handleChatMessage = (message: any) => {
      setMessages(prev => [...prev, {
        id: message.id,
        user: {
          id: message.userId,
          username: message.username || 'Anonymous',
          role: message.role || 'viewer'
        },
        content: message.content,
        timestamp: new Date(message.timestamp)
      }]);
    };

    const handleViewerUpdate = (data: any) => {
      if (data.viewerCount !== undefined) {
        // Update viewer count if needed
      }
    };

    // Set up event listeners
    socketManager.on('chat:message', handleChatMessage);
    socketManager.on('chat:message:sent', handleChatMessage);
    socketManager.on('stream:viewers:update', handleViewerUpdate);

    // Cleanup listeners
    return () => {
      socketManager.off('chat:message', handleChatMessage);
      socketManager.off('chat:message:sent', handleChatMessage);
      socketManager.off('stream:viewers:update', handleViewerUpdate);
    };
  }, [streamId]);
  
  const handleSendMessage = (content: string) => {
    if (streamId) {
      // Use the global socket manager instead of local socket
      socketManager.sendChatMessage(streamId, content);
    }
  };

  const vdoViewerUrl = `https://vdo.ninja/?room=${vdoRoomId}&view=${vdoRoomId}&scene`;
  const appStreamUrl = streamId ? `${window.location.origin}/stream/${streamId}` : null;

  const copyToClipboard = async (text: string, type: 'key' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-full">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('stream')}
            className={clsx(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'stream' 
                ? "text-primary-600 border-b-2 border-primary-600" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Video className="w-4 h-4" />
            Stream
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
            onClick={() => setActiveTab('viewers')}
            className={clsx(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'viewers' 
                ? "text-primary-600 border-b-2 border-primary-600" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Users className="w-4 h-4" />
            Viewers
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={clsx(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'stats' 
                ? "text-primary-600 border-b-2 border-primary-600" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Activity className="w-4 h-4" />
            Stats
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'stream' && (
          <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Stream Page Management
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create and manage your stream listing
        </p>
        

        {/* Stream Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </span>
            {isStreaming ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Live</span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">Offline</span>
            )}
          </div>
        </div>

        {/* VDO Room ID */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            VDO Room ID
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-lg font-mono truncate">
              {vdoRoomId}
            </code>
            <button
              onClick={() => copyToClipboard(vdoRoomId, 'key')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy stream key"
            >
              {copiedKey ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Your Stream Page URL */}
        {isStreaming && streamId && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Stream Page
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={appStreamUrl || ''}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-lg truncate"
              />
              <button
                onClick={() => navigate(`/stream/${streamId}`)}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm font-medium"
                title="View your stream"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Share this link with viewers - includes chat and products
            </p>
          </div>
        )}

        {/* Direct VDO.ninja URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Direct Video URL (VDO.ninja)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={vdoViewerUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-lg font-mono truncate"
            />
            <button
              onClick={() => copyToClipboard(vdoViewerUrl, 'url')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy viewer URL"
            >
              {copiedUrl ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <a
              href={vdoViewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Open viewer URL"
            >
              <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </a>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Direct video feed only (no chat or products)
          </p>
        </div>

        {/* Preview Mode Message */}
        {isPreviewMode && !isStreaming && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Preview Mode Active</p>
                <p>Adjust your camera and microphone settings. When ready, click the "Go Live" button below the video to start streaming.</p>
              </div>
            </div>
          </div>
        )}

        {/* Start/Stop Button - Show "Go Live" in preview mode */}
        {!isStreaming ? (
          <button
            onClick={async () => {
              setIsCreatingStream(true);
              try {
                // Create a stream in the database
                const response = await apiClient.post<any>('/streams', {
                  title: `Live Stream ${new Date().toLocaleDateString()}`,
                  description: 'Live streaming now!',
                  vdoRoomId: vdoRoomId
                });
                
                if (response?.success && response?.data?.id) {
                  const streamId = response.data.id;
                  setStreamId(streamId);
                  
                  // Now make the stream go live
                  try {
                    const goLiveResponse = await apiClient.post<any>(`/streams/${streamId}/go-live`, {
                      streamKey: vdoRoomId // Use vdoRoomId as streamKey
                    });
                    
                    if (goLiveResponse?.success) {
                      console.log('Stream is now live!', goLiveResponse.data);
                      // The backend should return the stream with the vdoRoomId
                      const actualRoomId = goLiveResponse.data?.vdoRoomId || vdoRoomId;
                      console.log('VDO Room ID for streaming:', actualRoomId);
                      
                      // Join socket room for real-time communication
                      try {
                        await socketManager.joinStreamRoomAsync(streamId);
                        console.log('✅ Joined socket room for stream:', streamId);
                      } catch (error) {
                        console.error('❌ Failed to join socket room:', error);
                      }
                      
                      // Pass the actual room ID back to the parent
                      onStreamCreated?.(streamId, actualRoomId);
                      onStreamStart();
                      return; // Exit early since we handled it
                    }
                  } catch (goLiveError) {
                    console.error('Failed to go live:', goLiveError);
                    // Continue anyway - stream is created
                  }
                  
                  // Fallback if go-live failed
                  onStreamCreated?.(streamId, vdoRoomId);
                  onStreamStart();
                }
              } catch (error) {
                console.error('Failed to create stream:', error);
                // Still allow streaming even if DB creation fails
                onStreamStart();
              } finally {
                setIsCreatingStream(false);
              }
            }}
            disabled={isCreatingStream}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingStream ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Video className="w-5 h-5" />
            )}
            {isCreatingStream ? 'Creating Stream...' : (isPreviewMode ? 'Go Live' : 'Create Stream Page')}
          </button>
        ) : (
          <button
            onClick={async () => {
              if (streamId) {
                try {
                  await apiClient.post(`/streams/${streamId}/end`);
                  
                  // Leave socket room
                  socketManager.leaveStreamRoom(streamId);
                  console.log('✅ Left socket room for stream:', streamId);
                } catch (error) {
                  console.error('Failed to end stream in DB:', error);
                }
              }
              onStreamEnd();
              setStreamId(null);
            }}
            className="w-full py-3 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <StopCircle className="w-5 h-5" />
            End Stream Page
          </button>
        )}
            {/* Additional Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OBS Studio Setup
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                To stream with OBS instead of your browser:
              </p>
              <ol className="list-decimal list-inside text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <li>Add a Browser Source in OBS</li>
                <li>Set URL to: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">https://vdo.ninja/?push={vdoRoomId}</code></li>
                <li>Set dimensions to 1920x1080</li>
                <li>Start your OBS stream</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {isStreaming && streamId ? (
              <EnhancedChatContainer
                streamId={streamId}
                viewerCount={viewers.length}
                messages={messages}
                viewers={viewers}
                currentUser={viewers.find(v => v.id === 'streamer') || {
                  id: 'streamer',
                  username: 'Streamer',
                  isStreamer: true,
                  joinTime: new Date(),
                  connectionQuality: 'excellent'
                }}
                onSendMessage={handleSendMessage}
                showViewerList={false}
                maxMessagesPerMinute={10}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Stream Chat</p>
                <p className="text-sm mt-2">Start streaming to enable chat</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'viewers' && (
          <div>
            {isStreaming && viewers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {viewers.length} viewer{viewers.length !== 1 ? 's' : ''} watching
                </p>
                {viewers.map((viewer) => (
                  <div key={viewer.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {viewer.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {viewer.username || 'Anonymous'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {viewer.connectionQuality || 'good'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Viewer List</p>
                <p className="text-sm mt-2">
                  {isStreaming ? 'No viewers yet' : 'Start streaming to see viewers'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className={clsx(
                "text-sm font-medium",
                isStreaming ? "text-green-600" : "text-gray-500"
              )}>
                {isStreaming ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Viewers</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">00:00:00</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bitrate</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">0 kbps</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">FPS</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Resolution</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">-</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Data Sent</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">0 MB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};