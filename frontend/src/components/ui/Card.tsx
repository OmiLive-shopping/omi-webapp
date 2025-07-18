import React from 'react';
import clsx from 'clsx';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
  as?: 'div' | 'article' | 'section';
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = 'md',
  hover = false,
  onClick,
  as: Component = 'div',
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const baseStyles = clsx(
    'bg-white dark:bg-gray-800',
    'border border-gray-200 dark:border-gray-700',
    'rounded-lg',
    'transition-all duration-200',
    paddings[padding],
    shadows[shadow],
    hover && [
      'hover:shadow-lg dark:hover:shadow-2xl',
      'hover:scale-[1.02]',
      'hover:border-gray-300 dark:hover:border-gray-600',
    ],
    onClick && [
      'cursor-pointer',
      'active:scale-[0.98]',
    ],
    className
  );

  const props = {
    className: baseStyles,
    ...(onClick && { onClick, role: 'button', tabIndex: 0 }),
  };

  return <Component {...props}>{children}</Component>;
};

// Card subcomponents for better composition
export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={clsx(
    'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
    className
  )}>
    {children}
  </div>
);

export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={clsx('p-6', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={clsx(
    'px-6 py-4 border-t border-gray-200 dark:border-gray-700',
    'bg-gray-50 dark:bg-gray-900 rounded-b-lg',
    className
  )}>
    {children}
  </div>
);

export default Card;