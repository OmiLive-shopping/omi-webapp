import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { PromoBanner } from '../layout/PromoBanner';
import { NavigationLogo } from '../layout/NavigationLogo';
import { SearchBar } from '../layout/SearchBar';
import { UserMenu } from '../layout/UserMenu';
import { MobileMenu } from '../layout/MobileMenu';

interface NavigationProps {
  isAuthenticated?: boolean;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  isAuthenticated = false,
  user,
  onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Promotional Banner */}
      <PromoBanner 
        message="THROUGH APRIL 21, FREE SHIPPING"
        ctaText="LEARN MORE"
        ctaLink="/promotions"
        dismissible={true}
        variant="default"
      />

      {/* Main Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Logo and Links */}
            <div className="flex items-center">
              {/* Logo */}
              <NavigationLogo />

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center ml-10 space-x-8">
                <Link
                  to="/products"
                  className={clsx(
                    "text-base font-medium transition-colors py-2",
                    isActiveLink('/products')
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  Shop
                </Link>
                <Link
                  to="/live-streams"
                  className={clsx(
                    "text-base font-medium transition-colors py-2",
                    isActiveLink('/live-streams')
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  Livestreams
                </Link>
                <Link
                  to="/about"
                  className={clsx(
                    "text-base font-medium transition-colors py-2",
                    isActiveLink('/about')
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  About
                </Link>
              </div>
            </div>

            {/* Right side - Search, Wishlist, User */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <SearchBar />

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="w-6 h-6" />
              </Link>

              {/* User Menu */}
              <UserMenu 
                isAuthenticated={isAuthenticated}
                user={user}
                onLogout={onLogout}
              />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <MobileMenu 
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isAuthenticated={isAuthenticated}
          userRole={user?.role}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearch}
        />
      </nav>
    </>
  );
};

export default Navigation;