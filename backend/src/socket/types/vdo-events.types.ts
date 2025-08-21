/**
 * VDO.Ninja Event Types for Backend Socket.IO Integration
 */

export interface VdoStreamEvent {
  streamId: string;
  action: 'streamStarted' | 'streamEnded' | 'streamPaused' | 'streamResumed' | 'streamError';
  data?: any;
  timestamp: string;
}

export interface VdoStatsEvent {
  streamId: string;
  stats: VdoStreamStats;
  timestamp: string;
}

export interface VdoStreamStats {
  // Video stats
  fps?: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  resolution?: {
    width: number;
    height: number;
  };

  // Network stats
  bitrate?: number;
  latency?: number;
  packetLoss?: number;
  jitter?: number;

  // Audio stats
  audioLevel?: number;
  audioDropouts?: number;

  // Connection stats
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  connectionScore?: number;

  // Data usage
  bytesSent?: number;
  bytesReceived?: number;
  uploadSpeed?: number;
  downloadSpeed?: number;

  // Media states
  isAudioMuted?: boolean;
  isVideoHidden?: boolean;
  isScreenSharing?: boolean;
  isRecording?: boolean;
  isPaused?: boolean;

  // Quality settings
  qualitySettings?: {
    preset?: 'low' | 'medium' | 'high' | 'ultra';
    bitrate?: number;
    resolution?: string;
    framerate?: number;
  };

  // Recording info
  recordingStartTime?: string;
  recordingEndTime?: string;
  isRecordingPaused?: boolean;
}

export interface VdoViewerEvent {
  streamId: string;
  action: 'joined' | 'left' | 'reconnected' | 'disconnected';
  viewer: {
    id: string;
    username?: string;
    connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    joinTime?: string;
  };
  timestamp: string;
}

export interface VdoMediaEvent {
  streamId: string;
  action:
    | 'audioMuted'
    | 'audioUnmuted'
    | 'videoHidden'
    | 'videoShown'
    | 'screenShareStarted'
    | 'screenShareEnded';
  timestamp: string;
}

export interface VdoQualityEvent {
  streamId: string;
  action: 'qualityChanged' | 'bitrateChanged' | 'resolutionChanged' | 'framerateChanged';
  quality: {
    preset?: 'low' | 'medium' | 'high' | 'ultra';
    bitrate?: number;
    resolution?: string;
    framerate?: number;
  };
  timestamp: string;
}

export interface VdoRecordingEvent {
  streamId: string;
  action: 'recordingStarted' | 'recordingStopped' | 'recordingPaused' | 'recordingResumed';
  recording?: {
    id?: string;
    duration?: number;
    size?: number;
    format?: string;
  };
  timestamp: string;
}

export interface VdoAnalytics {
  streamId: string;
  period: 'minute' | '5minutes' | '15minutes' | 'hour';
  analytics: {
    averageFps: number;
    averageBitrate: number;
    averageLatency: number;
    averagePacketLoss: number;
    peakViewers: number;
    totalViewers: number;
    averageViewDuration: number;
    connectionQualityDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
      critical: number;
    };
  };
  timestamp: string;
}

// Socket event names for VDO.Ninja
export const VDO_SOCKET_EVENTS = {
  // Incoming events from frontend
  STREAM_EVENT: 'vdo:stream:event',
  STATS_UPDATE: 'vdo:stats:update',
  VIEWER_EVENT: 'vdo:viewer:event',
  MEDIA_EVENT: 'vdo:media:event',
  QUALITY_EVENT: 'vdo:quality:event',
  RECORDING_EVENT: 'vdo:recording:event',
  GET_ANALYTICS: 'vdo:get:analytics',

  // Outgoing events to frontend
  EVENT_ACK: 'vdo:event:ack',
  STATS_ACK: 'vdo:stats:ack',
  ANALYTICS_DATA: 'vdo:analytics',
  QUALITY_WARNING: 'vdo:quality:warning',
  QUALITY_ISSUES: 'vdo:quality:issues',

  // Broadcast events
  STREAM_LIVE: 'vdo:stream:live',
  STREAM_ENDED: 'vdo:stream:ended',
  STREAM_PAUSED: 'vdo:stream:paused',
  STREAM_RESUMED: 'vdo:stream:resumed',
  STREAM_ERROR: 'vdo:stream:error',

  VIEWER_JOINED: 'vdo:viewer:joined',
  VIEWER_LEFT: 'vdo:viewer:left',

  MEDIA_CHANGED: 'vdo:media:changed',
  QUALITY_CHANGED: 'vdo:quality:changed',

  ANALYTICS_AGGREGATE: 'vdo:analytics:aggregate',
} as const;
