// Accessibility Testing Utilities
// These utilities help ensure components meet WCAG 2.1 AA standards

export interface ColorContrastResult {
  ratio: number;
  passes: {
    aa: boolean;
    aaLarge: boolean;
    aaa: boolean;
    aaaLarge: boolean;
  };
  foreground: string;
  background: string;
}

// Calculate relative luminance of a color
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Parse color string to RGB
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split('').map(c => parseInt(c + c, 16));
      return { r, g, b };
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }
  
  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10)
    };
  }
  
  return null;
}

// Calculate color contrast ratio between two colors
export function getColorContrast(foreground: string, background: string): ColorContrastResult {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  
  if (!fg || !bg) {
    throw new Error('Invalid color format');
  }
  
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: {
      aa: ratio >= 4.5,        // Normal text
      aaLarge: ratio >= 3,     // Large text (18pt or 14pt bold)
      aaa: ratio >= 7,         // Enhanced normal text
      aaaLarge: ratio >= 4.5   // Enhanced large text
    },
    foreground,
    background
  };
}

// Check if an element has sufficient color contrast
export function checkElementContrast(element: HTMLElement): ColorContrastResult | null {
  const style = window.getComputedStyle(element);
  const color = style.color;
  const backgroundColor = style.backgroundColor;
  
  if (!color || !backgroundColor || backgroundColor === 'transparent') {
    return null;
  }
  
  return getColorContrast(color, backgroundColor);
}

// Audit a page or component for accessibility issues
export interface AccessibilityIssue {
  type: 'error' | 'warning';
  element: HTMLElement;
  message: string;
  wcagCriteria?: string;
}

export function auditAccessibility(container: HTMLElement = document.body): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for images without alt text
  container.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        type: 'error',
        element: img,
        message: 'Image missing alt attribute',
        wcagCriteria: '1.1.1'
      });
    }
  });
  
  // Check for form inputs without labels
  container.querySelectorAll('input, select, textarea').forEach(input => {
    const inputEl = input as HTMLInputElement;
    if (inputEl.type === 'hidden') return;
    
    const id = inputEl.id;
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = inputEl.hasAttribute('aria-label') || inputEl.hasAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel) {
      issues.push({
        type: 'error',
        element: inputEl,
        message: 'Form input missing label',
        wcagCriteria: '1.3.1'
      });
    }
  });
  
  // Check for buttons without accessible text
  container.querySelectorAll('button').forEach(button => {
    const hasText = button.textContent?.trim();
    const hasAriaLabel = button.hasAttribute('aria-label');
    const hasTitle = button.hasAttribute('title');
    
    if (!hasText && !hasAriaLabel && !hasTitle) {
      issues.push({
        type: 'error',
        element: button,
        message: 'Button missing accessible text',
        wcagCriteria: '4.1.2'
      });
    }
  });
  
  // Check for missing lang attribute
  if (container === document.body && !document.documentElement.hasAttribute('lang')) {
    issues.push({
      type: 'error',
      element: document.documentElement,
      message: 'Document missing lang attribute',
      wcagCriteria: '3.1.1'
    });
  }
  
  // Check for missing page title
  if (container === document.body && !document.title) {
    issues.push({
      type: 'error',
      element: document.head,
      message: 'Document missing title',
      wcagCriteria: '2.4.2'
    });
  }
  
  // Check for duplicate IDs
  const idMap = new Map<string, HTMLElement[]>();
  container.querySelectorAll('[id]').forEach(el => {
    const id = el.id;
    if (!idMap.has(id)) {
      idMap.set(id, []);
    }
    idMap.get(id)!.push(el as HTMLElement);
  });
  
  idMap.forEach((elements, id) => {
    if (elements.length > 1) {
      elements.forEach(el => {
        issues.push({
          type: 'error',
          element: el,
          message: `Duplicate ID: ${id}`,
          wcagCriteria: '4.1.1'
        });
      });
    }
  });
  
  // Check for color contrast issues (sampling)
  const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
  const sampleSize = Math.min(textElements.length, 20); // Sample up to 20 elements
  const sampleIndices = new Set<number>();
  
  while (sampleIndices.size < sampleSize) {
    sampleIndices.add(Math.floor(Math.random() * textElements.length));
  }
  
  sampleIndices.forEach(index => {
    const element = textElements[index] as HTMLElement;
    const contrastResult = checkElementContrast(element);
    
    if (contrastResult && !contrastResult.passes.aa) {
      issues.push({
        type: 'warning',
        element,
        message: `Low color contrast ratio: ${contrastResult.ratio}:1 (minimum 4.5:1)`,
        wcagCriteria: '1.4.3'
      });
    }
  });
  
  return issues;
}

// Log accessibility issues to console with styling
export function logAccessibilityIssues(issues: AccessibilityIssue[]): void {
  if (issues.length === 0) {
    console.log('%c✓ No accessibility issues found!', 'color: green; font-weight: bold');
    return;
  }
  
  console.group(`%c⚠️ Found ${issues.length} accessibility issues`, 'color: orange; font-weight: bold');
  
  issues.forEach(issue => {
    const style = issue.type === 'error' ? 'color: red' : 'color: orange';
    console.log(`%c${issue.type.toUpperCase()}: ${issue.message}`, style);
    console.log('Element:', issue.element);
    if (issue.wcagCriteria) {
      console.log(`WCAG ${issue.wcagCriteria}`);
    }
    console.log('---');
  });
  
  console.groupEnd();
}

// Create a visual overlay showing accessibility issues
export function showAccessibilityOverlay(issues: AccessibilityIssue[]): () => void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 999999;
  `;
  
  issues.forEach(issue => {
    const rect = issue.element.getBoundingClientRect();
    const marker = document.createElement('div');
    
    marker.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${issue.type === 'error' ? 'red' : 'orange'};
      background: ${issue.type === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(255,165,0,0.1)'};
    `;
    
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      top: -30px;
      left: 0;
      background: ${issue.type === 'error' ? 'red' : 'orange'};
      color: white;
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: auto;
    `;
    tooltip.textContent = issue.message;
    
    marker.appendChild(tooltip);
    overlay.appendChild(marker);
  });
  
  document.body.appendChild(overlay);
  
  // Return cleanup function
  return () => {
    document.body.removeChild(overlay);
  };
}