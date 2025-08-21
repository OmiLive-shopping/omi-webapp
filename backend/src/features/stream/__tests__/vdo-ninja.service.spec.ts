import { beforeEach, describe, expect, it } from 'vitest';

import { VdoNinjaService } from '../services/vdo-ninja.service.js';

describe('VdoNinjaService', () => {
  let service: VdoNinjaService;

  beforeEach(() => {
    service = new VdoNinjaService();
  });

  describe('generateStreamUrls', () => {
    it('should generate correct URLs for a stream', () => {
      const streamKey = 'abcde12345ABCDE12345fghij';
      const result = service.generateStreamUrls(streamKey);

      expect(result.roomName).toBe('omi-abcde12345ABCDE12345fghij');
      expect(result.streamKey).toBe(streamKey);
      expect(result.streamerUrl).toContain('https://vdo.ninja/?');
      expect(result.streamerUrl).toContain(`room=omi-${streamKey}`);
      expect(result.streamerUrl).toContain(`push=${streamKey}`);
      expect(result.streamerUrl).toContain('bitrate=2500');
      expect(result.streamerUrl).toContain('webcam=1');
      expect(result.streamerUrl).toContain('meshcast=1');
      expect(result.streamerUrl).toContain('director=1');

      expect(result.viewerUrl).toContain('https://vdo.ninja/?');
      expect(result.viewerUrl).toContain(`room=omi-${streamKey}`);
      expect(result.viewerUrl).toContain(`view=${streamKey}`);
      expect(result.viewerUrl).toContain('scene=1');
    });

    it('should apply custom configuration', () => {
      const streamKey = 'test123';
      const result = service.generateStreamUrls(streamKey, {
        bitrate: 4000,
        quality: 'ultra',
        password: 'secret123',
      });

      expect(result.streamerUrl).toContain('bitrate=4000');
      expect(result.streamerUrl).toContain('framerate=60'); // Ultra quality
      expect(result.streamerUrl).toContain('password=secret123');
      expect(result.viewerUrl).toContain('password=secret123');
    });

    it('should handle different quality presets', () => {
      const streamKey = 'test123';

      const low = service.generateStreamUrls(streamKey, { quality: 'low' });
      expect(low.streamerUrl).toContain('width=640');
      expect(low.streamerUrl).toContain('height=360');
      expect(low.streamerUrl).toContain('framerate=15');

      const high = service.generateStreamUrls(streamKey, { quality: 'high' });
      expect(high.streamerUrl).toContain('width=1920');
      expect(high.streamerUrl).toContain('height=1080');
      expect(high.streamerUrl).toContain('framerate=30');
    });
  });

  describe('generateObsConfig', () => {
    it('should generate OBS configuration', () => {
      const streamKey = 'obs12345';
      const config = service.generateObsConfig(streamKey);

      expect(config.browserSource.url).toContain(`push=${streamKey}`);
      expect(config.browserSource.width).toBe(1920);
      expect(config.browserSource.height).toBe(1080);
      expect(config.browserSource.fps).toBe(30);
      expect(config.browserSource.customCss).toContain('display: none !important');
      expect(config.virtualCam.instructions).toHaveLength(7);
      expect(config.directLink).toBe(config.browserSource.url);
    });
  });

  describe('isValidStreamKey', () => {
    it('should validate stream key format', () => {
      expect(service.isValidStreamKey('abcde12345ABCDE12345fghij')).toBe(true);
      expect(service.isValidStreamKey('1234567890123456789012345')).toBe(true);

      expect(service.isValidStreamKey('short')).toBe(false);
      expect(service.isValidStreamKey('too-many-chars-in-this-key')).toBe(false);
      expect(service.isValidStreamKey('special-chars-!@#$%')).toBe(false);
      expect(service.isValidStreamKey('')).toBe(false);
    });
  });

  describe('extractStreamKeyFromRoom', () => {
    it('should extract stream key from room name', () => {
      expect(service.extractStreamKeyFromRoom('omi-test123')).toBe('test123');
      expect(service.extractStreamKeyFromRoom('omi-abcde12345ABCDE12345fghij')).toBe(
        'abcde12345ABCDE12345fghij',
      );

      expect(service.extractStreamKeyFromRoom('invalid-room')).toBeNull();
      expect(service.extractStreamKeyFromRoom('test123')).toBeNull();
      expect(service.extractStreamKeyFromRoom('')).toBeNull();
    });
  });

  describe('generateViewerUrl', () => {
    it('should generate basic viewer URL', () => {
      const streamKey = 'viewer123';
      const url = service.generateViewerUrl(streamKey);

      expect(url).toContain('https://vdo.ninja/?');
      expect(url).toContain(`room=omi-${streamKey}`);
      expect(url).toContain(`view=${streamKey}`);
      expect(url).toContain('scene=1');
    });

    it('should generate audio-only URL', () => {
      const streamKey = 'audio123';
      const url = service.generateViewerUrl(streamKey, { audioOnly: true });

      expect(url).toContain('novideo=1');
    });

    it('should generate low-latency URL', () => {
      const streamKey = 'lowlat123';
      const url = service.generateViewerUrl(streamKey, { lowLatency: true });

      expect(url).toContain('optimize=0');
      expect(url).toContain('buffer=0');
    });

    it('should apply quality limits', () => {
      const streamKey = 'quality123';

      const url720p = service.generateViewerUrl(streamKey, { maxQuality: '720p' });
      expect(url720p).toContain('maxwidth=1280');
      expect(url720p).toContain('maxheight=720');

      const url360p = service.generateViewerUrl(streamKey, { maxQuality: '360p' });
      expect(url360p).toContain('maxwidth=640');
      expect(url360p).toContain('maxheight=360');
    });
  });

  describe('generateCoHostUrl', () => {
    it('should generate co-host URL', () => {
      const streamKey = 'main123';
      const coHostId = 'cohost456';
      const url = service.generateCoHostUrl(streamKey, coHostId);

      expect(url).toContain(`room=omi-${streamKey}`);
      expect(url).toContain(`push=${streamKey}-cohost-${coHostId}`);
      expect(url).toContain('director=0'); // Co-hosts don't get director controls
      expect(url).toContain('webcam=1');
      expect(url).toContain('bitrate=2500');
    });
  });
});
