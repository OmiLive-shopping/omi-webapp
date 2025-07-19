// Theme configuration for OMI Live
// This is used for consistent colors, spacing, and other design tokens
// We use Tailwind CSS for styling - this is just for reference and custom properties

export const theme = {
  name: 'omi-live',
  
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    // Custom colors for OMI Live
    stream: {
      live: '#ef4444',
      offline: '#6b7280',
      recording: '#f59e0b',
    },
    product: {
      featured: '#8b5cf6',
      sale: '#ec4899',
      new: '#10b981',
    }
  },

  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },

  radius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  components: {
    // Button customizations
    Button: {
      variants: {
        primary: {
          backgroundColor: 'primary.600',
          color: 'white',
          '&:hover': {
            backgroundColor: 'primary.700',
          },
          '&:active': {
            backgroundColor: 'primary.800',
          },
        },
        secondary: {
          backgroundColor: 'secondary.100',
          color: 'secondary.900',
          '&:hover': {
            backgroundColor: 'secondary.200',
          },
        },
        danger: {
          backgroundColor: 'danger.600',
          color: 'white',
          '&:hover': {
            backgroundColor: 'danger.700',
          },
        },
        ghost: {
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'secondary.100',
          },
        },
      },
      sizes: {
        sm: {
          padding: '0.5rem 1rem',
          fontSize: 'sm',
        },
        md: {
          padding: '0.75rem 1.5rem',
          fontSize: 'base',
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: 'lg',
        },
      },
    },

    // Card customizations
    Card: {
      base: {
        backgroundColor: 'white',
        borderRadius: 'lg',
        boxShadow: 'base',
        dark: {
          backgroundColor: 'secondary.800',
        },
      },
      hoverable: {
        transition: 'all 200ms',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        },
      },
    },

    // Badge customizations
    Badge: {
      variants: {
        primary: {
          backgroundColor: 'primary.100',
          color: 'primary.800',
        },
        secondary: {
          backgroundColor: 'secondary.100',
          color: 'secondary.800',
        },
        success: {
          backgroundColor: 'success.100',
          color: 'success.800',
        },
        warning: {
          backgroundColor: 'warning.100',
          color: 'warning.800',
        },
        danger: {
          backgroundColor: 'danger.100',
          color: 'danger.800',
        },
      },
    },

    // Video player customizations
    Video: {
      Player: {
        backgroundColor: 'black',
        borderRadius: 'lg',
        overflow: 'hidden',
      },
      Overlay: {
        padding: '1rem',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
      },
    },

    // Chat customizations
    Chat: {
      Container: {
        backgroundColor: 'white',
        dark: {
          backgroundColor: 'secondary.900',
        },
      },
      Message: {
        padding: '0.5rem',
        borderRadius: 'md',
        '&:hover': {
          backgroundColor: 'secondary.50',
          dark: {
            backgroundColor: 'secondary.800',
          },
        },
      },
    },

    // Navigation customizations
    Navigation: {
      Bar: {
        height: '4rem',
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'secondary.200',
        dark: {
          backgroundColor: 'secondary.900',
          borderColor: 'secondary.700',
        },
      },
      Item: {
        padding: '0.5rem 1rem',
        color: 'secondary.700',
        '&:hover': {
          color: 'primary.600',
          backgroundColor: 'secondary.50',
        },
        '&.active': {
          color: 'primary.600',
          fontWeight: 'semibold',
        },
      },
    },
  },

  // Dark mode overrides
  darkMode: {
    colors: {
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      cardForeground: '#f8fafc',
      border: '#334155',
      input: '#334155',
      ring: '#3b82f6',
      selection: '#3b82f6',
    },
  },

  // Animation presets
  animations: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    slideUp: {
      from: { transform: 'translateY(10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
  },
};

// Export individual theme sections for easy access
export const colors = theme.colors;
export const typography = theme.typography;
export const spacing = theme.spacing;
export const animations = theme.animations;