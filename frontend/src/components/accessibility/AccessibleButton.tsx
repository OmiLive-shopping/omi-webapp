import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedBy?: string;
  announcement?: string; // Text to announce to screen readers when clicked
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText = 'Loading...',
      fullWidth = false,
      icon,
      iconPosition = 'left',
      className,
      disabled,
      onClick,
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ariaDescribedBy,
      announcement,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
      secondary: 'bg-background-secondary text-text-primary border border-border-primary hover:bg-background-tertiary focus-visible:ring-primary-500',
      ghost: 'text-text-primary hover:bg-background-secondary focus-visible:ring-primary-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
    };
    
    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5 rounded-md',
      md: 'text-base px-4 py-2 rounded-lg',
      lg: 'text-lg px-6 py-3 rounded-lg'
    };
    
    const iconSizeClasses = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (announcement) {
        // Import announce function dynamically to avoid circular dependency
        import('./ScreenReaderAnnouncer').then(({ announce }) => {
          announce(announcement, 'polite');
        });
      }
      onClick?.(e);
    };
    
    const isDisabled = disabled || loading;
    
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        onClick={handleClick}
        aria-label={ariaLabel || (loading ? loadingText : undefined)}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 
            className={clsx(
              iconSizeClasses[size],
              'animate-spin',
              children && 'mr-2'
            )}
            aria-hidden="true"
          />
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span 
            className={clsx(iconSizeClasses[size], children && 'mr-2')}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        
        {loading ? (
          <span className="sr-only">{loadingText}</span>
        ) : (
          children
        )}
        
        {!loading && icon && iconPosition === 'right' && (
          <span 
            className={clsx(iconSizeClasses[size], children && 'ml-2')}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';