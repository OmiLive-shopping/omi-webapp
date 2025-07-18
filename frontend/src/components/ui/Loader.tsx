import React from 'react';
import clsx from 'clsx';

export interface LoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  color?: 'primary' | 'secondary' | 'white' | 'current';
  className?: string;
  label?: string;
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className,
  label = 'Loading',
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colors = {
    primary: 'text-primary-600 dark:text-primary-500',
    secondary: 'text-gray-600 dark:text-gray-400',
    white: 'text-white',
    current: 'text-current',
  };

  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
  };

  const baseClasses = clsx(colors[color], className);

  if (variant === 'spinner') {
    return (
      <div className={clsx('inline-flex items-center', className)}>
        <svg
          className={clsx(sizes[size], 'animate-spin', baseClasses)}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={clsx('inline-flex items-center space-x-1', className)}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={clsx(
              dotSizes[size],
              'rounded-full animate-pulse',
              baseClasses
            )}
            style={{
              animationDelay: `${index * 150}ms`,
              backgroundColor: 'currentColor',
            }}
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={clsx('inline-flex items-center justify-center', className)}>
        <div className={clsx('relative', sizes[size])}>
          <div
            className={clsx(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              baseClasses
            )}
            style={{ backgroundColor: 'currentColor' }}
          />
          <div
            className={clsx(
              'relative rounded-full',
              sizes[size],
              baseClasses
            )}
            style={{ backgroundColor: 'currentColor' }}
          />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return null;
};

export default Loader;