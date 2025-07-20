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
}

export interface VdoNinjaConfig {
  baseUrl?: string;
  room?: string;
  apiKey?: string;
  defaultParams?: Partial<VdoStreamerParams & VdoViewerParams>;
}