import React, { useState, useEffect } from 'react';
import { errorRecoveryManager, type UserNotification } from '@/lib/error-recovery/error-recovery-manager';

/**
 * Notification types with styling
 */
const notificationStyles = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: 'ℹ️',
    accent: 'border-l-blue-500',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠️',
    accent: 'border-l-yellow-500',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: '❌',
    accent: 'border-l-red-500',
  },
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: '✅',
    accent: 'border-l-green-500',
  },
};

/**
 * Individual notification component
 */
interface NotificationProps {
  notification: UserNotification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const style = notificationStyles[notification.type];

  useEffect(() => {
    // Auto-dismiss timer
    if (notification.duration && notification.duration > 0 && !notification.persistent) {
      setTimeLeft(notification.duration);
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1000) {
            setIsVisible(false);
            setTimeout(() => onDismiss(notification.id), 300); // Wait for animation
            return null;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [notification.duration, notification.persistent, notification.id, onDismiss]);

  const handleDismiss = () => {
    if (notification.dismissible) {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }
  };

  const handleActionClick = (action: NonNullable<UserNotification['actions']>[0]) => {
    action.action();
    if (!notification.persistent) {
      handleDismiss();
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`
          ${style.bg} ${style.accent} ${style.text}
          border border-l-4 rounded-lg p-4 shadow-md
          ${notification.persistent ? 'ring-2 ring-opacity-50 ring-gray-400' : ''}
        `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-lg" role="img" aria-label={notification.type}>
              {style.icon}
            </span>
          </div>
          
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{notification.title}</h4>
              
              <div className="flex items-center space-x-2">
                {timeLeft && (
                  <span className="text-xs opacity-75">
                    {Math.ceil(timeLeft / 1000)}s
                  </span>
                )}
                
                {notification.dismissible && (
                  <button
                    onClick={handleDismiss}
                    className="text-current opacity-60 hover:opacity-100 text-lg leading-none"
                    aria-label="Dismiss notification"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            
            <p className="mt-1 text-sm opacity-90">{notification.message}</p>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleActionClick(action)}
                    className={`
                      px-3 py-1 rounded text-xs font-medium transition-colors
                      ${action.style === 'primary' ? 'bg-current text-white bg-opacity-80 hover:bg-opacity-100' :
                        action.style === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                        'bg-white bg-opacity-80 text-current hover:bg-opacity-100'}
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {notification.persistent && (
          <div className="mt-2 text-xs opacity-75 italic">
            This notification will remain until resolved
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main notification system component
 */
export const ErrorNotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [position, setPosition] = useState<'top-right' | 'bottom-right' | 'top-center'>('top-right');

  useEffect(() => {
    const handleNotification = (notification: UserNotification) => {
      setNotifications(prev => {
        // Prevent duplicate notifications
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        
        // Add new notification
        const updated = [...prev, notification];
        
        // Limit to 5 notifications max
        if (updated.length > 5) {
          return updated.slice(-5);
        }
        
        return updated;
      });
    };

    const handleDismissed = (notificationId: string) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    // Listen to error recovery manager events
    errorRecoveryManager.on('user:notification', handleNotification);
    errorRecoveryManager.on('notification:dismissed', handleDismissed);

    // Create some test notifications for demonstration
    const createTestNotifications = () => {
      // Connection restored notification
      setTimeout(() => {
        errorRecoveryManager.emit('user:notification', {
          id: 'test-success',
          type: 'success',
          title: 'Connection Restored',
          message: 'Successfully reconnected to the server. All features are now available.',
          duration: 5000,
          dismissible: true,
          persistent: false,
        } as UserNotification);
      }, 1000);

      // Rate limit warning
      setTimeout(() => {
        errorRecoveryManager.emit('user:notification', {
          id: 'test-warning',
          type: 'warning',
          title: 'Rate Limited',
          message: 'You are sending messages too quickly. Please slow down.',
          duration: 8000,
          dismissible: true,
          persistent: false,
          actions: [
            {
              label: 'Understood',
              action: () => console.log('Rate limit acknowledged'),
              style: 'primary',
            },
          ],
        } as UserNotification);
      }, 3000);
    };

    // Only create test notifications in development
    if (process.env.NODE_ENV === 'development') {
      createTestNotifications();
    }

    return () => {
      errorRecoveryManager.off('user:notification', handleNotification);
      errorRecoveryManager.off('notification:dismissed', handleDismissed);
    };
  }, []);

  const dismissNotification = (id: string) => {
    errorRecoveryManager.dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getPositionClasses = (): string => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'top-center':
        return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={getPositionClasses()}>
      <div className="space-y-3 w-80 max-w-sm">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={dismissNotification}
          />
        ))}
      </div>
      
      {/* Position selector for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <label className="block mb-1">Position:</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as any)}
            className="w-full text-xs"
          >
            <option value="top-right">Top Right</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="top-center">Top Center</option>
          </select>
        </div>
      )}
    </div>
  );
};

/**
 * Notification context provider (optional, for more complex use cases)
 */
interface NotificationContextType {
  showNotification: (notification: Omit<UserNotification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = React.createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showNotification = (notification: Omit<UserNotification, 'id'>) => {
    const fullNotification: UserNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    errorRecoveryManager.emit('user:notification', fullNotification);
  };

  const dismissNotification = (id: string) => {
    errorRecoveryManager.dismissNotification(id);
  };

  const clearAllNotifications = () => {
    // Implementation would clear all notifications
    console.log('Clearing all notifications');
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        dismissNotification,
        clearAllNotifications,
      }}
    >
      {children}
      <ErrorNotificationSystem />
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Fallback mode indicator
 */
export const FallbackModeIndicator: React.FC = () => {
  const [fallbackMode, setFallbackMode] = useState(errorRecoveryManager.getCurrentFallbackMode());

  useEffect(() => {
    const handleFallbackActivated = (mode: any) => {
      setFallbackMode(mode);
    };

    const handleFallbackDeactivated = () => {
      setFallbackMode(null);
    };

    errorRecoveryManager.on('fallback:activated', handleFallbackActivated);
    errorRecoveryManager.on('fallback:deactivated', handleFallbackDeactivated);

    return () => {
      errorRecoveryManager.off('fallback:activated', handleFallbackActivated);
      errorRecoveryManager.off('fallback:deactivated', handleFallbackDeactivated);
    };
  }, []);

  if (!fallbackMode || !fallbackMode.enabled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-orange-100 border-t-2 border-orange-400 p-3 z-40">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-orange-600 text-lg">⚠️</span>
          <div>
            <p className="font-medium text-orange-800">Limited Functionality</p>
            <p className="text-sm text-orange-700">{fallbackMode.userMessage}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {fallbackMode.automaticRecovery && (
            <span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded">
              Auto-recovery enabled
            </span>
          )}
          
          <button
            onClick={() => errorRecoveryManager.deactivateFallback()}
            className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
          >
            Try Full Mode
          </button>
        </div>
      </div>
    </div>
  );
};
