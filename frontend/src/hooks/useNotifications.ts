import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationTypes } from '@/services/notifications';

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: {
    title: string;
    body: string;
    type?: keyof typeof NotificationTypes;
    data?: any;
  }) => Promise<void>;
  canNotify: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window);
    
    // Get current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const newPermission = await notificationService.requestPermission();
    setPermission(newPermission);
    return newPermission;
  }, []);

  const showNotification = useCallback(async (options: {
    title: string;
    body: string;
    type?: keyof typeof NotificationTypes;
    data?: any;
  }) => {
    await notificationService.showNotification({
      title: options.title,
      body: options.body,
      tag: options.type ? NotificationTypes[options.type] : undefined,
      data: options.data,
    });
  }, []);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    canNotify: notificationService.canNotify(),
  };
}