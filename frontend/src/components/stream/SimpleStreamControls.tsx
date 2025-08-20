import React from 'react';
import { 
  Video, 
  StopCircle, 
  Info,
  ExternalLink,
  Copy,
  Check,
  Loader,
  Eye
} from 'lucide-react';
import clsx from 'clsx';
import { apiClient } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';

interface SimpleStreamControlsProps {
  vdoRoomId: string;  // The actual VDO.Ninja room ID being used
  isStreaming: boolean;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  currentStreamId?: string;
  onStreamCreated?: (streamId: string) => void;
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
  const navigate = useNavigate();

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Stream Page Management
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create and manage your stream listing
        </p>
        
        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How to stream:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the <strong>"Start"</strong> button in VDO.ninja above to begin broadcasting</li>
                <li>Once VDO.ninja is streaming, click <strong>"Create Stream Page"</strong> below</li>
                <li>Share your stream page URL with viewers</li>
                <li>When done, stop in VDO.ninja first, then click "End Stream" here</li>
              </ol>
              <p className="mt-2 text-xs italic">
                Note: VDO.ninja controls the actual video stream, this page manages your stream listing.
              </p>
            </div>
          </div>
        </div>

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

        {/* Start/Stop Button - Only show when not in preview mode */}
        {!isStreaming && !isPreviewMode ? (
          <button
            onClick={async () => {
              setIsCreatingStream(true);
              try {
                // Create a stream in the database
                const response = await apiClient.post<any>('/streams', {
                  title: `Live Stream ${new Date().toLocaleDateString()}`,
                  description: 'Live streaming now!',
                  scheduled: new Date().toISOString(), // Set to now for immediate streaming
                  vdoRoomId: vdoRoomId
                });
                
                if (response?.success && response?.data?.id) {
                  setStreamId(response.data.id);
                  onStreamCreated?.(response.data.id);
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
            {isCreatingStream ? 'Creating Stream Page...' : 'Create Stream Page'}
          </button>
        ) : (
          <button
            onClick={async () => {
              if (streamId) {
                try {
                  await apiClient.post(`/streams/${streamId}/end`);
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
      </div>

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
  );
};