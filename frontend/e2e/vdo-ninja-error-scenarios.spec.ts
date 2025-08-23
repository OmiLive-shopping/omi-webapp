import { test, expect, Page } from '@playwright/test';
import { VdoNinjaMock, simulateNetworkCondition } from './fixtures/vdo-ninja-mocks';

test.describe('VDO.Ninja Error Scenarios', () => {
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
    
    await page.waitForLoadState('networkidle');
  });

  test.describe('Connection Errors', () => {
    test('should handle initial connection failure', async () => {
      // Simulate connection error before starting stream
      await vdoMock.simulateError('CONNECTION_FAILED', 'Failed to establish connection');
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Verify error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to establish connection');
      await expect(page.locator('[data-testid="error-code"]')).toContainText('CONNECTION_FAILED');
      
      // Verify stream didn't start
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Offline');
      
      // Verify retry button is available
      await expect(page.locator('[data-testid="retry-connection-btn"]')).toBeVisible();
    });

    test('should handle connection timeout', async () => {
      // Override handler to simulate timeout
      vdoMock.addHandler('start-stream', () => null); // No response
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Wait for timeout (should show loading state)
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Wait for timeout error (assuming 10 second timeout)
      await page.waitForTimeout(11000);
      
      // Verify timeout error is shown
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Request timed out');
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Offline');
    });

    test('should handle mid-stream disconnection', async () => {
      // Start stream successfully
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
      
      // Simulate sudden disconnection
      await vdoMock.simulateConnectionChange('disconnected');
      await vdoMock.simulateError('CONNECTION_LOST', 'Connection lost unexpectedly');
      
      // Verify error notification
      await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-notification"]')).toContainText('Connection lost');
      
      // Verify auto-reconnect attempts
      await expect(page.locator('[data-testid="reconnect-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="reconnect-attempt"]')).toContainText(/Attempt \d+ of \d+/);
    });

    test('should handle network quality degradation', async () => {
      // Start stream
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Simulate poor network conditions
      await simulateNetworkCondition(page, 'poor');
      await vdoMock.simulateError('POOR_CONNECTION', 'Network quality is poor');
      
      // Verify warning is displayed
      await expect(page.locator('[data-testid="network-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-warning"]')).toContainText('Poor connection quality');
      
      // Verify quality auto-adjustment suggestion
      await expect(page.locator('[data-testid="quality-suggestion"]')).toContainText('Consider lowering quality');
    });

    test('should handle complete network loss', async () => {
      // Start stream
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Simulate going offline
      await simulateNetworkCondition(page, 'offline');
      await vdoMock.simulateConnectionChange('disconnected');
      
      // Verify offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('You are offline');
      
      // Verify commands are queued
      await page.click('[data-testid="mute-audio-btn"]');
      await expect(page.locator('[data-testid="command-queue-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="queued-commands"]')).toContainText('1 command queued');
    });
  });

  test.describe('Permission Errors', () => {
    test('should handle camera permission denied', async () => {
      // Simulate permission denied error
      await vdoMock.simulateError('CAMERA_PERMISSION_DENIED', 'Camera access denied');
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Verify permission error is shown
      await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-error"]')).toContainText('Camera access denied');
      
      // Verify permission instructions are shown
      await expect(page.locator('[data-testid="permission-instructions"]')).toBeVisible();
      await expect(page.locator('[data-testid="grant-permission-btn"]')).toBeVisible();
    });

    test('should handle microphone permission denied', async () => {
      // Simulate permission denied error
      await vdoMock.simulateError('MIC_PERMISSION_DENIED', 'Microphone access denied');
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Verify permission error is shown
      await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-error"]')).toContainText('Microphone access denied');
      
      // Verify audio-only option is offered
      await expect(page.locator('[data-testid="continue-without-audio-btn"]')).toBeVisible();
    });

    test('should handle screen share permission denied', async () => {
      // Start stream first
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Override screen share handler to simulate error
      vdoMock.addHandler('start-screenshare', () => null);
      await vdoMock.simulateError('SCREENSHARE_PERMISSION_DENIED', 'Screen sharing denied');
      
      // Try to share screen
      await page.click('[data-testid="screenshare-btn"]');
      
      // Verify error is shown
      await expect(page.locator('[data-testid="screenshare-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="screenshare-error"]')).toContainText('Screen sharing denied');
      
      // Verify stream continues without screen share
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
    });
  });

  test.describe('Device Errors', () => {
    test('should handle no camera available', async () => {
      // Simulate no camera error
      await vdoMock.simulateError('NO_CAMERA_FOUND', 'No camera device found');
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Verify error and audio-only option
      await expect(page.locator('[data-testid="device-error"]')).toContainText('No camera found');
      await expect(page.locator('[data-testid="audio-only-btn"]')).toBeVisible();
      
      // Try audio-only mode
      await page.click('[data-testid="audio-only-btn"]');
      const command = await vdoMock.waitForCommand('start-stream');
      expect(command?.audioOnly).toBe(true);
    });

    test('should handle camera in use by another app', async () => {
      // Simulate camera busy error
      await vdoMock.simulateError('CAMERA_BUSY', 'Camera is being used by another application');
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="device-error"]')).toContainText('Camera is being used');
      
      // Verify troubleshooting tips
      await expect(page.locator('[data-testid="troubleshooting-tips"]')).toBeVisible();
      await expect(page.locator('[data-testid="troubleshooting-tips"]')).toContainText('Close other applications');
    });

    test('should handle device disconnection during stream', async () => {
      // Start stream
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Simulate camera disconnection
      await vdoMock.simulateError('CAMERA_DISCONNECTED', 'Camera was disconnected');
      
      // Verify error notification
      await expect(page.locator('[data-testid="device-disconnected-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="device-disconnected-alert"]')).toContainText('Camera disconnected');
      
      // Verify stream continues with audio only
      await expect(page.locator('[data-testid="video-disabled-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live (Audio Only)');
    });
  });

  test.describe('Capacity Errors', () => {
    test('should handle room full error', async () => {
      // Override start stream to simulate room full
      vdoMock.addHandler('start-stream', () => null);
      await vdoMock.simulateError('ROOM_FULL', 'Maximum number of participants reached');
      
      // Try to start stream
      await page.click('[data-testid="start-stream-btn"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="capacity-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="capacity-error"]')).toContainText('Room is full');
      
      // Verify waiting list option
      await expect(page.locator('[data-testid="join-waitlist-btn"]')).toBeVisible();
    });

    test('should handle bandwidth limit exceeded', async () => {
      // Start stream
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Simulate bandwidth limit error
      await vdoMock.simulateError('BANDWIDTH_EXCEEDED', 'Bandwidth limit exceeded');
      
      // Verify error and quality reduction suggestion
      await expect(page.locator('[data-testid="bandwidth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="reduce-quality-btn"]')).toBeVisible();
      
      // Click reduce quality
      await page.click('[data-testid="reduce-quality-btn"]');
      const command = await vdoMock.waitForCommand('set-bitrate');
      expect(command?.value).toBeLessThan(1000000); // Should reduce to lower bitrate
    });
  });

  test.describe('Recovery and Retry Logic', () => {
    test('should successfully retry after connection failure', async () => {
      // First attempt fails
      vdoMock.addHandler('start-stream', () => null);
      await vdoMock.simulateError('CONNECTION_FAILED', 'Initial connection failed');
      
      await page.click('[data-testid="start-stream-btn"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Reset handler for successful retry
      vdoMock.addHandler('start-stream', () => ({
        response: 'stream-started',
        streamId: 'retry-stream-123'
      }));
      
      // Click retry
      await page.click('[data-testid="retry-connection-btn"]');
      
      // Verify successful connection
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    test('should handle exponential backoff on multiple failures', async () => {
      // Configure to always fail
      vdoMock.addHandler('start-stream', () => null);
      
      // Start stream (will fail)
      await page.click('[data-testid="start-stream-btn"]');
      
      // Trigger auto-retry
      for (let attempt = 1; attempt <= 3; attempt++) {
        await vdoMock.simulateError('CONNECTION_FAILED', `Attempt ${attempt} failed`);
        
        // Verify retry attempt indicator
        await expect(page.locator('[data-testid="retry-attempt"]')).toContainText(`Retry ${attempt}/3`);
        
        // Verify increasing delay between retries
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await page.waitForTimeout(delay + 500); // Wait for retry
        }
      }
      
      // After max retries, should show give up option
      await expect(page.locator('[data-testid="max-retries-reached"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-retry-btn"]')).toBeVisible();
    });

    test('should clear error state on successful action', async () => {
      // Simulate an error
      await vdoMock.simulateError('GENERIC_ERROR', 'Something went wrong');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Perform successful action
      await page.click('[data-testid="start-stream-btn"]');
      await vdoMock.waitForCommand('start-stream');
      
      // Error should be cleared
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
    });
  });

  test.describe('Error Logging and Reporting', () => {
    test('should log errors to console', async () => {
      // Set up console message listener
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      // Trigger various errors
      await vdoMock.simulateError('TEST_ERROR_1', 'Test error 1');
      await vdoMock.simulateError('TEST_ERROR_2', 'Test error 2');
      
      // Verify errors were logged
      expect(consoleMessages).toContain(expect.stringContaining('TEST_ERROR_1'));
      expect(consoleMessages).toContain(expect.stringContaining('Test error 1'));
    });

    test('should display error history in debug mode', async () => {
      // Enable debug mode
      await page.click('[data-testid="toggle-debug-mode"]');
      
      // Generate multiple errors
      await vdoMock.simulateError('ERROR_1', 'First error');
      await vdoMock.simulateError('ERROR_2', 'Second error');
      await vdoMock.simulateError('ERROR_3', 'Third error');
      
      // Open error history
      await page.click('[data-testid="show-error-history"]');
      
      // Verify all errors are listed
      await expect(page.locator('[data-testid="error-history-list"]')).toContainText('ERROR_1');
      await expect(page.locator('[data-testid="error-history-list"]')).toContainText('ERROR_2');
      await expect(page.locator('[data-testid="error-history-list"]')).toContainText('ERROR_3');
      
      // Verify timestamps are shown
      await expect(page.locator('[data-testid="error-timestamp"]').first()).toBeVisible();
    });

    test('should allow error report submission', async () => {
      // Trigger an error
      await vdoMock.simulateError('CRITICAL_ERROR', 'Critical system error');
      
      // Click report error button
      await page.click('[data-testid="report-error-btn"]');
      
      // Fill error report form
      await page.fill('[data-testid="error-description"]', 'Stream crashed unexpectedly');
      await page.fill('[data-testid="user-email"]', 'test@example.com');
      
      // Submit report
      await page.click('[data-testid="submit-error-report"]');
      
      // Verify confirmation
      await expect(page.locator('[data-testid="report-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-confirmation"]')).toContainText('Report sent');
    });
  });
});