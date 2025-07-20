import React, { useState, useEffect } from 'react';

type AriaLive = 'polite' | 'assertive' | 'off';

interface Announcement {
  id: string;
  message: string;
  ariaLive: AriaLive;
  timestamp: number;
}

let announcementQueue: Announcement[] = [];
let subscribers: ((announcements: Announcement[]) => void)[] = [];

// Global announcement function that can be called from anywhere
export function announce(
  message: string,
  ariaLive: AriaLive = 'polite',
  clearAfter: number = 5000
): void {
  const announcement: Announcement = {
    id: `announcement-${Date.now()}-${Math.random()}`,
    message,
    ariaLive,
    timestamp: Date.now()
  };

  announcementQueue.push(announcement);
  notifySubscribers();

  // Auto-clear after specified time
  if (clearAfter > 0) {
    setTimeout(() => {
      clearAnnouncement(announcement.id);
    }, clearAfter);
  }
}

// Clear a specific announcement
export function clearAnnouncement(id: string): void {
  announcementQueue = announcementQueue.filter(a => a.id !== id);
  notifySubscribers();
}

// Clear all announcements
export function clearAllAnnouncements(): void {
  announcementQueue = [];
  notifySubscribers();
}

function notifySubscribers(): void {
  subscribers.forEach(callback => callback([...announcementQueue]));
}

export const ScreenReaderAnnouncer: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Subscribe to announcement updates
    const handleUpdate = (newAnnouncements: Announcement[]) => {
      setAnnouncements(newAnnouncements);
    };

    subscribers.push(handleUpdate);

    return () => {
      subscribers = subscribers.filter(sub => sub !== handleUpdate);
    };
  }, []);

  // Group announcements by aria-live level
  const politeAnnouncements = announcements.filter(a => a.ariaLive === 'polite');
  const assertiveAnnouncements = announcements.filter(a => a.ariaLive === 'assertive');

  return (
    <>
      {/* Polite announcements - wait for user to finish current task */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeAnnouncements.map(announcement => (
          <div key={announcement.id}>{announcement.message}</div>
        ))}
      </div>

      {/* Assertive announcements - interrupt immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveAnnouncements.map(announcement => (
          <div key={announcement.id}>{announcement.message}</div>
        ))}
      </div>
    </>
  );
};

// Pre-defined announcement helpers for common scenarios
export const announcements = {
  // Chat messages
  newMessage: (username: string) => 
    announce(`New message from ${username}`, 'polite'),
  
  // Stream events
  streamStarted: (streamerName: string) => 
    announce(`${streamerName} has started streaming`, 'assertive'),
  
  streamEnded: () => 
    announce('Stream has ended', 'assertive'),
  
  viewerCountUpdate: (count: number) => 
    announce(`${count} viewers watching`, 'polite'),
  
  // Product events
  productAdded: (productName: string) => 
    announce(`${productName} added to cart`, 'polite'),
  
  productRemoved: (productName: string) => 
    announce(`${productName} removed from cart`, 'polite'),
  
  // Form feedback
  formError: (error: string) => 
    announce(`Error: ${error}`, 'assertive'),
  
  formSuccess: (message: string) => 
    announce(message, 'polite'),
  
  // Loading states
  loadingStart: (what: string) => 
    announce(`Loading ${what}`, 'polite'),
  
  loadingComplete: (what: string) => 
    announce(`${what} loaded`, 'polite'),
  
  // Navigation
  pageChange: (pageName: string) => 
    announce(`Navigated to ${pageName}`, 'polite'),
};