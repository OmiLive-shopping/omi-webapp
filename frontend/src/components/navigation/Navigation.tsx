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
    username?: string;
    avatar?: string;
    role?: string;
    brandSlug?: string;
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
    <div className="relative">
      {/* Promotional Banner - Positioned absolutely to overlay */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <PromoBanner 
          message="THROUGH APRIL 21, FREE SHIPPING"
          ctaText="LEARN MORE"
          ctaLink="/promotions"
          dismissible={true}
          variant="default"
        />
      </div>

      {/* Main Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-28">
            {/* Left side - Logo and Links */}
            <div className="flex items-center h-full">
              {/* Logo */}
              <NavigationLogo />

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center h-full ml-10">
                <Link
                  to="/products"
                  className={clsx(
                    "flex items-center h-full px-5 text-lg font-medium transition-colors border-b-3",
                    isActiveLink('/products')
                      ? "text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300"
                  )}
                >
                  Shop
                </Link>
                <Link
                  to="/live-streams"
                  className={clsx(
                    "flex items-center h-full px-5 text-lg font-medium transition-colors border-b-3",
                    isActiveLink('/live-streams')
                      ? "text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300"
                  )}
                >
                  Livestreams
                </Link>
                <Link
                  to="/about"
                  className={clsx(
                    "flex items-center h-full px-5 text-lg font-medium transition-colors border-b-3",
                    isActiveLink('/about')
                      ? "text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300"
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
    </div>
  );
};

export default Navigation;