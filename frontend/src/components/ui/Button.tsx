import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth && 'w-full'
    );

    const variants = {
      primary: clsx(
        'bg-primary-600 text-white hover:bg-primary-700',
        'active:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-600',
        'disabled:hover:bg-primary-600 dark:disabled:hover:bg-primary-500'
      ),
      secondary: clsx(
        'bg-gray-200 text-gray-900 hover:bg-gray-300',
        'active:bg-gray-400 dark:bg-gray-700 dark:text-gray-100',
        'dark:hover:bg-gray-600 disabled:hover:bg-gray-200',
        'dark:disabled:hover:bg-gray-700'
      ),
      ghost: clsx(
        'bg-transparent text-gray-700 hover:bg-gray-100',
        'active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800',
        'dark:active:bg-gray-700 disabled:hover:bg-transparent',
        'dark:disabled:hover:bg-transparent'
      ),
      danger: clsx(
        'bg-error-500 text-white hover:bg-error-600',
        'active:bg-error-700 dark:bg-error-600 dark:hover:bg-error-700',
        'disabled:hover:bg-error-500 dark:disabled:hover:bg-error-600'
      ),
    };

    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs rounded',
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-6 py-3 text-base rounded-lg',
    };

    const iconSizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const iconSpacing = {
      xs: 'gap-1',
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          iconSpacing[size],
          className
        )}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <Loader2 className={clsx(iconSizes[size], 'animate-spin')} />
        ) : (
          leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className={iconSizes[size]}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;