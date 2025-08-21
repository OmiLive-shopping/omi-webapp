import { unifiedResponse } from 'uni-response';

export interface VdoRoomConfig {
  roomName: string;
  password?: string;
  bitrate?: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  maxViewers?: number;
}

export interface VdoStreamUrls {
  streamerUrl: string;
  viewerUrl: string;
  roomName: string;
  streamKey: string;
}

export class VdoNinjaService {
  private readonly baseUrl = 'https://vdo.ninja';

  /**
   * Generate VDO.ninja URLs for a stream
   * The room name is generated from the stream key: omi-{streamKey}
   */
  generateStreamUrls(streamKey: string, config?: Partial<VdoRoomConfig>): VdoStreamUrls {
    const roomName = `omi-${streamKey}`;

    // Default configuration
    const defaultConfig: VdoRoomConfig = {
      roomName,
      bitrate: 2500,
      quality: 'high',
      maxViewers: 200,
      ...config,
    };

    // Build streamer URL with parameters
    const streamerParams = new URLSearchParams({
      room: defaultConfig.roomName,
      push: streamKey,
      bitrate: defaultConfig.bitrate.toString(),
      webcam: '1',
      meshcast: '1', // Enable mesh networking for scalability
      director: '1', // Give streamer director controls
    });

    if (defaultConfig.password) {
      streamerParams.append('password', defaultConfig.password);
    }

    // Quality presets
    const qualitySettings = {
      low: { width: '640', height: '360', framerate: '15' },
      medium: { width: '1280', height: '720', framerate: '30' },
      high: { width: '1920', height: '1080', framerate: '30' },
      ultra: { width: '1920', height: '1080', framerate: '60' },
    };

    const quality = qualitySettings[defaultConfig.quality || 'high'];
    Object.entries(quality).forEach(([key, value]) => {
      streamerParams.append(key, value);
    });

    // Build viewer URL
    const viewerParams = new URLSearchParams({
      room: defaultConfig.roomName,
      view: streamKey,
      scene: '1', // Enable scene mode for viewers
      audiobitrate: '128', // Good audio quality
      novideo: '0', // Ensure video is enabled
      noaudio: '0', // Ensure audio is enabled
    });

    if (defaultConfig.password) {
      viewerParams.append('password', defaultConfig.password);
    }

    return {
      streamerUrl: `${this.baseUrl}/?${streamerParams.toString()}`,
      viewerUrl: `${this.baseUrl}/?${viewerParams.toString()}`,
      roomName: defaultConfig.roomName,
      streamKey,
    };
  }

  /**
   * Generate OBS configuration for VDO.ninja
   * This provides the settings streamers need to configure OBS
   */
  generateObsConfig(streamKey: string): any {
    const urls = this.generateStreamUrls(streamKey);

    return {
      browserSource: {
        url: urls.streamerUrl,
        width: 1920,
        height: 1080,
        fps: 30,
        customCss: `
          body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            background-color: transparent;
          }
          #controls { 
            display: none !important; 
          }
        `,
        hardwareAcceleration: true,
      },
      virtualCam: {
        instructions: [
          '1. Add a Browser Source in OBS',
          `2. Set URL to: ${urls.streamerUrl}`,
          '3. Set Width: 1920, Height: 1080',
          '4. Check "Shutdown source when not visible"',
          '5. Check "Refresh browser when scene becomes active"',
          '6. Apply the custom CSS provided',
          '7. Right-click the source and select "Interact" to access controls',
        ],
      },
      directLink: urls.streamerUrl,
    };
  }

  /**
   * Validate stream key format
   */
  isValidStreamKey(streamKey: string): boolean {
    // Stream keys should be 25 characters alphanumeric
    const streamKeyRegex = /^[a-zA-Z0-9]{25}$/;
    return streamKeyRegex.test(streamKey);
  }

  /**
   * Extract stream key from room name
   */
  extractStreamKeyFromRoom(roomName: string): string | null {
    if (!roomName.startsWith('omi-')) {
      return null;
    }
    return roomName.substring(4);
  }

  /**
   * Generate viewer-specific URL with optional parameters
   */
  generateViewerUrl(
    streamKey: string,
    options?: {
      audioOnly?: boolean;
      lowLatency?: boolean;
      maxQuality?: '360p' | '720p' | '1080p';
    },
  ): string {
    const roomName = `omi-${streamKey}`;
    const params = new URLSearchParams({
      room: roomName,
      view: streamKey,
      scene: '1',
    });

    if (options?.audioOnly) {
      params.append('novideo', '1');
    }

    if (options?.lowLatency) {
      params.append('optimize', '0'); // Disable optimizations for lower latency
      params.append('buffer', '0'); // Minimize buffering
    }

    if (options?.maxQuality) {
      const qualityMap = {
        '360p': { maxwidth: '640', maxheight: '360' },
        '720p': { maxwidth: '1280', maxheight: '720' },
        '1080p': { maxwidth: '1920', maxheight: '1080' },
      };
      const quality = qualityMap[options.maxQuality];
      Object.entries(quality).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return `${this.baseUrl}/?${params.toString()}`;
  }

  /**
   * Generate a co-host URL for multi-host streams
   */
  generateCoHostUrl(streamKey: string, coHostId: string): string {
    const roomName = `omi-${streamKey}`;
    const params = new URLSearchParams({
      room: roomName,
      push: `${streamKey}-cohost-${coHostId}`,
      bitrate: '2500',
      webcam: '1',
      director: '0', // Co-hosts don't get director controls
    });

    return `${this.baseUrl}/?${params.toString()}`;
  }
}

export const vdoNinjaService = new VdoNinjaService();
