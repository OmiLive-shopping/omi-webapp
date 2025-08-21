import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { MobileMenuProps } from './MobileMenu.types';

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  isAuthenticated = false,
  userRole,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit
}) => {
  const location = useLocation();

  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="px-4 pt-2 pb-3 space-y-1">
        <Link
          to="/products"
          className={clsx(
            "block px-3 py-2 rounded-md text-base font-medium",
            isActiveLink('/products')
              ? "bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          onClick={onClose}
        >
          Shop
        </Link>
        
        <Link
          to="/live-streams"
          className={clsx(
            "block px-3 py-2 rounded-md text-base font-medium",
            isActiveLink('/live-streams')
              ? "bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          onClick={onClose}
        >
          Livestreams
        </Link>
        
        <Link
          to="/about"
          className={clsx(
            "block px-3 py-2 rounded-md text-base font-medium",
            isActiveLink('/about')
              ? "bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          onClick={onClose}
        >
          About
        </Link>
        
        {isAuthenticated && userRole === 'streamer' && (
          <Link
            to="/studio"
            className={clsx(
              "block px-3 py-2 rounded-md text-base font-medium",
              isActiveLink('/studio')
                ? "bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            onClick={onClose}
          >
            Creator Studio
          </Link>
        )}
      </div>

      {onSearchSubmit && (
        <div className="px-4 pb-3">
          <form onSubmit={onSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </form>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;