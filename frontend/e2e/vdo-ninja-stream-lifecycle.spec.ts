import { test, expect, Page } from '@playwright/test';
import { VdoNinjaMock, createMockIframe } from './fixtures/vdo-ninja-mocks';

test.describe('VDO.Ninja Stream Lifecycle', () => {
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
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('should start and stop stream successfully', async () => {
    // Click start stream button
    await page.click('[data-testid="start-stream-btn"]');
    
    // Wait for start command to be sent
    const startCommand = await vdoMock.waitForCommand('start-stream');
    expect(startCommand).toBeTruthy();
    
    // Verify UI shows streaming state
    await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
    
    // Click stop stream button
    await page.click('[data-testid="stop-stream-btn"]');
    
    // Wait for stop command
    const stopCommand = await vdoMock.waitForCommand('stop-stream');
    expect(stopCommand).toBeTruthy();
    
    // Verify UI shows stopped state
    await expect(page.locator('[data-testid="stream-status"]')).toContainText('Offline');
  });

  test('should handle pause and resume correctly', async () => {
    // Start stream first
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Pause stream
    await page.click('[data-testid="pause-stream-btn"]');
    const pauseCommand = await vdoMock.waitForCommand('pause-stream');
    expect(pauseCommand).toBeTruthy();
    
    // Verify paused state
    await expect(page.locator('[data-testid="stream-status"]')).toContainText('Paused');
    
    // Resume stream
    await page.click('[data-testid="resume-stream-btn"]');
    const resumeCommand = await vdoMock.waitForCommand('resume-stream');
    expect(resumeCommand).toBeTruthy();
    
    // Verify resumed state
    await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
  });

  test('should handle viewer join and leave events', async () => {
    // Start stream
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Simulate viewer join
    await vdoMock.simulateViewerJoin('viewer-1', 'John Doe');
    
    // Check viewer count updated
    await expect(page.locator('[data-testid="viewer-count"]')).toContainText('1');
    
    // Check viewer list contains the viewer
    await expect(page.locator('[data-testid="viewer-list"]')).toContainText('John Doe');
    
    // Simulate another viewer join
    await vdoMock.simulateViewerJoin('viewer-2', 'Jane Smith');
    await expect(page.locator('[data-testid="viewer-count"]')).toContainText('2');
    
    // Simulate viewer leave
    await vdoMock.simulateViewerLeave('viewer-1');
    await expect(page.locator('[data-testid="viewer-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="viewer-list"]')).not.toContainText('John Doe');
  });

  test('should display stream statistics correctly', async () => {
    // Start stream
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Request stats
    await page.click('[data-testid="refresh-stats-btn"]');
    const statsCommand = await vdoMock.waitForCommand('get-stats');
    expect(statsCommand).toBeTruthy();
    
    // Verify stats are displayed
    await expect(page.locator('[data-testid="bitrate-stat"]')).toContainText('2.5 Mbps');
    await expect(page.locator('[data-testid="framerate-stat"]')).toContainText('30 fps');
    await expect(page.locator('[data-testid="resolution-stat"]')).toContainText('1920x1080');
    await expect(page.locator('[data-testid="latency-stat"]')).toContainText('50 ms');
  });

  test('should handle connection state changes', async () => {
    // Start stream
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Simulate disconnection
    await vdoMock.simulateConnectionChange('disconnected');
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
    await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/bg-red-500/);
    
    // Simulate reconnecting
    await vdoMock.simulateConnectionChange('reconnecting');
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Reconnecting');
    await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/bg-yellow-500/);
    
    // Simulate reconnected
    await vdoMock.simulateConnectionChange('connected');
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/bg-green-500/);
  });

  test('should maintain state after page refresh', async () => {
    // Start stream and set some state
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Mute audio
    await page.click('[data-testid="mute-audio-btn"]');
    await vdoMock.waitForCommand('mute-audio');
    
    // Set volume
    await page.fill('[data-testid="volume-slider"]', '75');
    
    // Reload page
    await page.reload();
    
    // Re-initialize mock after reload
    vdoMock = new VdoNinjaMock(page);
    await vdoMock.initialize();
    
    // Wait for page to restore state
    await page.waitForLoadState('networkidle');
    
    // Verify state is restored
    await expect(page.locator('[data-testid="stream-status"]')).toContainText('Live');
    await expect(page.locator('[data-testid="audio-muted-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume-slider"]')).toHaveValue('75');
  });

  test('should queue commands when offline', async () => {
    // Start stream
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Simulate going offline
    await vdoMock.simulateConnectionChange('disconnected');
    
    // Try to send commands while offline
    await page.click('[data-testid="mute-audio-btn"]');
    await page.click('[data-testid="hide-video-btn"]');
    
    // Check commands are queued
    await expect(page.locator('[data-testid="command-queue-count"]')).toContainText('2');
    
    // Simulate coming back online
    await vdoMock.simulateConnectionChange('connected');
    
    // Wait for queued commands to be sent
    await page.waitForTimeout(1000);
    
    // Verify queue is cleared
    await expect(page.locator('[data-testid="command-queue-count"]')).toContainText('0');
    
    // Verify commands were executed
    const commands = await vdoMock.getCommandHistory();
    expect(commands.some(cmd => cmd.action === 'mute-audio')).toBeTruthy();
    expect(commands.some(cmd => cmd.action === 'hide-video')).toBeTruthy();
  });

  test('should handle stream quality changes', async () => {
    // Start stream
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Change quality preset
    await page.selectOption('[data-testid="quality-preset"]', 'high');
    const bitrateCommand = await vdoMock.waitForCommand('set-bitrate');
    expect(bitrateCommand?.value).toBeGreaterThan(3000000);
    
    // Simulate quality change event
    await vdoMock.simulateQualityChange(3500000, 60, '1920x1080');
    
    // Verify UI updates
    await expect(page.locator('[data-testid="bitrate-stat"]')).toContainText('3.5 Mbps');
    await expect(page.locator('[data-testid="framerate-stat"]')).toContainText('60 fps');
  });

  test('should handle rapid state changes correctly', async () => {
    // Rapid start/stop cycles
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="start-stream-btn"]');
      await page.waitForTimeout(100);
      await page.click('[data-testid="stop-stream-btn"]');
      await page.waitForTimeout(100);
    }
    
    // Final state should be stopped
    await expect(page.locator('[data-testid="stream-status"]')).toContainText('Offline');
    
    // Check no duplicate commands in queue
    await expect(page.locator('[data-testid="command-queue-count"]')).toContainText('0');
  });

  test('should track stream duration correctly', async () => {
    // Start stream
    await page.click('[data-testid="start-stream-btn"]');
    await vdoMock.waitForCommand('start-stream');
    
    // Wait for 3 seconds
    await page.waitForTimeout(3000);
    
    // Check duration is updating
    const duration = await page.locator('[data-testid="stream-duration"]').textContent();
    expect(duration).toMatch(/00:00:0[3-4]/); // Allow for small timing variance
    
    // Pause stream
    await page.click('[data-testid="pause-stream-btn"]');
    await vdoMock.waitForCommand('pause-stream');
    
    // Wait and verify duration is paused
    const pausedDuration = await page.locator('[data-testid="stream-duration"]').textContent();
    await page.waitForTimeout(2000);
    const stillPausedDuration = await page.locator('[data-testid="stream-duration"]').textContent();
    expect(pausedDuration).toBe(stillPausedDuration);
  });
});