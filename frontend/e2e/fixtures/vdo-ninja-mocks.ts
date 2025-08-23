import { Page } from '@playwright/test';

export interface VdoMessage {
  action?: string;
  response?: string;
  value?: any;
  [key: string]: any;
}

export class VdoNinjaMock {
  private page: Page;
  private messageHandlers: Map<string, (msg: VdoMessage) => VdoMessage | null> = new Map();
  private messageQueue: VdoMessage[] = [];
  private isListening = false;

  constructor(page: Page) {
    this.page = page;
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers() {
    // Stream lifecycle handlers
    this.messageHandlers.set('start-stream', () => ({
      response: 'stream-started',
      streamId: 'test-stream-123',
      timestamp: Date.now()
    }));

    this.messageHandlers.set('stop-stream', () => ({
      response: 'stream-stopped',
      timestamp: Date.now()
    }));

    this.messageHandlers.set('pause-stream', () => ({
      response: 'stream-paused',
      timestamp: Date.now()
    }));

    this.messageHandlers.set('resume-stream', () => ({
      response: 'stream-resumed',
      timestamp: Date.now()
    }));

    // Media control handlers
    this.messageHandlers.set('mute-audio', () => ({
      response: 'audio-muted',
      muted: true
    }));

    this.messageHandlers.set('unmute-audio', () => ({
      response: 'audio-unmuted',
      muted: false
    }));

    this.messageHandlers.set('hide-video', () => ({
      response: 'video-hidden',
      hidden: true
    }));

    this.messageHandlers.set('show-video', () => ({
      response: 'video-shown',
      hidden: false
    }));

    this.messageHandlers.set('set-volume', (msg) => ({
      response: 'volume-set',
      volume: msg.value || 50
    }));

    this.messageHandlers.set('set-bitrate', (msg) => ({
      response: 'bitrate-set',
      bitrate: msg.value || 2500000
    }));

    // Screen share handlers
    this.messageHandlers.set('start-screenshare', () => ({
      response: 'screenshare-started',
      sharing: true
    }));

    this.messageHandlers.set('stop-screenshare', () => ({
      response: 'screenshare-stopped',
      sharing: false
    }));

    // Recording handlers
    this.messageHandlers.set('start-recording', () => ({
      response: 'recording-started',
      recording: true,
      recordingId: 'rec-' + Date.now()
    }));

    this.messageHandlers.set('stop-recording', () => ({
      response: 'recording-stopped',
      recording: false
    }));

    // Statistics handler
    this.messageHandlers.set('get-stats', () => ({
      response: 'stats',
      stats: {
        bitrate: 2500000,
        framerate: 30,
        resolution: '1920x1080',
        audioLevel: 0.5,
        packetLoss: 0.01,
        latency: 50,
        viewers: 3
      }
    }));
  }

  async initialize() {
    // Inject message interceptor into the page
    await this.page.evaluate(() => {
      // Store original postMessage
      const originalPostMessage = window.postMessage.bind(window);
      
      // Override postMessage to intercept VDO.Ninja commands
      (window as any).postMessage = function(message: any, targetOrigin: string) {
        if (typeof message === 'object' && message.vdoninja) {
          // Emit custom event for Playwright to catch
          window.dispatchEvent(new CustomEvent('vdo-command', { 
            detail: message 
          }));
        }
        return originalPostMessage(message, targetOrigin);
      };

      // Listen for mock responses from Playwright
      window.addEventListener('vdo-mock-response', (event: any) => {
        const mockResponse = event.detail;
        window.dispatchEvent(new MessageEvent('message', {
          data: mockResponse,
          origin: window.location.origin
        }));
      });
    });

    // Listen for VDO commands from the page
    await this.page.exposeFunction('handleVdoCommand', async (command: VdoMessage) => {
      return this.handleCommand(command);
    });

    await this.page.evaluate(() => {
      window.addEventListener('vdo-command', async (event: any) => {
        const response = await (window as any).handleVdoCommand(event.detail);
        if (response) {
          window.dispatchEvent(new CustomEvent('vdo-mock-response', { 
            detail: response 
          }));
        }
      });
    });

    this.isListening = true;
  }

  private handleCommand(command: VdoMessage): VdoMessage | null {
    const handler = this.messageHandlers.get(command.action || '');
    if (handler) {
      return handler(command);
    }
    return null;
  }

  // Add custom handler for specific test scenarios
  addHandler(action: string, handler: (msg: VdoMessage) => VdoMessage | null) {
    this.messageHandlers.set(action, handler);
  }

  // Simulate incoming events
  async simulateEvent(event: VdoMessage) {
    await this.page.evaluate((evt) => {
      window.dispatchEvent(new MessageEvent('message', {
        data: evt,
        origin: window.location.origin
      }));
    }, event);
  }

  // Simulate viewer join
  async simulateViewerJoin(viewerId: string, displayName?: string) {
    await this.simulateEvent({
      action: 'viewer-joined',
      viewerId,
      displayName: displayName || `Viewer ${viewerId}`,
      timestamp: Date.now()
    });
  }

  // Simulate viewer leave
  async simulateViewerLeave(viewerId: string) {
    await this.simulateEvent({
      action: 'viewer-left',
      viewerId,
      timestamp: Date.now()
    });
  }

  // Simulate connection state change
  async simulateConnectionChange(state: 'connected' | 'disconnected' | 'reconnecting') {
    await this.simulateEvent({
      action: 'connection-state-changed',
      state,
      timestamp: Date.now()
    });
  }

  // Simulate quality change
  async simulateQualityChange(bitrate: number, framerate: number, resolution: string) {
    await this.simulateEvent({
      action: 'quality-changed',
      bitrate,
      framerate,
      resolution,
      timestamp: Date.now()
    });
  }

  // Simulate error
  async simulateError(code: string, message: string) {
    await this.simulateEvent({
      action: 'error',
      error: {
        code,
        message,
        timestamp: Date.now()
      }
    });
  }

  // Wait for specific command
  async waitForCommand(action: string, timeout = 5000): Promise<VdoMessage | null> {
    return this.page.evaluate((params) => {
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => resolve(null), params.timeout);
        
        const listener = (event: any) => {
          if (event.detail?.action === params.action) {
            clearTimeout(timeoutId);
            window.removeEventListener('vdo-command', listener);
            resolve(event.detail);
          }
        };
        
        window.addEventListener('vdo-command', listener);
      });
    }, { action, timeout });
  }

  // Get all commands sent
  async getCommandHistory(): Promise<VdoMessage[]> {
    return this.page.evaluate(() => {
      return (window as any).__vdoCommandHistory || [];
    });
  }

  // Clear command history
  async clearCommandHistory() {
    await this.page.evaluate(() => {
      (window as any).__vdoCommandHistory = [];
    });
  }

  // Setup command history tracking
  async enableCommandHistory() {
    await this.page.evaluate(() => {
      (window as any).__vdoCommandHistory = [];
      const originalListener = window.addEventListener;
      window.addEventListener = function(type: string, listener: any, ...args: any[]) {
        if (type === 'vdo-command') {
          const wrappedListener = (event: any) => {
            (window as any).__vdoCommandHistory.push(event.detail);
            return listener(event);
          };
          return originalListener.call(window, type, wrappedListener, ...args);
        }
        return originalListener.apply(window, [type, listener, ...args] as any);
      };
    });
  }
}

// Helper to create mock iframe
export async function createMockIframe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const iframe = document.createElement('iframe');
    iframe.id = 'vdo-ninja-iframe';
    iframe.src = 'about:blank';
    iframe.style.width = '100%';
    iframe.style.height = '400px';
    document.body.appendChild(iframe);
  });
}

// Helper to simulate network conditions
export async function simulateNetworkCondition(
  page: Page, 
  condition: 'good' | 'poor' | 'offline'
) {
  const conditions = {
    good: { download: -1, upload: -1, latency: 0 },
    poor: { download: 50000, upload: 50000, latency: 400 },
    offline: { download: 0, upload: 0, latency: 0 }
  };

  const ctx = page.context();
  await ctx.route('**/*', async route => {
    if (condition === 'offline') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
}