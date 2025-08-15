import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VdoCommandManager, VdoCommands, CommandResponse } from '@/lib/vdo-ninja/commands';
import type { VdoCommand } from '@/lib/vdo-ninja/types';

// Device types
export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  groupId?: string;
  isDefault?: boolean;
  capabilities?: MediaDeviceCapabilities;
}

export interface MediaDeviceCapabilities {
  // Audio capabilities
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: { min: number; max: number };
  channelCount?: { min: number; max: number };
  
  // Video capabilities
  width?: { min: number; max: number };
  height?: { min: number; max: number };
  frameRate?: { min: number; max: number };
  facingMode?: string[];
  resizeMode?: string[];
}

export interface MediaControlState {
  // Audio state
  audioEnabled: boolean;
  audioLevel: number;
  audioDevice: string | null;
  audioGain: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  stereo: boolean;
  
  // Video state
  videoEnabled: boolean;
  videoDevice: string | null;
  videoResolution: { width: number; height: number } | null;
  videoFramerate: number;
  videoBitrate: number;
  
  // Screen share state
  screenShareEnabled: boolean;
  screenShareQuality: 'low' | 'medium' | 'high' | 'max';
  screenShareAudio: boolean;
  
  // Effects
  mirror: boolean;
  blur: boolean;
  blurStrength: number;
  virtualBackground: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  
  // Permissions
  audioPermission: 'granted' | 'denied' | 'prompt';
  videoPermission: 'granted' | 'denied' | 'prompt';
  screenPermission: 'granted' | 'denied' | 'prompt';
}

export interface MediaControlOptions {
  // Command queue configuration
  enableOfflineQueue?: boolean;
  maxQueueSize?: number;
  queuePersistence?: boolean;
  
  // Device configuration
  autoSelectDefaultDevices?: boolean;
  deviceChangeMonitoring?: boolean;
  devicePollingInterval?: number;
  
  // Permission handling
  autoRequestPermissions?: boolean;
  permissionPromptDelay?: number;
  
  // Error handling
  maxRetries?: number;
  retryDelay?: number;
  fallbackOnError?: boolean;
  
  // Performance
  audioLevelPolling?: boolean;
  audioLevelInterval?: number;
  
  // Quality presets
  defaultVideoQuality?: 'low' | 'medium' | 'high' | 'max';
  defaultAudioQuality?: 'low' | 'medium' | 'high' | 'max';
}

export interface MediaControlActions {
  // Audio controls
  toggleAudio: () => Promise<boolean>;
  setAudioEnabled: (enabled: boolean) => Promise<void>;
  setAudioDevice: (deviceId: string) => Promise<void>;
  setAudioGain: (gain: number) => Promise<void>;
  setNoiseSuppression: (enabled: boolean) => Promise<void>;
  setEchoCancellation: (enabled: boolean) => Promise<void>;
  setAutoGainControl: (enabled: boolean) => Promise<void>;
  setStereo: (enabled: boolean) => Promise<void>;
  
  // Video controls
  toggleVideo: () => Promise<boolean>;
  setVideoEnabled: (enabled: boolean) => Promise<void>;
  setVideoDevice: (deviceId: string) => Promise<void>;
  setVideoResolution: (width: number, height: number) => Promise<void>;
  setVideoFramerate: (fps: number) => Promise<void>;
  setVideoBitrate: (bitrate: number) => Promise<void>;
  setVideoQuality: (quality: 'low' | 'medium' | 'high' | 'max') => Promise<void>;
  
  // Screen share controls
  toggleScreenShare: () => Promise<boolean>;
  startScreenShare: (options?: { audio?: boolean; quality?: 'low' | 'medium' | 'high' | 'max' }) => Promise<void>;
  stopScreenShare: () => Promise<void>;
  setScreenShareQuality: (quality: 'low' | 'medium' | 'high' | 'max') => Promise<void>;
  
  // Effects
  toggleMirror: () => Promise<boolean>;
  setMirror: (enabled: boolean) => Promise<void>;
  toggleBlur: () => Promise<boolean>;
  setBlur: (enabled: boolean, strength?: number) => Promise<void>;
  setVirtualBackground: (imageUrl: string | null) => Promise<void>;
  setBrightness: (level: number) => Promise<void>;
  setContrast: (level: number) => Promise<void>;
  setSaturation: (level: number) => Promise<void>;
  
  // Device management
  switchCamera: () => Promise<void>;
  switchMicrophone: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  
  // Permission management
  requestAudioPermission: () => Promise<boolean>;
  requestVideoPermission: () => Promise<boolean>;
  requestScreenPermission: () => Promise<boolean>;
  checkPermissions: () => Promise<void>;
  
  // Quality presets
  applyQualityPreset: (preset: 'low' | 'medium' | 'high' | 'max') => Promise<void>;
  applyAudioPreset: (preset: 'voice' | 'music' | 'streaming') => Promise<void>;
  
  // Custom command
  sendCommand: (command: VdoCommand) => Promise<CommandResponse | void>;
}

export interface UseMediaControlsReturn {
  // State
  state: MediaControlState;
  
  // Devices
  audioInputDevices: MediaDevice[];
  audioOutputDevices: MediaDevice[];
  videoInputDevices: MediaDevice[];
  currentAudioInput: MediaDevice | null;
  currentAudioOutput: MediaDevice | null;
  currentVideoInput: MediaDevice | null;
  
  // Actions
  actions: MediaControlActions;
  
  // Status
  isInitialized: boolean;
  hasAudioPermission: boolean;
  hasVideoPermission: boolean;
  hasScreenPermission: boolean;
  isProcessingCommand: boolean;
  queueSize: number;
  
  // Capabilities
  capabilities: {
    canEnumerateDevices: boolean;
    canSelectAudioOutput: boolean;
    canApplyVideoEffects: boolean;
    canShareScreen: boolean;
    canRecordMedia: boolean;
  };
  
  // Initialize
  initialize: (commandManager: VdoCommandManager) => void;
  
  // Cleanup
  cleanup: () => void;
}

/**
 * React hook for comprehensive media controls with VDO.Ninja
 */
export function useMediaControls(options: MediaControlOptions = {}): UseMediaControlsReturn {
  const {
    enableOfflineQueue = true,
    maxQueueSize = 50,
    queuePersistence = false,
    autoSelectDefaultDevices = true,
    deviceChangeMonitoring = true,
    devicePollingInterval = 5000,
    autoRequestPermissions = false,
    permissionPromptDelay = 1000,
    maxRetries = 3,
    retryDelay = 1000,
    fallbackOnError = true,
    audioLevelPolling = false,
    audioLevelInterval = 100,
    defaultVideoQuality = 'medium',
    defaultAudioQuality = 'high'
  } = options;
  
  // Command manager ref
  const commandManagerRef = useRef<VdoCommandManager | null>(null);
  const isInitializedRef = useRef(false);
  
  // Device monitoring
  const devicePollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Command queue for offline
  const offlineQueueRef = useRef<VdoCommand[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  
  // Media control state
  const [state, setState] = useState<MediaControlState>({
    // Audio
    audioEnabled: true,
    audioLevel: 0,
    audioDevice: null,
    audioGain: 100,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    stereo: false,
    
    // Video
    videoEnabled: true,
    videoDevice: null,
    videoResolution: null,
    videoFramerate: 30,
    videoBitrate: 2500000,
    
    // Screen share
    screenShareEnabled: false,
    screenShareQuality: 'high',
    screenShareAudio: false,
    
    // Effects
    mirror: false,
    blur: false,
    blurStrength: 10,
    virtualBackground: null,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    
    // Permissions
    audioPermission: 'prompt',
    videoPermission: 'prompt',
    screenPermission: 'prompt'
  });
  
  // Devices
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDevice[]>([]);
  
  // Load offline queue from storage if persistence is enabled
  useEffect(() => {
    if (queuePersistence) {
      try {
        const stored = localStorage.getItem('vdo-media-controls-queue');
        if (stored) {
          offlineQueueRef.current = JSON.parse(stored);
          setQueueSize(offlineQueueRef.current.length);
        }
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    }
  }, [queuePersistence]);
  
  // Save offline queue to storage
  const saveOfflineQueue = useCallback(() => {
    if (queuePersistence) {
      try {
        localStorage.setItem('vdo-media-controls-queue', JSON.stringify(offlineQueueRef.current));
      } catch (error) {
        console.error('Failed to save offline queue:', error);
      }
    }
  }, [queuePersistence]);
  
  // Enumerate media devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs: MediaDevice[] = [];
      const audioOutputs: MediaDevice[] = [];
      const videoInputs: MediaDevice[] = [];
      
      devices.forEach(device => {
        const mediaDevice: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${device.deviceId.substr(0, 8)}`,
          kind: device.kind as MediaDevice['kind'],
          groupId: device.groupId
        };
        
        switch (device.kind) {
          case 'audioinput':
            audioInputs.push(mediaDevice);
            break;
          case 'audiooutput':
            audioOutputs.push(mediaDevice);
            break;
          case 'videoinput':
            videoInputs.push(mediaDevice);
            break;
        }
      });
      
      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      setVideoInputDevices(videoInputs);
      
      // Auto-select default devices if enabled
      if (autoSelectDefaultDevices && audioInputs.length > 0 && !state.audioDevice) {
        setState(prev => ({ ...prev, audioDevice: audioInputs[0].deviceId }));
      }
      if (autoSelectDefaultDevices && videoInputs.length > 0 && !state.videoDevice) {
        setState(prev => ({ ...prev, videoDevice: videoInputs[0].deviceId }));
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  }, [autoSelectDefaultDevices, state.audioDevice, state.videoDevice]);
  
  // Check permissions
  const checkPermissions = useCallback(async () => {
    try {
      // Check audio permission
      const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setState(prev => ({ ...prev, audioPermission: audioPermission.state as MediaControlState['audioPermission'] }));
      
      // Check video permission
      const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setState(prev => ({ ...prev, videoPermission: videoPermission.state as MediaControlState['videoPermission'] }));
      
      // Note: Screen permission cannot be queried
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  }, []);
  
  // Initialize device monitoring
  useEffect(() => {
    if (deviceChangeMonitoring) {
      // Initial enumeration
      enumerateDevices();
      checkPermissions();
      
      // Set up device change listener
      const handleDeviceChange = () => {
        enumerateDevices();
      };
      
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      // Set up polling as fallback
      if (devicePollingInterval > 0) {
        devicePollingTimerRef.current = setInterval(() => {
          enumerateDevices();
        }, devicePollingInterval);
      }
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        if (devicePollingTimerRef.current) {
          clearInterval(devicePollingTimerRef.current);
        }
      };
    }
  }, [deviceChangeMonitoring, devicePollingInterval, enumerateDevices, checkPermissions]);
  
  // Initialize audio level monitoring
  useEffect(() => {
    if (audioLevelPolling && state.audioEnabled) {
      const initAudioLevel = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          
          const updateLevel = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setState(prev => ({ ...prev, audioLevel: average / 255 }));
            }
          };
          
          audioLevelTimerRef.current = setInterval(updateLevel, audioLevelInterval);
        } catch (error) {
          console.error('Failed to initialize audio level monitoring:', error);
        }
      };
      
      initAudioLevel();
      
      return () => {
        if (audioLevelTimerRef.current) {
          clearInterval(audioLevelTimerRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  }, [audioLevelPolling, audioLevelInterval, state.audioEnabled]);
  
  // Send command with queue support
  const sendCommandWithQueue = useCallback(async (
    command: VdoCommand,
    updateState?: Partial<MediaControlState>
  ): Promise<CommandResponse | void> => {
    if (!commandManagerRef.current) {
      // Queue command if offline
      if (enableOfflineQueue) {
        offlineQueueRef.current.push(command);
        if (offlineQueueRef.current.length > maxQueueSize) {
          offlineQueueRef.current.shift();
        }
        setQueueSize(offlineQueueRef.current.length);
        saveOfflineQueue();
      }
      throw new Error('Command manager not initialized');
    }
    
    setIsProcessingCommand(true);
    
    try {
      // Apply optimistic update
      if (updateState) {
        setState(prev => ({ ...prev, ...updateState }));
      }
      
      // Send command
      const response = await commandManagerRef.current.sendCommand(command, {
        priority: 'normal',
        waitForResponse: true,
        queueIfOffline: enableOfflineQueue
      });
      
      // Handle error with fallback
      if (response && !response.success && fallbackOnError) {
        // Revert optimistic update
        if (updateState) {
          setState(prev => {
            const reverted = { ...prev };
            Object.keys(updateState).forEach(key => {
              delete (reverted as any)[key];
            });
            return reverted;
          });
        }
        
        // Try fallback command if available
        // This would be implemented based on specific command types
      }
      
      return response;
    } finally {
      setIsProcessingCommand(false);
    }
  }, [enableOfflineQueue, maxQueueSize, saveOfflineQueue, fallbackOnError]);
  
  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    if (!commandManagerRef.current || offlineQueueRef.current.length === 0) {
      return;
    }
    
    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];
    setQueueSize(0);
    saveOfflineQueue();
    
    for (const command of queue) {
      try {
        await commandManagerRef.current.sendCommand(command);
      } catch (error) {
        console.error('Failed to process queued command:', error);
      }
    }
  }, [saveOfflineQueue]);
  
  // Initialize
  const initialize = useCallback((commandManager: VdoCommandManager) => {
    commandManagerRef.current = commandManager;
    isInitializedRef.current = true;
    
    // Process any queued commands
    processOfflineQueue();
    
    // Auto-request permissions if enabled
    if (autoRequestPermissions) {
      setTimeout(() => {
        if (state.audioPermission === 'prompt') {
          requestAudioPermission();
        }
        if (state.videoPermission === 'prompt') {
          requestVideoPermission();
        }
      }, permissionPromptDelay);
    }
  }, [processOfflineQueue, autoRequestPermissions, permissionPromptDelay, state.audioPermission, state.videoPermission]);
  
  // Cleanup
  const cleanup = useCallback(() => {
    if (devicePollingTimerRef.current) {
      clearInterval(devicePollingTimerRef.current);
    }
    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    commandManagerRef.current = null;
    isInitializedRef.current = false;
  }, []);
  
  // Audio control actions
  const toggleAudio = useCallback(async () => {
    const newState = !state.audioEnabled;
    await sendCommandWithQueue(
      newState ? VdoCommands.unmuteAudio() : VdoCommands.muteAudio(),
      { audioEnabled: newState }
    );
    return newState;
  }, [state.audioEnabled, sendCommandWithQueue]);
  
  const setAudioEnabled = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      enabled ? VdoCommands.unmuteAudio() : VdoCommands.muteAudio(),
      { audioEnabled: enabled }
    );
  }, [sendCommandWithQueue]);
  
  const setAudioDevice = useCallback(async (deviceId: string) => {
    await sendCommandWithQueue(
      VdoCommands.setMicrophone(deviceId),
      { audioDevice: deviceId }
    );
  }, [sendCommandWithQueue]);
  
  const setAudioGain = useCallback(async (gain: number) => {
    await sendCommandWithQueue(
      VdoCommands.setAudioGain(gain),
      { audioGain: gain }
    );
  }, [sendCommandWithQueue]);
  
  const setNoiseSuppression = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      VdoCommands.enableNoiseSuppression(enabled),
      { noiseSuppression: enabled }
    );
  }, [sendCommandWithQueue]);
  
  const setEchoCancellation = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      VdoCommands.enableEchoCancellation(enabled),
      { echoCancellation: enabled }
    );
  }, [sendCommandWithQueue]);
  
  const setAutoGainControl = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      VdoCommands.enableAutoGainControl(enabled),
      { autoGainControl: enabled }
    );
  }, [sendCommandWithQueue]);
  
  const setStereo = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      VdoCommands.setStereoAudio(enabled),
      { stereo: enabled }
    );
  }, [sendCommandWithQueue]);
  
  // Video control actions
  const toggleVideo = useCallback(async () => {
    const newState = !state.videoEnabled;
    await sendCommandWithQueue(
      newState ? VdoCommands.showVideo() : VdoCommands.hideVideo(),
      { videoEnabled: newState }
    );
    return newState;
  }, [state.videoEnabled, sendCommandWithQueue]);
  
  const setVideoEnabled = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      enabled ? VdoCommands.showVideo() : VdoCommands.hideVideo(),
      { videoEnabled: enabled }
    );
  }, [sendCommandWithQueue]);
  
  const setVideoDevice = useCallback(async (deviceId: string) => {
    await sendCommandWithQueue(
      VdoCommands.setCamera(deviceId),
      { videoDevice: deviceId }
    );
  }, [sendCommandWithQueue]);
  
  const setVideoResolution = useCallback(async (width: number, height: number) => {
    await sendCommandWithQueue(
      VdoCommands.setResolution(width, height),
      { videoResolution: { width, height } }
    );
  }, [sendCommandWithQueue]);
  
  const setVideoFramerate = useCallback(async (fps: number) => {
    await sendCommandWithQueue(
      VdoCommands.setFramerate(fps),
      { videoFramerate: fps }
    );
  }, [sendCommandWithQueue]);
  
  const setVideoBitrate = useCallback(async (bitrate: number) => {
    await sendCommandWithQueue(
      VdoCommands.setBitrate(bitrate),
      { videoBitrate: bitrate }
    );
  }, [sendCommandWithQueue]);
  
  const setVideoQuality = useCallback(async (quality: 'low' | 'medium' | 'high' | 'max') => {
    const qualityMap = {
      low: { bitrate: 500000, resolution: { width: 640, height: 360 }, fps: 15 },
      medium: { bitrate: 1500000, resolution: { width: 1280, height: 720 }, fps: 30 },
      high: { bitrate: 3000000, resolution: { width: 1920, height: 1080 }, fps: 30 },
      max: { bitrate: 5000000, resolution: { width: 1920, height: 1080 }, fps: 60 }
    };
    
    const settings = qualityMap[quality];
    await setVideoBitrate(settings.bitrate);
    await setVideoResolution(settings.resolution.width, settings.resolution.height);
    await setVideoFramerate(settings.fps);
  }, [setVideoBitrate, setVideoResolution, setVideoFramerate]);
  
  // Screen share controls
  const toggleScreenShare = useCallback(async () => {
    const newState = !state.screenShareEnabled;
    await sendCommandWithQueue(
      newState ? VdoCommands.startScreenShare() : VdoCommands.stopScreenShare(),
      { screenShareEnabled: newState }
    );
    return newState;
  }, [state.screenShareEnabled, sendCommandWithQueue]);
  
  const startScreenShare = useCallback(async (options?: {
    audio?: boolean;
    quality?: 'low' | 'medium' | 'high' | 'max';
  }) => {
    await sendCommandWithQueue(
      VdoCommands.startScreenShare(),
      { 
        screenShareEnabled: true,
        screenShareAudio: options?.audio || false,
        screenShareQuality: options?.quality || 'high'
      }
    );
    
    if (options?.quality) {
      await setScreenShareQuality(options.quality);
    }
    if (options?.audio !== undefined) {
      await sendCommandWithQueue(VdoCommands.shareAudio(options.audio));
    }
  }, [sendCommandWithQueue]);
  
  const stopScreenShare = useCallback(async () => {
    await sendCommandWithQueue(
      VdoCommands.stopScreenShare(),
      { screenShareEnabled: false }
    );
  }, [sendCommandWithQueue]);
  
  const setScreenShareQuality = useCallback(async (quality: 'low' | 'medium' | 'high' | 'max') => {
    await sendCommandWithQueue(
      VdoCommands.setScreenShareQuality(quality),
      { screenShareQuality: quality }
    );
  }, [sendCommandWithQueue]);
  
  // Effects
  const toggleMirror = useCallback(async () => {
    const newState = !state.mirror;
    await sendCommandWithQueue(
      VdoCommands.setMirror(newState),
      { mirror: newState }
    );
    return newState;
  }, [state.mirror, sendCommandWithQueue]);
  
  const setMirror = useCallback(async (enabled: boolean) => {
    await sendCommandWithQueue(
      VdoCommands.setMirror(enabled),
      { mirror: enabled }
    );
  }, [sendCommandWithQueue]);
  
  const toggleBlur = useCallback(async () => {
    const newState = !state.blur;
    await sendCommandWithQueue(
      VdoCommands.setBlur(newState, state.blurStrength),
      { blur: newState }
    );
    return newState;
  }, [state.blur, state.blurStrength, sendCommandWithQueue]);
  
  const setBlur = useCallback(async (enabled: boolean, strength?: number) => {
    const blurStrength = strength || state.blurStrength;
    await sendCommandWithQueue(
      VdoCommands.setBlur(enabled, blurStrength),
      { blur: enabled, blurStrength }
    );
  }, [state.blurStrength, sendCommandWithQueue]);
  
  const setVirtualBackground = useCallback(async (imageUrl: string | null) => {
    await sendCommandWithQueue(
      VdoCommands.setVirtualBackground(imageUrl),
      { virtualBackground: imageUrl }
    );
  }, [sendCommandWithQueue]);
  
  const setBrightness = useCallback(async (level: number) => {
    await sendCommandWithQueue(
      VdoCommands.setBrightness(level),
      { brightness: level }
    );
  }, [sendCommandWithQueue]);
  
  const setContrast = useCallback(async (level: number) => {
    await sendCommandWithQueue(
      VdoCommands.setContrast(level),
      { contrast: level }
    );
  }, [sendCommandWithQueue]);
  
  const setSaturation = useCallback(async (level: number) => {
    await sendCommandWithQueue(
      VdoCommands.setSaturation(level),
      { saturation: level }
    );
  }, [sendCommandWithQueue]);
  
  // Device management
  const switchCamera = useCallback(async () => {
    await sendCommandWithQueue(VdoCommands.switchCamera());
    // Re-enumerate to get updated device
    await enumerateDevices();
  }, [sendCommandWithQueue, enumerateDevices]);
  
  const switchMicrophone = useCallback(async () => {
    await sendCommandWithQueue(VdoCommands.switchMicrophone());
    // Re-enumerate to get updated device
    await enumerateDevices();
  }, [sendCommandWithQueue, enumerateDevices]);
  
  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
  }, [enumerateDevices]);
  
  // Permission management
  const requestAudioPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      await checkPermissions();
      return true;
    } catch (error) {
      console.error('Failed to request audio permission:', error);
      return false;
    }
  }, [checkPermissions]);
  
  const requestVideoPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      await checkPermissions();
      return true;
    } catch (error) {
      console.error('Failed to request video permission:', error);
      return false;
    }
  }, [checkPermissions]);
  
  const requestScreenPermission = useCallback(async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setState(prev => ({ ...prev, screenPermission: 'granted' }));
      return true;
    } catch (error) {
      console.error('Failed to request screen permission:', error);
      setState(prev => ({ ...prev, screenPermission: 'denied' }));
      return false;
    }
  }, []);
  
  // Quality presets
  const applyQualityPreset = useCallback(async (preset: 'low' | 'medium' | 'high' | 'max') => {
    await setVideoQuality(preset);
  }, [setVideoQuality]);
  
  const applyAudioPreset = useCallback(async (preset: 'voice' | 'music' | 'streaming') => {
    switch (preset) {
      case 'voice':
        await setNoiseSuppression(true);
        await setEchoCancellation(true);
        await setAutoGainControl(true);
        await setStereo(false);
        break;
      case 'music':
        await setNoiseSuppression(false);
        await setEchoCancellation(false);
        await setAutoGainControl(false);
        await setStereo(true);
        break;
      case 'streaming':
        await setNoiseSuppression(true);
        await setEchoCancellation(true);
        await setAutoGainControl(false);
        await setStereo(true);
        break;
    }
  }, [setNoiseSuppression, setEchoCancellation, setAutoGainControl, setStereo]);
  
  // Custom command
  const sendCommand = useCallback(async (command: VdoCommand) => {
    return sendCommandWithQueue(command);
  }, [sendCommandWithQueue]);
  
  // Current devices
  const currentAudioInput = useMemo(() => 
    audioInputDevices.find(d => d.deviceId === state.audioDevice) || null,
    [audioInputDevices, state.audioDevice]
  );
  
  const currentAudioOutput = useMemo(() => 
    audioOutputDevices.find(d => d.deviceId === 'default') || null,
    [audioOutputDevices]
  );
  
  const currentVideoInput = useMemo(() => 
    videoInputDevices.find(d => d.deviceId === state.videoDevice) || null,
    [videoInputDevices, state.videoDevice]
  );
  
  // Capabilities detection
  const capabilities = useMemo(() => ({
    canEnumerateDevices: 'mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices,
    canSelectAudioOutput: 'setSinkId' in HTMLMediaElement.prototype,
    canApplyVideoEffects: true, // Assume VDO.Ninja supports effects
    canShareScreen: 'getDisplayMedia' in navigator.mediaDevices,
    canRecordMedia: 'MediaRecorder' in window
  }), []);
  
  // Actions object
  const actions: MediaControlActions = {
    // Audio
    toggleAudio,
    setAudioEnabled,
    setAudioDevice,
    setAudioGain,
    setNoiseSuppression,
    setEchoCancellation,
    setAutoGainControl,
    setStereo,
    
    // Video
    toggleVideo,
    setVideoEnabled,
    setVideoDevice,
    setVideoResolution,
    setVideoFramerate,
    setVideoBitrate,
    setVideoQuality,
    
    // Screen share
    toggleScreenShare,
    startScreenShare,
    stopScreenShare,
    setScreenShareQuality,
    
    // Effects
    toggleMirror,
    setMirror,
    toggleBlur,
    setBlur,
    setVirtualBackground,
    setBrightness,
    setContrast,
    setSaturation,
    
    // Device management
    switchCamera,
    switchMicrophone,
    refreshDevices,
    
    // Permissions
    requestAudioPermission,
    requestVideoPermission,
    requestScreenPermission,
    checkPermissions,
    
    // Presets
    applyQualityPreset,
    applyAudioPreset,
    
    // Custom
    sendCommand
  };
  
  return {
    state,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    currentAudioInput,
    currentAudioOutput,
    currentVideoInput,
    actions,
    isInitialized: isInitializedRef.current,
    hasAudioPermission: state.audioPermission === 'granted',
    hasVideoPermission: state.videoPermission === 'granted',
    hasScreenPermission: state.screenPermission === 'granted',
    isProcessingCommand,
    queueSize,
    capabilities,
    initialize,
    cleanup
  };
}