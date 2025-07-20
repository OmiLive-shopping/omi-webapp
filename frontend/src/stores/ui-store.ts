import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type LayoutMode = 'default' | 'theater' | 'fullscreen';
export type SidebarView = 'chat' | 'products' | 'info' | 'settings';

interface Modal {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarView: (view: SidebarView) => void;
  setSidebarWidth: (width: number) => void;
  
  // Layout
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  
  // Modals
  modals: Modal[];
  openModal: (modal: Modal) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  
  // Toasts
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  
  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Mobile
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  
  // Preferences
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  showTimestamps: boolean;
  setShowTimestamps: (show: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.toggle('dark', systemTheme === 'dark');
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
      },
      
      // Sidebar
      sidebarOpen: true,
      sidebarView: 'chat',
      sidebarWidth: 320,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarView: (sidebarView) => set({ sidebarView }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      
      // Layout
      layoutMode: 'default',
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      isFullscreen: false,
      toggleFullscreen: () => {
        const { isFullscreen } = get();
        if (!isFullscreen) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        set({ isFullscreen: !isFullscreen });
      },
      
      // Modals
      modals: [],
      openModal: (modal) => set((state) => ({
        modals: [...state.modals, { ...modal, id: modal.id || Date.now().toString() }]
      })),
      closeModal: (id) => set((state) => ({
        modals: state.modals.filter((m) => m.id !== id)
      })),
      closeAllModals: () => set({ modals: [] }),
      
      // Toasts
      toasts: [],
      showToast: (toast) => {
        const id = Date.now().toString();
        const newToast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        
        // Auto-hide after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().hideToast(id);
          }, toast.duration || 5000);
        }
      },
      hideToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),
      clearToasts: () => set({ toasts: [] }),
      
      // Loading states
      globalLoading: false,
      loadingMessage: null,
      setGlobalLoading: (globalLoading, loadingMessage = null) => 
        set({ globalLoading, loadingMessage }),
      
      // Mobile
      isMobile: false,
      setIsMobile: (isMobile) => set({ isMobile }),
      
      // Preferences
      compactMode: false,
      setCompactMode: (compactMode) => set({ compactMode }),
      showTimestamps: true,
      setShowTimestamps: (showTimestamps) => set({ showTimestamps }),
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      notificationsEnabled: false,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        compactMode: state.compactMode,
        showTimestamps: state.showTimestamps,
        soundEnabled: state.soundEnabled,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);