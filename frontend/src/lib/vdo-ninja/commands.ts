import { VdoCommand } from './types';

/**
 * Send a command to a VDO.ninja iframe
 */
export function sendCommand(
  iframe: HTMLIFrameElement | null,
  command: VdoCommand
): void {
  if (!iframe || !iframe.contentWindow) {
    console.error('VDO.ninja: Invalid iframe reference');
    return;
  }

  try {
    iframe.contentWindow.postMessage(command, '*');
  } catch (error) {
    console.error('VDO.ninja: Failed to send command', error);
  }
}

/**
 * Common VDO.ninja commands
 */
export const VdoCommands = {
  // Stream control
  startStream: (): VdoCommand => ({
    action: 'start',
  }),

  stopStream: (): VdoCommand => ({
    action: 'stop',
  }),

  toggleStream: (): VdoCommand => ({
    action: 'toggle',
  }),

  // Audio control
  muteAudio: (): VdoCommand => ({
    action: 'mute',
  }),

  unmuteAudio: (): VdoCommand => ({
    action: 'unmute',
  }),

  toggleAudio: (): VdoCommand => ({
    action: 'toggleMute',
  }),

  setVolume: (volume: number): VdoCommand => ({
    action: 'volume',
    value: Math.max(0, Math.min(100, volume)),
  }),

  // Video control
  hideVideo: (): VdoCommand => ({
    action: 'hideVideo',
  }),

  showVideo: (): VdoCommand => ({
    action: 'showVideo',
  }),

  toggleVideo: (): VdoCommand => ({
    action: 'toggleVideo',
  }),

  // Quality settings
  setBitrate: (bitrate: number): VdoCommand => ({
    action: 'bitrate',
    value: bitrate,
  }),

  setQuality: (quality: number): VdoCommand => ({
    action: 'quality',
    value: quality,
  }),

  setFramerate: (framerate: number): VdoCommand => ({
    action: 'framerate',
    value: framerate,
  }),

  // Screen sharing
  startScreenShare: (): VdoCommand => ({
    action: 'screenshare',
    value: true,
  }),

  stopScreenShare: (): VdoCommand => ({
    action: 'screenshare',
    value: false,
  }),

  // Recording
  startRecording: (): VdoCommand => ({
    action: 'record',
    value: true,
  }),

  stopRecording: (): VdoCommand => ({
    action: 'record',
    value: false,
  }),

  // Camera control
  switchCamera: (): VdoCommand => ({
    action: 'switchCamera',
  }),

  setCamera: (deviceId: string): VdoCommand => ({
    action: 'setCamera',
    value: deviceId,
  }),

  // Microphone control
  switchMicrophone: (): VdoCommand => ({
    action: 'switchMicrophone',
  }),

  setMicrophone: (deviceId: string): VdoCommand => ({
    action: 'setMicrophone',
    value: deviceId,
  }),

  // Effects
  setMirror: (mirror: boolean): VdoCommand => ({
    action: 'mirror',
    value: mirror,
  }),

  setRotation: (degrees: number): VdoCommand => ({
    action: 'rotate',
    value: degrees,
  }),

  // Chat
  sendChatMessage: (message: string): VdoCommand => ({
    action: 'sendChat',
    value: message,
  }),

  // Stats
  requestStats: (): VdoCommand => ({
    action: 'getStats',
  }),

  // Connection
  reload: (): VdoCommand => ({
    action: 'reload',
  }),

  hangup: (): VdoCommand => ({
    action: 'hangup',
  }),

  // Director controls
  addStreamToScene: (streamId: string): VdoCommand => ({
    action: 'addToScene',
    target: streamId,
  }),

  removeStreamFromScene: (streamId: string): VdoCommand => ({
    action: 'removeFromScene',
    target: streamId,
  }),

  soloStream: (streamId: string): VdoCommand => ({
    action: 'solo',
    target: streamId,
  }),

  highlightStream: (streamId: string): VdoCommand => ({
    action: 'highlight',
    target: streamId,
  }),

  muteStreamAudio: (streamId: string): VdoCommand => ({
    action: 'muteStream',
    target: streamId,
  }),

  hideStreamVideo: (streamId: string): VdoCommand => ({
    action: 'hideStreamVideo',
    target: streamId,
  }),
};