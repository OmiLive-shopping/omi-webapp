import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Settings,
  Wifi,
  WifiOff,
  Volume2,
  Headphones,
  Loader,
  AlertCircle,
  ChevronDown,
  X
} from 'lucide-react';
import clsx from 'clsx';

interface StreamControlsProps {
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  onControlsChange?: (controls: StreamControlState) => void;
}

interface StreamControlState {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  quality: QualityPreset;
  audioDevice?: string;
  videoDevice?: string;
}

type QualityPreset = '1080p' | '720p' | '480p' | '360p' | 'auto';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export const StreamControls: React.FC<StreamControlsProps> = ({ 
  iframeRef,
  onControlsChange 
}) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [quality, setQuality] = useState<QualityPreset>('720p');
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Media devices state
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  
  // Preview refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Get available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        
        setAudioDevices(audioInputs.map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: 'audioinput' as const
        })));
        
        setVideoDevices(videoInputs.map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          kind: 'videoinput' as const
        })));
        
        // Set default devices
        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    getDevices();
  }, [selectedAudioDevice, selectedVideoDevice]);

  // Initialize camera preview
  useEffect(() => {
    const startPreview = async () => {
      if (isCameraOn && videoPreviewRef.current && selectedVideoDevice) {
        try {
          // Stop any existing stream first
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
          }
          
          // Request camera with specific constraints
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
          
          localStreamRef.current = stream;
          
          // Make sure the video element still exists
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
            // Ensure video plays
            videoPreviewRef.current.play().catch(err => {
              console.error('Error playing video preview:', err);
            });
          }
        } catch (err) {
          console.error('Error starting video preview:', err);
          if (err instanceof Error) {
            if (err.name === 'NotAllowedError') {
              setError('Camera access denied. Please allow camera permissions.');
            } else if (err.name === 'NotFoundError') {
              setError('No camera found. Please connect a camera.');
            } else {
              setError('Failed to access camera: ' + err.message);
            }
          }
        }
      } else if (!isCameraOn && localStreamRef.current) {
        // Stop all tracks when camera is off
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      }
    };
    
    startPreview();
    
    // Cleanup on unmount
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [isCameraOn, selectedVideoDevice]);

  // Send command to VDO.ninja iframe
  const sendVdoCommand = (command: string) => {
    if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        command: command
      }, '*');
    }
  };

  // Control handlers
  const toggleMic = async () => {
    setIsLoading('mic');
    try {
      const newState = !isMicOn;
      setIsMicOn(newState);
      sendVdoCommand(newState ? 'unmute-mic' : 'mute-mic');
      onControlsChange?.({
        isMicOn: newState,
        isCameraOn,
        isScreenSharing,
        quality,
        audioDevice: selectedAudioDevice,
        videoDevice: selectedVideoDevice
      });
      setError(null);
    } catch (err) {
      setError('Failed to toggle microphone');
    } finally {
      setIsLoading(null);
    }
  };

  const toggleCamera = async () => {
    setIsLoading('camera');
    try {
      const newState = !isCameraOn;
      setIsCameraOn(newState);
      sendVdoCommand(newState ? 'start-video' : 'stop-video');
      onControlsChange?.({
        isMicOn,
        isCameraOn: newState,
        isScreenSharing,
        quality,
        audioDevice: selectedAudioDevice,
        videoDevice: selectedVideoDevice
      });
      setError(null);
    } catch (err) {
      setError('Failed to toggle camera');
    } finally {
      setIsLoading(null);
    }
  };

  const toggleScreenShare = async () => {
    setIsLoading('screen');
    try {
      if (!isScreenSharing) {
        // Request screen share
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Handle stream end
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          sendVdoCommand('stop-screenshare');
        };
        
        setIsScreenSharing(true);
        sendVdoCommand('start-screenshare');
      } else {
        setIsScreenSharing(false);
        sendVdoCommand('stop-screenshare');
      }
      
      onControlsChange?.({
        isMicOn,
        isCameraOn,
        isScreenSharing: !isScreenSharing,
        quality,
        audioDevice: selectedAudioDevice,
        videoDevice: selectedVideoDevice
      });
      setError(null);
    } catch (err) {
      setError('Failed to toggle screen share');
    } finally {
      setIsLoading(null);
    }
  };

  const changeQuality = (newQuality: QualityPreset) => {
    setQuality(newQuality);
    setShowQualityDropdown(false);
    
    // Map quality to VDO.ninja bitrate commands
    const qualityMap = {
      '1080p': { width: 1920, height: 1080, bitrate: 4000 },
      '720p': { width: 1280, height: 720, bitrate: 2500 },
      '480p': { width: 854, height: 480, bitrate: 1000 },
      '360p': { width: 640, height: 360, bitrate: 600 },
      'auto': { width: 0, height: 0, bitrate: 0 }
    };
    
    const settings = qualityMap[newQuality];
    sendVdoCommand(`set-quality:${JSON.stringify(settings)}`);
    
    onControlsChange?.({
      isMicOn,
      isCameraOn,
      isScreenSharing,
      quality: newQuality,
      audioDevice: selectedAudioDevice,
      videoDevice: selectedVideoDevice
    });
  };

  const qualityOptions: QualityPreset[] = ['1080p', '720p', '480p', '360p', 'auto'];

  return (
    <>
      <div className="bg-gray-900 rounded-lg p-4 space-y-4">
        {/* Main Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Microphone Control */}
            <button
              onClick={toggleMic}
              disabled={isLoading === 'mic'}
              className={clsx(
                'p-3 rounded-lg transition-all duration-200',
                'hover:scale-105 active:scale-95',
                isMicOn 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
              title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isLoading === 'mic' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : isMicOn ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            {/* Camera Control */}
            <button
              onClick={toggleCamera}
              disabled={isLoading === 'camera'}
              className={clsx(
                'p-3 rounded-lg transition-all duration-200',
                'hover:scale-105 active:scale-95',
                isCameraOn 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
              title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isLoading === 'camera' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : isCameraOn ? (
                <Camera className="w-5 h-5" />
              ) : (
                <CameraOff className="w-5 h-5" />
              )}
            </button>

            {/* Screen Share Control */}
            <button
              onClick={toggleScreenShare}
              disabled={isLoading === 'screen'}
              className={clsx(
                'p-3 rounded-lg transition-all duration-200',
                'hover:scale-105 active:scale-95',
                isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              )}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
              {isLoading === 'screen' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : isScreenSharing ? (
                <Monitor className="w-5 h-5" />
              ) : (
                <MonitorOff className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowQualityDropdown(!showQualityDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">{quality}</span>
                <ChevronDown className={clsx(
                  'w-4 h-4 transition-transform',
                  showQualityDropdown && 'rotate-180'
                )} />
              </button>

              {showQualityDropdown && (
                <div className="absolute bottom-full mb-2 right-0 bg-gray-800 rounded-lg shadow-xl py-1 min-w-[120px]">
                  {qualityOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => changeQuality(option)}
                      className={clsx(
                        'w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors',
                        quality === option ? 'text-blue-400' : 'text-white'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Advanced settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Preview */}
        {isCameraOn && (
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-xs">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => {
                // If no stream, try to request permissions again
                if (!localStreamRef.current) {
                  setIsCameraOn(false);
                  setTimeout(() => setIsCameraOn(true), 100);
                }
              }}
            />
            <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
              Camera Preview
            </div>
            {!localStreamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-white mb-2 mx-auto" />
                  <p className="text-sm text-white">Click to enable camera</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Advanced Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Stream Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Audio Device Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Mic className="w-4 h-4 inline mr-2" />
                  Microphone
                </label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Device Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Camera className="w-4 h-4 inline mr-2" />
                  Camera
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Volume2 className="w-4 h-4 inline mr-2" />
                  Audio Settings
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" className="rounded" defaultChecked />
                    Echo cancellation
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" className="rounded" defaultChecked />
                    Noise suppression
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" className="rounded" />
                    Auto gain control
                  </label>
                </div>
              </div>

              {/* Stream Info */}
              <div className="pt-4 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Stream Information</h4>
                <div className="space-y-1 text-sm text-gray-400">
                  <p>Resolution: {quality === 'auto' ? 'Automatic' : quality}</p>
                  <p>Encoder: WebRTC (VP8/H.264)</p>
                  <p>Protocol: WebRTC over HTTPS</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StreamControls;