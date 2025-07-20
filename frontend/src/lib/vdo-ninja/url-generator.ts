import { VdoStreamerParams, VdoViewerParams, VdoNinjaConfig } from './types';

const DEFAULT_BASE_URL = 'https://vdo.ninja';

export class VdoUrlGenerator {
  private baseUrl: string;
  private room?: string;
  private apiKey?: string;
  private defaultParams: Partial<VdoStreamerParams & VdoViewerParams>;

  constructor(config: VdoNinjaConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.room = config.room;
    this.apiKey = config.apiKey;
    this.defaultParams = config.defaultParams || {};
  }

  /**
   * Generate a URL for a streamer/publisher
   */
  generateStreamerUrl(params: VdoStreamerParams): string {
    const mergedParams = { ...this.defaultParams, ...params };
    const urlParams = new URLSearchParams();

    // Required parameters
    if (this.room) {
      urlParams.set('room', this.room);
    }
    
    if (mergedParams.streamId) {
      urlParams.set('push', mergedParams.streamId);
    }

    if (mergedParams.pushId) {
      urlParams.set('push', mergedParams.pushId);
    }

    // Authentication
    if (this.apiKey) {
      urlParams.set('api', this.apiKey);
    }

    if (mergedParams.password) {
      urlParams.set('password', mergedParams.password);
    }

    // Video settings
    if (mergedParams.bitrate) {
      urlParams.set('bitrate', mergedParams.bitrate.toString());
    }

    if (mergedParams.quality !== undefined) {
      urlParams.set('quality', mergedParams.quality.toString());
    }

    if (mergedParams.framerate) {
      urlParams.set('framerate', mergedParams.framerate.toString());
    }

    if (mergedParams.codec) {
      urlParams.set('codec', mergedParams.codec);
    }

    if (mergedParams.audioCodec) {
      urlParams.set('audiocodec', mergedParams.audioCodec);
    }

    // Device selection
    if (mergedParams.videoDevice) {
      urlParams.set('videodevice', mergedParams.videoDevice);
    }

    if (mergedParams.audioDevice) {
      urlParams.set('audiodevice', mergedParams.audioDevice);
    }

    // Feature flags
    if (mergedParams.autoStart) {
      urlParams.set('autostart', '1');
    }

    if (mergedParams.noAudio) {
      urlParams.set('noaudio', '1');
    }

    if (mergedParams.noVideo) {
      urlParams.set('novideo', '1');
    }

    if (mergedParams.screenShare) {
      urlParams.set('screenshare', '1');
    }

    // Audio processing
    if (mergedParams.noiseSuppression !== undefined) {
      urlParams.set('denoise', mergedParams.noiseSuppression ? '1' : '0');
    }

    if (mergedParams.echoCancellation !== undefined) {
      urlParams.set('ec', mergedParams.echoCancellation ? '1' : '0');
    }

    if (mergedParams.autoGainControl !== undefined) {
      urlParams.set('ag', mergedParams.autoGainControl ? '1' : '0');
    }

    if (mergedParams.stereo) {
      urlParams.set('stereo', '1');
    }

    // Video processing
    if (mergedParams.mirror) {
      urlParams.set('mirror', '1');
    }

    if (mergedParams.rotate) {
      urlParams.set('rotate', mergedParams.rotate.toString());
    }

    // Metadata
    if (mergedParams.label) {
      urlParams.set('label', mergedParams.label);
    }

    if (mergedParams.director) {
      urlParams.set('director', '1');
    }

    return `${this.baseUrl}/?${urlParams.toString()}`;
  }

  /**
   * Generate a URL for a viewer
   */
  generateViewerUrl(params: VdoViewerParams): string {
    const mergedParams = { ...this.defaultParams, ...params };
    const urlParams = new URLSearchParams();

    // Required parameters
    if (this.room) {
      urlParams.set('room', this.room);
    }

    if (mergedParams.view || mergedParams.streamId) {
      urlParams.set('view', mergedParams.view || mergedParams.streamId);
    }

    // Authentication
    if (this.apiKey) {
      urlParams.set('api', this.apiKey);
    }

    if (mergedParams.password) {
      urlParams.set('password', mergedParams.password);
    }

    // Video settings
    if (mergedParams.bitrate) {
      urlParams.set('bitrate', mergedParams.bitrate.toString());
    }

    if (mergedParams.quality !== undefined) {
      urlParams.set('quality', mergedParams.quality.toString());
    }

    if (mergedParams.framerate) {
      urlParams.set('framerate', mergedParams.framerate.toString());
    }

    if (mergedParams.codec) {
      urlParams.set('codec', mergedParams.codec);
    }

    if (mergedParams.audioCodec) {
      urlParams.set('audiocodec', mergedParams.audioCodec);
    }

    // Feature flags
    if (mergedParams.noAudio) {
      urlParams.set('noaudio', '1');
    }

    if (mergedParams.noVideo) {
      urlParams.set('novideo', '1');
    }

    if (mergedParams.autoplay) {
      urlParams.set('autoplay', '1');
    }

    if (mergedParams.muted) {
      urlParams.set('muted', '1');
    }

    if (mergedParams.controls) {
      urlParams.set('controls', '1');
    }

    if (mergedParams.fullscreen) {
      urlParams.set('fullscreen', '1');
    }

    if (mergedParams.pip) {
      urlParams.set('pip', '1');
    }

    // Metadata
    if (mergedParams.label) {
      urlParams.set('label', mergedParams.label);
    }

    // View modes
    if (mergedParams.scene) {
      urlParams.set('scene', '1');
    }

    if (mergedParams.solo) {
      urlParams.set('solo', '1');
    }

    return `${this.baseUrl}/?${urlParams.toString()}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VdoNinjaConfig>): void {
    if (config.baseUrl !== undefined) {
      this.baseUrl = config.baseUrl;
    }
    if (config.room !== undefined) {
      this.room = config.room;
    }
    if (config.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    }
    if (config.defaultParams !== undefined) {
      this.defaultParams = config.defaultParams;
    }
  }
}

// Default instance
export const vdoUrlGenerator = new VdoUrlGenerator();

// Convenience functions
export const generateStreamerUrl = (params: VdoStreamerParams, config?: VdoNinjaConfig): string => {
  const generator = config ? new VdoUrlGenerator(config) : vdoUrlGenerator;
  return generator.generateStreamerUrl(params);
};

export const generateViewerUrl = (params: VdoViewerParams, config?: VdoNinjaConfig): string => {
  const generator = config ? new VdoUrlGenerator(config) : vdoUrlGenerator;
  return generator.generateViewerUrl(params);
};