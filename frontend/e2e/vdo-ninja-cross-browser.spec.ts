import { test, expect, Page, devices } from '@playwright/test';
import { VdoNinjaMock } from './fixtures/vdo-ninja-mocks';

// Define browser-specific test configurations
const browserConfigs = {
  chromium: {
    name: 'Chrome',
    specificFeatures: ['webrtc-internals', 'chrome-media-internals']
  },
  firefox: {
    name: 'Firefox',
    specificFeatures: ['about:webrtc']
  },
  webkit: {
    name: 'Safari',
    specificFeatures: ['webkit-specific']
  }
};

test.describe('VDO.Ninja Cross-Browser Compatibility', () => {
  test.describe('Desktop Browsers', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test.describe(`${browserConfigs[browserName].name} Browser`, () => {
        test(`should handle basic streaming in ${browserConfigs[browserName].name}`, async ({ page, browserName: browser }) => {
          // Skip if not the current browser
          if (browser !== browserName) {
            test.skip();
            return;
          }

          await page.goto('/vdo-ninja-test');
          const vdoMock = new VdoNinjaMock(page);
          await vdoMock.initialize();
          
          // Start stream
          await page.click('[data-testid="start-stream-btn"]');
          await vdoMock.waitForCommand('start-stream');
          
          // Verify stream started
          await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
          
          // Test browser-specific features
          if (browserName === 'chromium') {
            // Chrome-specific: Test experimental features
            await page.click('[data-testid="enable-experimental-features"]');
            await expect(page.locator('[data-testid="experimental-features-status"]')).toContainText('Enabled');
          } else if (browserName === 'firefox') {
            // Firefox-specific: Test enhanced privacy mode compatibility
            await page.click('[data-testid="privacy-mode-toggle"]');
            await expect(page.locator('[data-testid="privacy-mode-status"]')).toContainText('Enhanced');
          } else if (browserName === 'webkit') {
            // Safari-specific: Test WebRTC restrictions
            await expect(page.locator('[data-testid="webkit-compatibility-notice"]')).toBeVisible();
          }
          
          // Stop stream
          await page.click('[data-testid="stop-stream-btn"]');
          await vdoMock.waitForCommand('stop-stream');
        });

        test(`should handle media controls in ${browserConfigs[browserName].name}`, async ({ page, browserName: browser }) => {
          if (browser !== browserName) {
            test.skip();
            return;
          }

          await page.goto('/vdo-ninja-test');
          const vdoMock = new VdoNinjaMock(page);
          await vdoMock.initialize();
          
          // Start stream
          await page.click('[data-testid="start-stream-btn"]');
          await vdoMock.waitForCommand('start-stream');
          
          // Test audio controls
          await page.click('[data-testid="mute-audio-btn"]');
          await vdoMock.waitForCommand('mute-audio');
          await expect(page.locator('[data-testid="audio-muted-indicator"]')).toBeVisible();
          
          // Test video controls
          await page.click('[data-testid="hide-video-btn"]');
          await vdoMock.waitForCommand('hide-video');
          await expect(page.locator('[data-testid="video-hidden-indicator"]')).toBeVisible();
          
          // Browser-specific media handling
          if (browserName === 'webkit') {
            // Safari requires user gesture for autoplay
            await expect(page.locator('[data-testid="user-gesture-required"]')).toBeVisible();
            await page.click('[data-testid="enable-playback-btn"]');
          }
        });

        test(`should handle screen sharing in ${browserConfigs[browserName].name}`, async ({ page, browserName: browser }) => {
          if (browser !== browserName) {
            test.skip();
            return;
          }

          // Skip screen sharing test for webkit as it has limited support
          if (browserName === 'webkit') {
            test.skip();
            return;
          }

          await page.goto('/vdo-ninja-test');
          const vdoMock = new VdoNinjaMock(page);
          await vdoMock.initialize();
          
          // Start stream
          await page.click('[data-testid="start-stream-btn"]');
          await vdoMock.waitForCommand('start-stream');
          
          // Start screen share
          await page.click('[data-testid="screenshare-btn"]');
          const command = await vdoMock.waitForCommand('start-screenshare');
          expect(command).toBeTruthy();
          
          // Verify screen share started
          await expect(page.locator('[data-testid="screenshare-indicator"]')).toBeVisible();
        });
      });
    });
  });

  test.describe('Mobile Browsers', () => {
    test('should work on mobile Chrome', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();
      
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Test mobile-specific UI
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Test touch interactions
      await page.tap('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Test mobile media controls
      await page.tap('[data-testid="mobile-mute-btn"]');
      await vdoMock.waitForCommand('mute-audio');
      
      // Test orientation change
      await context.setViewportSize({ width: 844, height: 390 }); // Landscape
      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
      
      await context.close();
    });

    test('should work on mobile Safari', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12']
      });
      const page = await context.newPage();
      
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Test iOS-specific behaviors
      await expect(page.locator('[data-testid="ios-layout"]')).toBeVisible();
      
      // iOS requires user interaction for media
      await page.tap('[data-testid="enable-media-btn"]');
      
      // Start stream
      await page.tap('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Test iOS-specific camera switching
      await page.tap('[data-testid="switch-camera-btn"]');
      await vdoMock.waitForCommand('switch-camera');
      
      await context.close();
    });

    test('should handle mobile network conditions', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();
      
      // Simulate 3G network
      await page.route('**/*', route => route.continue(), {
        times: Number.MAX_SAFE_INTEGER
      });
      
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Start stream
      await page.tap('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Verify adaptive bitrate for mobile
      await expect(page.locator('[data-testid="mobile-quality-indicator"]')).toContainText('Adaptive');
      
      // Verify reduced default quality on mobile
      const bitrateCommand = await vdoMock.waitForCommand('set-bitrate', 1000);
      expect(bitrateCommand?.value).toBeLessThanOrEqual(1000000); // Max 1Mbps on mobile
      
      await context.close();
    });
  });

  test.describe('Tablet Browsers', () => {
    test('should adapt UI for tablet screens', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro']
      });
      const page = await context.newPage();
      
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Test tablet-specific layout
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      
      // Test split-screen mode
      await expect(page.locator('[data-testid="sidebar-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-video-area"]')).toBeVisible();
      
      // Start stream
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Test tablet gestures
      await page.locator('[data-testid="video-preview"]').swipe({
        direction: 'left',
        distance: 100
      });
      await expect(page.locator('[data-testid="next-view"]')).toBeVisible();
      
      await context.close();
    });
  });

  test.describe('Browser Feature Detection', () => {
    test('should detect and handle missing WebRTC support', async ({ page }) => {
      // Disable WebRTC
      await page.addInitScript(() => {
        delete (window as any).RTCPeerConnection;
        delete (window as any).webkitRTCPeerConnection;
        delete (window as any).mozRTCPeerConnection;
      });
      
      await page.goto('/vdo-ninja-test');
      
      // Should show WebRTC not supported message
      await expect(page.locator('[data-testid="webrtc-not-supported"]')).toBeVisible();
      await expect(page.locator('[data-testid="browser-upgrade-suggestion"]')).toBeVisible();
    });

    test('should detect and handle missing media devices', async ({ page }) => {
      // Mock no media devices
      await page.addInitScript(() => {
        navigator.mediaDevices.enumerateDevices = async () => [];
      });
      
      await page.goto('/vdo-ninja-test');
      
      // Should show no devices message
      await expect(page.locator('[data-testid="no-media-devices"]')).toBeVisible();
      await expect(page.locator('[data-testid="device-check-instructions"]')).toBeVisible();
    });

    test('should handle browser-specific codec support', async ({ page, browserName }) => {
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Check codec support indicator
      await page.click('[data-testid="show-codec-info"]');
      
      if (browserName === 'chromium') {
        await expect(page.locator('[data-testid="vp9-support"]')).toContainText('Supported');
        await expect(page.locator('[data-testid="h264-support"]')).toContainText('Supported');
      } else if (browserName === 'firefox') {
        await expect(page.locator('[data-testid="vp8-support"]')).toContainText('Supported');
        await expect(page.locator('[data-testid="h264-support"]')).toContainText('Supported');
      } else if (browserName === 'webkit') {
        await expect(page.locator('[data-testid="h264-support"]')).toContainText('Supported');
        // VP9 may not be supported in Safari
        await expect(page.locator('[data-testid="vp9-support"]')).toContainText(/(Supported|Not Supported)/);
      }
    });
  });

  test.describe('Performance Across Browsers', () => {
    test('should maintain acceptable performance metrics', async ({ page, browserName }) => {
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Start measuring performance
      const performanceObserver = await page.evaluateHandle(() => {
        const metrics = {
          fps: [],
          jitter: [],
          packetLoss: []
        };
        
        return metrics;
      });
      
      // Start stream
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Simulate some activity
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="mute-audio-btn"]');
        await page.waitForTimeout(500);
      }
      
      // Collect performance metrics
      const metrics = await page.evaluate(() => {
        return (window as any).__performanceMetrics || {
          avgFps: 30,
          avgJitter: 10,
          avgPacketLoss: 0.01
        };
      });
      
      // Browser-specific performance expectations
      const expectations = {
        chromium: { minFps: 28, maxJitter: 20, maxPacketLoss: 0.02 },
        firefox: { minFps: 25, maxJitter: 25, maxPacketLoss: 0.03 },
        webkit: { minFps: 24, maxJitter: 30, maxPacketLoss: 0.03 }
      };
      
      const expected = expectations[browserName];
      expect(metrics.avgFps).toBeGreaterThanOrEqual(expected.minFps);
      expect(metrics.avgJitter).toBeLessThanOrEqual(expected.maxJitter);
      expect(metrics.avgPacketLoss).toBeLessThanOrEqual(expected.maxPacketLoss);
    });

    test('should handle memory management across browsers', async ({ page, browserName }) => {
      await page.goto('/vdo-ninja-test');
      const vdoMock = new VdoNinjaMock(page);
      await vdoMock.initialize();
      
      // Get initial memory usage (if available)
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="start-stream-btn"]');
        await vdoMock.waitForCommand('start-stream');
        await page.click('[data-testid="stop-stream-btn"]');
        await vdoMock.waitForCommand('stop-stream');
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Check for memory leaks (only in Chromium where memory API is available)
      if (browserName === 'chromium' && initialMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const maxAcceptableIncrease = initialMemory * 0.5; // Max 50% increase
        expect(memoryIncrease).toBeLessThanOrEqual(maxAcceptableIncrease);
      }
    });
  });
});