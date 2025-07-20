import React, { useState } from 'react';
import { useVdoNinja } from '@/hooks/useVdoNinja';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VdoStreamerParams, VdoViewerParams } from '@/lib/vdo-ninja/types';
import { VdoErrorRecovery } from '@/lib/vdo-ninja/errors';

export const VdoNinjaDebug: React.FC = () => {
  const [mode, setMode] = useState<'streamer' | 'viewer'>('streamer');
  const [streamId, setStreamId] = useState('test-stream');
  
  const streamerParams: VdoStreamerParams = {
    streamId,
    autoStart: true,
    quality: 2,
    bitrate: 2500,
    framerate: 30,
    stereo: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
  };

  const viewerParams: VdoViewerParams = {
    streamId,
    autoplay: true,
    controls: true,
  };

  const {
    iframeRef,
    url,
    isLoaded,
    isConnected,
    stats,
    aggregatedStats,
    error,
    sendCommand,
    commands,
    reload,
    requestStats,
    exportStats,
  } = useVdoNinja({
    mode,
    params: mode === 'streamer' ? streamerParams : viewerParams,
    onEvent: (event) => {
      console.log('VDO.ninja event:', event);
    },
    onError: (error) => {
      console.error('VDO.ninja error:', error);
    },
  });

  const handleExportStats = () => {
    const csv = exportStats();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vdo-stats-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">VDO.ninja Debug Panel</h2>
          
          {/* Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Mode</label>
            <div className="flex space-x-2">
              <Button
                variant={mode === 'streamer' ? 'primary' : 'outline'}
                onClick={() => setMode('streamer')}
              >
                Streamer
              </Button>
              <Button
                variant={mode === 'viewer' ? 'primary' : 'outline'}
                onClick={() => setMode('viewer')}
              >
                Viewer
              </Button>
            </div>
          </div>

          {/* Stream ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Stream ID</label>
            <input
              type="text"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className={`px-2 py-1 rounded text-sm ${
                isLoaded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isLoaded ? 'Loaded' : 'Loading...'}
              </span>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">
                  {VdoErrorRecovery.getUserMessage(error)}
                </p>
                {error.recoverable && (
                  <p className="text-red-600 text-xs mt-1">
                    This error is recoverable. Attempting to reconnect...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Controls</h3>
            <div className="grid grid-cols-3 gap-2">
              {mode === 'streamer' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.toggleStream())}
                  >
                    Toggle Stream
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.toggleAudio())}
                  >
                    Toggle Audio
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.toggleVideo())}
                  >
                    Toggle Video
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.switchCamera())}
                  >
                    Switch Camera
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.startScreenShare())}
                  >
                    Screen Share
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.startRecording())}
                  >
                    Start Recording
                  </Button>
                </>
              )}
              {mode === 'viewer' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.toggleAudio())}
                  >
                    Toggle Audio
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendCommand(commands.setVolume(50))}
                  >
                    Volume 50%
                  </Button>
                </>
              )}
              <Button
                size="sm"
                onClick={requestStats}
              >
                Request Stats
              </Button>
              <Button
                size="sm"
                onClick={reload}
              >
                Reload
              </Button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Connection Stats</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Connection: {stats.connectionState}</div>
                <div>ICE: {stats.iceConnectionState}</div>
                <div>Video Bitrate: {stats.bitrate.video} kbps</div>
                <div>Audio Bitrate: {stats.bitrate.audio} kbps</div>
                <div>Resolution: {stats.resolution.width}x{stats.resolution.height}</div>
                <div>FPS: {stats.framerate}</div>
                <div>Packet Loss: {stats.packetLoss}%</div>
                <div>Latency: {stats.latency}ms</div>
              </div>
            </div>
          )}

          {/* Aggregated Stats */}
          {aggregatedStats && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Aggregated Stats (30s window)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Avg Video Bitrate: {aggregatedStats.avgBitrate.video.toFixed(0)} kbps</div>
                <div>Peak Video Bitrate: {aggregatedStats.peakBitrate.video} kbps</div>
                <div>Avg FPS: {aggregatedStats.avgFramerate.toFixed(1)}</div>
                <div>Avg Packet Loss: {aggregatedStats.avgPacketLoss.toFixed(2)}%</div>
                <div>Connection Stability: {aggregatedStats.connectionStability}%</div>
                <div>
                  <Button size="sm" onClick={handleExportStats}>
                    Export Stats CSV
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* URL */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Generated URL</h3>
            <div className="p-2 bg-gray-100 rounded text-xs font-mono break-all">
              {url}
            </div>
          </div>

          {/* VDO.ninja iframe */}
          <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              allow="camera; microphone; display-capture; autoplay"
              title="VDO.ninja"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};