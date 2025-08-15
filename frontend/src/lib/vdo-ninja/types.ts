export interface VdoStreamerParams {
  streamId: string;
  pushId?: string;
  password?: string;
  bitrate?: number;
  quality?: number;
  framerate?: number;
  codec?: 'h264' | 'vp8' | 'vp9' | 'av1';
  audioCodec?: 'opus' | 'pcmu' | 'pcma';
  videoDevice?: string;
  audioDevice?: string;
  autoStart?: boolean;
  noAudio?: boolean;
  noVideo?: boolean;
  screenShare?: boolean;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  autoGainControl?: boolean;
  stereo?: boolean;
  mirror?: boolean;
  rotate?: number;
  label?: string;
  director?: boolean;
}

export interface VdoViewerParams {
  streamId: string;
  view?: string;
  password?: string;
  bitrate?: number;
  quality?: number;
  framerate?: number;
  codec?: 'h264' | 'vp8' | 'vp9' | 'av1';
  audioCodec?: 'opus' | 'pcmu' | 'pcma';
  noAudio?: boolean;
  noVideo?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fullscreen?: boolean;
  pip?: boolean;
  label?: string;
  scene?: boolean;
  solo?: boolean;
}

export interface VdoCommand {
  action: string;
  value?: any;
  target?: string;
  streamId?: string;
}

export interface VdoStats {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  bitrate: {
    audio: number;
    video: number;
    total: number;
  };
  resolution: {
    width: number;
    height: number;
  };
  framerate: number;
  packetLoss: number;
  latency: number;
  jitter: number;
  audioLevel: number;
  timestamp: number;
}

export interface VdoEvent {
  action: string;
  value?: any;
  streamId?: string;
  target?: string;
  stats?: VdoStats;
  timestamp?: number;
  metadata?: Record<string, any>;
}

// Extended event types for enhanced functionality
export interface StreamLifecycleEvent extends VdoEvent {
  action: 'streamStarted' | 'streamStopped' | 'streamPaused' | 'streamResumed';
  streamInfo?: {
    streamId: string;
    userId?: string;
    userName?: string;
    startTime?: number;
    duration?: number;
  };
}

export interface ViewerEvent extends VdoEvent {
  action: 'viewerJoined' | 'viewerLeft' | 'viewerReconnected';
  viewerInfo?: {
    viewerId: string;
    userName?: string;
    joinTime?: number;
    connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  };
  viewerCount?: number;
}

export interface MediaStateEvent extends VdoEvent {
  action: 'audioMuted' | 'audioUnmuted' | 'videoMuted' | 'videoUnmuted' | 'mediaStateChanged';
  mediaState?: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenShareEnabled: boolean;
    audioDevice?: string;
    videoDevice?: string;
  };
}

export interface QualityEvent extends VdoEvent {
  action: 'qualityChanged' | 'bitrateChanged' | 'resolutionChanged' | 'framerateChanged';
  quality?: {
    bitrate?: number;
    resolution?: { width: number; height: number };
    framerate?: number;
    codec?: string;
    level?: 'auto' | 'high' | 'medium' | 'low';
  };
}

export interface ConnectionHealthEvent extends VdoEvent {
  action: 'connectionHealthUpdate' | 'connectionStateChanged' | 'networkQualityChanged';
  health?: {
    state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    packetLoss?: number;
    latency?: number;
    jitter?: number;
    bandwidth?: {
      upload: number;
      download: number;
    };
  };
}

export interface VdoNinjaConfig {
  baseUrl?: string;
  room?: string;
  apiKey?: string;
  defaultParams?: Partial<VdoStreamerParams & VdoViewerParams>;
  eventThrottling?: {
    enabled: boolean;
    interval: number; // milliseconds
    maxEventsPerInterval?: number;
  };
  errorHandling?: {
    retryAttempts: number;
    retryDelay: number;
    logErrors: boolean;
  };
}

// Event validation schema
export interface EventValidationRule {
  action: string | string[];
  required?: string[];
  optional?: string[];
  validator?: (event: VdoEvent) => boolean;
}

// Throttling configuration
export interface ThrottleConfig {
  interval: number;
  maxEvents?: number;
  leading?: boolean;
  trailing?: boolean;
}