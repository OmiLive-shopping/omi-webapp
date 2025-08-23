import { test, expect, Page } from '@playwright/test';
import { VdoNinjaMock } from './fixtures/vdo-ninja-mocks';

test.describe('VDO.Ninja Media Controls', () => {
  let page: Page;
  let vdoMock: VdoNinjaMock;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the VDO.Ninja test page
    await page.goto('/vdo-ninja-test');
    
    // Initialize mock
    vdoMock = new VdoNinjaMock(page);
    await vdoMock.initialize();
    await vdoMock.enableCommandHistory();
    
    // Start stream for all media control tests
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    await page.waitForLoadState('networkidle');
  });

  test.describe('Audio Controls', () => {
    test('should mute and unmute audio', async () => {
      // Mute audio
      await page.click('[data-testid="mute-audio-btn"]');
      const muteCommand = await vdoMock.waitForCommand('mute-audio');
      expect(muteCommand).toBeTruthy();
      
      // Verify UI shows muted state
      await expect(page.locator('[data-testid="audio-muted-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="mute-audio-btn"]')).toHaveAttribute('aria-pressed', 'true');
      
      // Unmute audio
      await page.click('[data-testid="mute-audio-btn"]');
      const unmuteCommand = await vdoMock.waitForCommand('unmute-audio');
      expect(unmuteCommand).toBeTruthy();
      
      // Verify UI shows unmuted state
      await expect(page.locator('[data-testid="audio-muted-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="mute-audio-btn"]')).toHaveAttribute('aria-pressed', 'false');
    });

    test('should adjust volume correctly', async () => {
      // Set volume to 0
      await page.fill('[data-testid="volume-slider"]', '0');
      let volumeCommand = await vdoMock.waitForCommand('set-volume');
      expect(volumeCommand?.value).toBe(0);
      
      // Set volume to 50
      await page.fill('[data-testid="volume-slider"]', '50');
      volumeCommand = await vdoMock.waitForCommand('set-volume');
      expect(volumeCommand?.value).toBe(50);
      
      // Set volume to 100
      await page.fill('[data-testid="volume-slider"]', '100');
      volumeCommand = await vdoMock.waitForCommand('set-volume');
      expect(volumeCommand?.value).toBe(100);
      
      // Verify volume display
      await expect(page.locator('[data-testid="volume-display"]')).toContainText('100%');
    });

    test('should handle audio gain adjustment', async () => {
      // Open advanced audio settings
      await page.click('[data-testid="advanced-audio-btn"]');
      
      // Adjust gain
      await page.fill('[data-testid="audio-gain-slider"]', '2');
      const gainCommand = await vdoMock.waitForCommand('set-audio-gain');
      expect(gainCommand?.value).toBe(2);
      
      // Verify gain display
      await expect(page.locator('[data-testid="audio-gain-display"]')).toContainText('2.0x');
    });

    test('should toggle noise suppression', async () => {
      // Open advanced audio settings
      await page.click('[data-testid="advanced-audio-btn"]');
      
      // Enable noise suppression
      await page.click('[data-testid="noise-suppression-toggle"]');
      const enableCommand = await vdoMock.waitForCommand('set-noise-suppression');
      expect(enableCommand?.value).toBe(true);
      
      // Disable noise suppression
      await page.click('[data-testid="noise-suppression-toggle"]');
      const disableCommand = await vdoMock.waitForCommand('set-noise-suppression');
      expect(disableCommand?.value).toBe(false);
    });

    test('should handle echo cancellation', async () => {
      // Open advanced audio settings
      await page.click('[data-testid="advanced-audio-btn"]');
      
      // Toggle echo cancellation
      await page.click('[data-testid="echo-cancellation-toggle"]');
      const command = await vdoMock.waitForCommand('set-echo-cancellation');
      expect(command?.value).toBe(true);
    });
  });

  test.describe('Video Controls', () => {
    test('should hide and show video', async () => {
      // Hide video
      await page.click('[data-testid="hide-video-btn"]');
      const hideCommand = await vdoMock.waitForCommand('hide-video');
      expect(hideCommand).toBeTruthy();
      
      // Verify UI shows hidden state
      await expect(page.locator('[data-testid="video-hidden-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="video-preview"]')).toHaveClass(/opacity-0/);
      
      // Show video
      await page.click('[data-testid="hide-video-btn"]');
      const showCommand = await vdoMock.waitForCommand('show-video');
      expect(showCommand).toBeTruthy();
      
      // Verify UI shows visible state
      await expect(page.locator('[data-testid="video-hidden-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="video-preview"]')).not.toHaveClass(/opacity-0/);
    });

    test('should apply video effects', async () => {
      // Open video effects panel
      await page.click('[data-testid="video-effects-btn"]');
      
      // Apply blur effect
      await page.click('[data-testid="blur-toggle"]');
      await page.fill('[data-testid="blur-strength"]', '10');
      const blurCommand = await vdoMock.waitForCommand('set-blur');
      expect(blurCommand?.value).toBe(10);
      
      // Apply mirror effect
      await page.click('[data-testid="mirror-toggle"]');
      const mirrorCommand = await vdoMock.waitForCommand('set-mirror');
      expect(mirrorCommand?.value).toBe(true);
      
      // Apply rotation
      await page.selectOption('[data-testid="rotation-select"]', '90');
      const rotateCommand = await vdoMock.waitForCommand('set-rotation');
      expect(rotateCommand?.value).toBe(90);
    });

    test('should handle virtual background', async () => {
      // Open video effects panel
      await page.click('[data-testid="video-effects-btn"]');
      
      // Select blur background
      await page.click('[data-testid="bg-blur-option"]');
      const blurBgCommand = await vdoMock.waitForCommand('set-virtual-background');
      expect(blurBgCommand?.value).toBe('blur');
      
      // Select image background
      await page.click('[data-testid="bg-image-option-1"]');
      const imageBgCommand = await vdoMock.waitForCommand('set-virtual-background');
      expect(imageBgCommand?.value).toContain('background-1');
      
      // Remove background
      await page.click('[data-testid="bg-none-option"]');
      const noBgCommand = await vdoMock.waitForCommand('set-virtual-background');
      expect(noBgCommand?.value).toBe('none');
    });

    test('should adjust video quality settings', async () => {
      // Change resolution
      await page.selectOption('[data-testid="resolution-select"]', '720p');
      const resolutionCommand = await vdoMock.waitForCommand('set-resolution');
      expect(resolutionCommand?.value).toEqual({ width: 1280, height: 720 });
      
      // Change framerate
      await page.selectOption('[data-testid="framerate-select"]', '60');
      const framerateCommand = await vdoMock.waitForCommand('set-framerate');
      expect(framerateCommand?.value).toBe(60);
      
      // Change bitrate
      await page.fill('[data-testid="bitrate-input"]', '5000000');
      const bitrateCommand = await vdoMock.waitForCommand('set-bitrate');
      expect(bitrateCommand?.value).toBe(5000000);
    });
  });

  test.describe('Screen Sharing', () => {
    test('should start and stop screen sharing', async () => {
      // Start screen share
      await page.click('[data-testid="screenshare-btn"]');
      const startCommand = await vdoMock.waitForCommand('start-screenshare');
      expect(startCommand).toBeTruthy();
      
      // Verify UI shows sharing state
      await expect(page.locator('[data-testid="screenshare-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="screenshare-btn"]')).toContainText('Stop Sharing');
      
      // Stop screen share
      await page.click('[data-testid="screenshare-btn"]');
      const stopCommand = await vdoMock.waitForCommand('stop-screenshare');
      expect(stopCommand).toBeTruthy();
      
      // Verify UI shows not sharing
      await expect(page.locator('[data-testid="screenshare-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="screenshare-btn"]')).toContainText('Share Screen');
    });

    test('should adjust screen share quality', async () => {
      // Start screen share
      await page.click('[data-testid="screenshare-btn"]');
      await vdoMock.waitForCommand('start-screenshare');
      
      // Open screen share settings
      await page.click('[data-testid="screenshare-settings-btn"]');
      
      // Set quality to high
      await page.selectOption('[data-testid="screenshare-quality"]', 'high');
      const qualityCommand = await vdoMock.waitForCommand('set-screenshare-quality');
      expect(qualityCommand?.value).toBe('high');
      
      // Set custom framerate for screen share
      await page.fill('[data-testid="screenshare-fps"]', '30');
      const fpsCommand = await vdoMock.waitForCommand('set-screenshare-framerate');
      expect(fpsCommand?.value).toBe(30);
    });

    test('should handle screen share with audio', async () => {
      // Enable system audio sharing
      await page.click('[data-testid="share-system-audio-toggle"]');
      
      // Start screen share
      await page.click('[data-testid="screenshare-btn"]');
      const command = await vdoMock.waitForCommand('start-screenshare');
      expect(command?.withAudio).toBe(true);
    });
  });

  test.describe('Recording Controls', () => {
    test('should start and stop recording', async () => {
      // Start recording
      await page.click('[data-testid="record-btn"]');
      const startCommand = await vdoMock.waitForCommand('start-recording');
      expect(startCommand).toBeTruthy();
      
      // Verify UI shows recording state
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="recording-timer"]')).toBeVisible();
      await expect(page.locator('[data-testid="record-btn"]')).toContainText('Stop Recording');
      
      // Wait a bit for timer to update
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="recording-timer"]')).toContainText(/00:0[1-2]/);
      
      // Stop recording
      await page.click('[data-testid="record-btn"]');
      const stopCommand = await vdoMock.waitForCommand('stop-recording');
      expect(stopCommand).toBeTruthy();
      
      // Verify UI shows not recording
      await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="record-btn"]')).toContainText('Start Recording');
    });

    test('should pause and resume recording', async () => {
      // Start recording
      await page.click('[data-testid="record-btn"]');
      await vdoMock.waitForCommand('start-recording');
      
      // Pause recording
      await page.click('[data-testid="pause-recording-btn"]');
      const pauseCommand = await vdoMock.waitForCommand('pause-recording');
      expect(pauseCommand).toBeTruthy();
      
      // Verify paused state
      await expect(page.locator('[data-testid="recording-paused-indicator"]')).toBeVisible();
      
      // Resume recording
      await page.click('[data-testid="pause-recording-btn"]');
      const resumeCommand = await vdoMock.waitForCommand('resume-recording');
      expect(resumeCommand).toBeTruthy();
      
      // Verify resumed state
      await expect(page.locator('[data-testid="recording-paused-indicator"]')).not.toBeVisible();
    });

    test('should download recording', async () => {
      // Start and stop recording
      await page.click('[data-testid="record-btn"]');
      await vdoMock.waitForCommand('start-recording');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="record-btn"]');
      await vdoMock.waitForCommand('stop-recording');
      
      // Download recording
      await page.click('[data-testid="download-recording-btn"]');
      const downloadCommand = await vdoMock.waitForCommand('download-recording');
      expect(downloadCommand).toBeTruthy();
    });

    test('should configure recording settings', async () => {
      // Open recording settings
      await page.click('[data-testid="recording-settings-btn"]');
      
      // Set recording format
      await page.selectOption('[data-testid="recording-format"]', 'mp4');
      const formatCommand = await vdoMock.waitForCommand('set-recording-format');
      expect(formatCommand?.value).toBe('mp4');
      
      // Set recording quality
      await page.selectOption('[data-testid="recording-quality"]', 'high');
      const qualityCommand = await vdoMock.waitForCommand('set-recording-quality');
      expect(qualityCommand?.value).toBe('high');
      
      // Enable audio recording
      await page.click('[data-testid="record-audio-toggle"]');
      const audioCommand = await vdoMock.waitForCommand('set-record-audio');
      expect(audioCommand?.value).toBe(true);
    });
  });

  test.describe('Camera and Microphone Selection', () => {
    test('should switch between cameras', async () => {
      // Mock available devices
      await page.evaluate(() => {
        const devices = [
          { deviceId: 'camera1', label: 'Front Camera', kind: 'videoinput' },
          { deviceId: 'camera2', label: 'Back Camera', kind: 'videoinput' }
        ];
        (window as any).__mockDevices = devices;
      });
      
      // Select different camera
      await page.selectOption('[data-testid="camera-select"]', 'camera2');
      const command = await vdoMock.waitForCommand('set-camera');
      expect(command?.value).toBe('camera2');
      
      // Verify UI updates
      await expect(page.locator('[data-testid="active-camera"]')).toContainText('Back Camera');
    });

    test('should switch between microphones', async () => {
      // Mock available devices
      await page.evaluate(() => {
        const devices = [
          { deviceId: 'mic1', label: 'Built-in Microphone', kind: 'audioinput' },
          { deviceId: 'mic2', label: 'External Microphone', kind: 'audioinput' }
        ];
        (window as any).__mockDevices = devices;
      });
      
      // Select different microphone
      await page.selectOption('[data-testid="microphone-select"]', 'mic2');
      const command = await vdoMock.waitForCommand('set-microphone');
      expect(command?.value).toBe('mic2');
      
      // Verify UI updates
      await expect(page.locator('[data-testid="active-microphone"]')).toContainText('External Microphone');
    });
  });

  test('should handle multiple simultaneous media changes', async () => {
    // Apply multiple changes rapidly
    await Promise.all([
      page.click('[data-testid="mute-audio-btn"]'),
      page.click('[data-testid="hide-video-btn"]'),
      page.fill('[data-testid="volume-slider"]', '75')
    ]);
    
    // Wait for all commands to be sent
    await page.waitForTimeout(500);
    
    // Verify all commands were sent
    const commands = await vdoMock.getCommandHistory();
    expect(commands.some(cmd => cmd.action === 'mute-audio')).toBeTruthy();
    expect(commands.some(cmd => cmd.action === 'hide-video')).toBeTruthy();
    expect(commands.some(cmd => cmd.action === 'set-volume' && cmd.value === 75)).toBeTruthy();
    
    // Verify UI state
    await expect(page.locator('[data-testid="audio-muted-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-hidden-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume-display"]')).toContainText('75%');
  });
});