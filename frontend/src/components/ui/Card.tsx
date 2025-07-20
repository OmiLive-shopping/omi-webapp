import React from 'react';
import clsx from 'clsx';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
};