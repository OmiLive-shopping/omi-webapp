import React, { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helpText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      inputSize = 'md',
      className,
      type,
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const baseStyles = clsx(
      'block w-full rounded-md transition-colors duration-200',
      'border border-gray-300 dark:border-gray-600',
      'bg-white dark:bg-gray-800',
      'text-gray-900 dark:text-gray-100',
      'placeholder:text-gray-500 dark:placeholder:text-gray-400',
      'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-25',
      'disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900',
      'disabled:text-gray-500 dark:disabled:text-gray-400',
      error && 'border-error-500 focus:border-error-500 focus:ring-error-500'
    );

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const paddingWithIcon = {
      left: {
        sm: 'pl-9',
        md: 'pl-10',
        lg: 'pl-11',
      },
      right: {
        sm: 'pr-9',
        md: 'pr-10',
        lg: 'pr-11',
      },
    };

    const containerClasses = clsx(
      'relative',
      fullWidth ? 'w-full' : 'w-auto'
    );

    const inputClasses = clsx(
      baseStyles,
      sizes[inputSize],
      leftIcon && paddingWithIcon.left[inputSize],
      (rightIcon || isPassword) && paddingWithIcon.right[inputSize],
      className
    );

    return (
      <div className={containerClasses}>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'block text-sm font-medium mb-1',
              error ? 'text-error-600 dark:text-error-400' : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={clsx(
              'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none',
              error ? 'text-error-500' : 'text-gray-400'
            )}>
              <span className={iconSizes[inputSize]}>{leftIcon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            required={required}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined
            }
            {...props}
          />
          
          {(rightIcon || isPassword) && (
            <div className={clsx(
              'absolute inset-y-0 right-0 flex items-center pr-3',
              isPassword && !disabled && 'cursor-pointer'
            )}>
              {isPassword ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={disabled}
                  className={clsx(
                    iconSizes[inputSize],
                    'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                    'focus:outline-none disabled:cursor-not-allowed'
                  )}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              ) : (
                <span className={clsx(
                  iconSizes[inputSize],
                  error ? 'text-error-500' : 'text-gray-400'
                )}>
                  {rightIcon}
                </span>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </p>
        )}
        
        {helpText && !error && (
          <p 
            id={`${inputId}-help`}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;