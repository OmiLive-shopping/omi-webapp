// Accessibility Components
export { SkipLinks } from './SkipLinks';
export { ScreenReaderAnnouncer, announce, announcements } from './ScreenReaderAnnouncer';
export { AccessibleModal } from './AccessibleModal';
export { AccessibleButton } from './AccessibleButton';

// Accessibility Hooks
export { useFocusTrap, focusFirstElement } from '@/hooks/useFocusTrap';
export { 
  useKeyboardNavigation, 
  useListNavigation,
  isFocusable,
  getFocusableElements
} from '@/hooks/useKeyboardNavigation';

// Accessibility Testing Utilities
export {
  getColorContrast,
  checkElementContrast,
  auditAccessibility,
  logAccessibilityIssues,
  showAccessibilityOverlay
} from '@/utils/accessibility-testing';

// Re-export types
export type { AccessibilityIssue, ColorContrastResult } from '@/utils/accessibility-testing';