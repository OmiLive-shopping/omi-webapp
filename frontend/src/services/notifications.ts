// Push Notifications Service Foundation
// This provides the basic setup for push notifications
// Backend implementation needed for full functionality

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  
  private constructor() {
    this.permission = Notification.permission;
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request permission to show notifications
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Check if notifications are supported and permitted
   */
  public canNotify(): boolean {
    return 'Notification' in window && this.permission === 'granted';
  }

  /**
   * Show a local notification
   */
  public async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.canNotify()) {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
        badge: options.badge || '/pwa-64x64.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        actions: options.actions,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to basic notification if service worker not available
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
      });
    }
  }

  /**
   * Subscribe to push notifications
   * Note: Requires backend implementation with VAPID keys
   */
  public async subscribeToPush(publicVapidKey?: string): Promise<PushSubscription | null> {
    if (!('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return null;
    }

    if (!publicVapidKey) {
      console.warn('VAPID public key required for push subscriptions');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        return subscription;
      }

      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey),
      });

      // TODO: Send subscription to backend server
      console.log('Push subscription created:', subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
        // TODO: Notify backend server of unsubscription
        return success;
      }
      
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Helper to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Example notification types for the app
export const NotificationTypes = {
  NEW_MESSAGE: 'new-message',
  STREAM_START: 'stream-start',
  PRODUCT_SALE: 'product-sale',
  ORDER_UPDATE: 'order-update',
} as const;

// Example usage:
// await notificationService.requestPermission();
// await notificationService.showNotification({
//   title: 'New Live Stream!',
//   body: 'Your favorite streamer just went live',
//   tag: NotificationTypes.STREAM_START,
//   data: { streamId: '123' }
// });