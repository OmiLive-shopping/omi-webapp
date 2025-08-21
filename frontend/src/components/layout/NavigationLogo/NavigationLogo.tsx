import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface NavigationLogoProps {
  className?: string;
}

export const NavigationLogo: React.FC<NavigationLogoProps> = ({ className }) => {
  return (
    <Link 
      to="/" 
      className={clsx(
        "flex-shrink-0 flex items-center",
        className
      )}
    >
      <span className="text-4xl font-bold text-gray-900 dark:text-white">
        OMI
      </span>
    </Link>
  );
};

export default NavigationLogo;