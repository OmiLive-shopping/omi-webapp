import { useEffect, useCallback, useRef, useState } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
}

interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[];
  enableArrowNavigation?: boolean;
  enableEscapeKey?: boolean;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  preventDefault?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const {
    shortcuts = [],
    enableArrowNavigation = false,
    enableEscapeKey = true,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onHome,
    onEnd,
    preventDefault = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check for custom shortcuts first
    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;

      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchesCtrl = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;
      const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const matchesMeta = shortcut.meta ? event.metaKey : !event.metaKey;

      if (matchesKey && matchesCtrl && matchesAlt && matchesShift && matchesMeta) {
        if (preventDefault) event.preventDefault();
        shortcut.handler(event);
        return;
      }
    }

    // Handle arrow navigation
    if (enableArrowNavigation) {
      switch (event.key) {
        case 'ArrowUp':
          if (onArrowUp) {
            if (preventDefault) event.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            if (preventDefault) event.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            if (preventDefault) event.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            if (preventDefault) event.preventDefault();
            onArrowRight();
          }
          break;
        case 'Home':
          if (onHome) {
            if (preventDefault) event.preventDefault();
            onHome();
          }
          break;
        case 'End':
          if (onEnd) {
            if (preventDefault) event.preventDefault();
            onEnd();
          }
          break;
      }
    }

    // Handle Enter key
    if (event.key === 'Enter' && onEnter) {
      if (preventDefault) event.preventDefault();
      onEnter();
    }

    // Handle Escape key
    if (event.key === 'Escape' && enableEscapeKey && onEscape) {
      if (preventDefault) event.preventDefault();
      onEscape();
    }
  }, [shortcuts, enableArrowNavigation, enableEscapeKey, onArrowUp, onArrowDown, 
      onArrowLeft, onArrowRight, onEnter, onEscape, onHome, onEnd, preventDefault]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Hook for managing focus within a list of items
interface UseListNavigationOptions {
  items: any[];
  onSelect?: (item: any, index: number) => void;
  onFocusChange?: (index: number) => void;
  wrap?: boolean;
  horizontal?: boolean;
  initialIndex?: number;
}

export function useListNavigation(options: UseListNavigationOptions) {
  const {
    items,
    onSelect,
    onFocusChange,
    wrap = true,
    horizontal = false,
    initialIndex = 0
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setFocusedIndex(index);
      itemRefs.current[index]?.focus();
      onFocusChange?.(index);
    }
  }, [items.length, onFocusChange]);

  const focusNext = useCallback(() => {
    const nextIndex = focusedIndex + 1;
    if (nextIndex < items.length) {
      focusItem(nextIndex);
    } else if (wrap) {
      focusItem(0);
    }
  }, [focusedIndex, items.length, wrap, focusItem]);

  const focusPrevious = useCallback(() => {
    const prevIndex = focusedIndex - 1;
    if (prevIndex >= 0) {
      focusItem(prevIndex);
    } else if (wrap) {
      focusItem(items.length - 1);
    }
  }, [focusedIndex, items.length, wrap, focusItem]);

  const focusFirst = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  const focusLast = useCallback(() => {
    focusItem(items.length - 1);
  }, [items.length, focusItem]);

  const selectCurrent = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      onSelect?.(items[focusedIndex], focusedIndex);
    }
  }, [focusedIndex, items, onSelect]);

  useKeyboardNavigation({
    enableArrowNavigation: true,
    onArrowDown: !horizontal ? focusNext : undefined,
    onArrowUp: !horizontal ? focusPrevious : undefined,
    onArrowRight: horizontal ? focusNext : undefined,
    onArrowLeft: horizontal ? focusPrevious : undefined,
    onHome: focusFirst,
    onEnd: focusLast,
    onEnter: selectCurrent
  });

  const setItemRef = useCallback((index: number, ref: HTMLElement | null) => {
    itemRefs.current[index] = ref;
  }, []);

  return {
    focusedIndex,
    setItemRef,
    focusItem,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    selectCurrent
  };
}

// Utility to check if an element is focusable
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false;
  
  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableTags.includes(element.tagName)) return true;
  
  if (element.hasAttribute('tabindex')) {
    const tabIndex = parseInt(element.getAttribute('tabindex') || '0', 10);
    return tabIndex >= 0;
  }
  
  if (element.hasAttribute('contenteditable')) {
    return element.getAttribute('contenteditable') !== 'false';
  }
  
  return false;
}

// Utility to get all focusable elements within a container
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])'
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
    .filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
}