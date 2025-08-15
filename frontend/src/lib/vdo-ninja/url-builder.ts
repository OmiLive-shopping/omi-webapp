/**
 * VDO.Ninja URL Builder
 * Constructs properly formatted VDO.Ninja URLs with parameters
 */

export interface VdoNinjaUrlParams {
  // Basic parameters
  room?: string;
  push?: string;
  view?: string;
  password?: string;
  
  // Stream settings
  bitrate?: number; // in kbps
  quality?: number; // 0-100
  framerate?: number;
  width?: number;
  height?: number;
  
  // Audio settings
  stereo?: boolean;
  noaudio?: boolean;
  echocancellation?: boolean;
  noisesuppression?: boolean;
  autogain?: boolean;
  
  // Video settings
  novideo?: boolean;
  screenshare?: boolean;
  webcam?: boolean;
  
  // Control settings
  autostart?: boolean;
  controls?: boolean;
  director?: boolean;
  
  // Advanced settings
  codec?: 'vp8' | 'vp9' | 'h264' | 'av1';
  secure?: boolean;
  relay?: boolean;
  turn?: boolean;
  stun?: boolean;
  
  // UI settings
  fullscreen?: boolean;
  chroma?: boolean;
  mirror?: boolean;
  flip?: boolean;
  rotate?: number;
  
  // Custom parameters
  [key: string]: any;
}

/**
 * Build a VDO.Ninja URL with the specified parameters
 */
export function createVdoNinjaUrl(params: VdoNinjaUrlParams, baseUrl: string = 'https://vdo.ninja'): string {
  const url = new URL(baseUrl);
  
  // Process each parameter
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle boolean parameters
      if (typeof value === 'boolean') {
        if (value) {
          url.searchParams.append(key, '');
        }
      } else {
        // Handle other types
        url.searchParams.append(key, String(value));
      }
    }
  });
  
  return url.toString();
}

/**
 * Create a streamer/publisher URL
 */
export function createStreamerUrl(
  roomId: string,
  options: Omit<VdoNinjaUrlParams, 'room' | 'push'> = {}
): string {
  return createVdoNinjaUrl({
    room: roomId,
    push: roomId,
    bitrate: 2500,
    quality: 80,
    stereo: true,
    autostart: true,
    ...options
  });
}

/**
 * Create a viewer URL
 */
export function createViewerUrl(
  roomId: string,
  streamId?: string,
  options: Omit<VdoNinjaUrlParams, 'room' | 'view'> = {}
): string {
  return createVdoNinjaUrl({
    room: roomId,
    view: streamId || roomId,
    controls: false,
    ...options
  });
}

/**
 * Create a director/control room URL
 */
export function createDirectorUrl(
  roomId: string,
  password?: string,
  options: Omit<VdoNinjaUrlParams, 'room' | 'director' | 'password'> = {}
): string {
  return createVdoNinjaUrl({
    room: roomId,
    director: true,
    password,
    ...options
  });
}

/**
 * Parse a VDO.Ninja URL and extract parameters
 */
export function parseVdoNinjaUrl(urlString: string): VdoNinjaUrlParams {
  try {
    const url = new URL(urlString);
    const params: VdoNinjaUrlParams = {};
    
    url.searchParams.forEach((value, key) => {
      // Handle boolean parameters (present without value)
      if (value === '') {
        params[key] = true;
      } else {
        // Try to parse as number
        const numValue = Number(value);
        if (!isNaN(numValue) && value !== '') {
          params[key] = numValue;
        } else {
          params[key] = value;
        }
      }
    });
    
    return params;
  } catch (error) {
    console.error('Failed to parse VDO.Ninja URL:', error);
    return {};
  }
}

/**
 * Common presets for different use cases
 */
export const VdoNinjaPresets = {
  highQuality: {
    bitrate: 5000,
    quality: 90,
    framerate: 30,
    width: 1920,
    height: 1080,
    stereo: true,
    codec: 'h264' as const
  },
  
  balanced: {
    bitrate: 2500,
    quality: 80,
    framerate: 30,
    width: 1280,
    height: 720,
    stereo: true
  },
  
  lowBandwidth: {
    bitrate: 1000,
    quality: 60,
    framerate: 24,
    width: 854,
    height: 480,
    stereo: false
  },
  
  audioOnly: {
    novideo: true,
    stereo: true,
    echocancellation: true,
    noisesuppression: true,
    autogain: true
  },
  
  screenShare: {
    screenshare: true,
    webcam: false,
    bitrate: 3000,
    quality: 85,
    framerate: 30
  },
  
  webinar: {
    director: true,
    controls: false,
    bitrate: 2000,
    quality: 75,
    stereo: true
  }
};

/**
 * Apply a preset to URL parameters
 */
export function applyPreset(
  preset: keyof typeof VdoNinjaPresets,
  params: VdoNinjaUrlParams = {}
): VdoNinjaUrlParams {
  return {
    ...VdoNinjaPresets[preset],
    ...params
  };
}

/**
 * Validate URL parameters
 */
export function validateUrlParams(params: VdoNinjaUrlParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate bitrate
  if (params.bitrate !== undefined) {
    if (params.bitrate < 10 || params.bitrate > 50000) {
      errors.push('Bitrate must be between 10 and 50000 kbps');
    }
  }
  
  // Validate quality
  if (params.quality !== undefined) {
    if (params.quality < 0 || params.quality > 100) {
      errors.push('Quality must be between 0 and 100');
    }
  }
  
  // Validate framerate
  if (params.framerate !== undefined) {
    if (params.framerate < 1 || params.framerate > 60) {
      errors.push('Framerate must be between 1 and 60');
    }
  }
  
  // Validate dimensions
  if (params.width !== undefined || params.height !== undefined) {
    if (params.width && (params.width < 160 || params.width > 3840)) {
      errors.push('Width must be between 160 and 3840');
    }
    if (params.height && (params.height < 120 || params.height > 2160)) {
      errors.push('Height must be between 120 and 2160');
    }
  }
  
  // Validate rotation
  if (params.rotate !== undefined) {
    if (![0, 90, 180, 270].includes(params.rotate)) {
      errors.push('Rotation must be 0, 90, 180, or 270 degrees');
    }
  }
  
  // Check for conflicting parameters
  if (params.novideo && params.screenshare) {
    errors.push('Cannot have both novideo and screenshare enabled');
  }
  
  if (params.push && params.view && params.push === params.view) {
    errors.push('Push and view IDs should not be the same');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}