import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Video,
  ShoppingBag,
  Grid3X3,
  Search,
  X,
  ShoppingCart,
  Bell,
  ChevronDown,
  User as UserIcon,
  Package,
  Heart,
  Settings,
  LogOut,
  Menu,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'viewer' | 'streamer' | 'admin';
}

interface MainNavigationProps {
  user?: User | null;
  onLogout: () => void;
  onSearch: (query: string) => void;
  notificationCount?: number;
  cartItemCount?: number;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  user,
  onLogout,
  onSearch,
  notificationCount = 0,
  cartItemCount = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/streams', label: 'Live Streams', icon: Video },
    { path: '/products', label: 'Products', icon: ShoppingBag },
    { path: '/categories', label: 'Categories', icon: Grid3X3 }
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 flex-1">
              {/* Mobile Menu Toggle */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary-600" />
                <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-white">
                  OMI Live
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-1 ml-10">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive(item.path)
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-4">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="search"
                    placeholder="Search streams, products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                title="Shopping Cart"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              {user && (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  >
                    <Bell className="h-6 w-6" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                        {notificationCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                        </div>
                        
                        <a href="#" className="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <div className="flex items-start gap-3">
                            <Video className="h-5 w-5 mt-0.5 text-primary-500" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">Your favorite streamer is live!</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">2 minutes ago</p>
                            </div>
                          </div>
                        </a>
                        
                        <a href="#" className="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <div className="flex items-start gap-3">
                            <ShoppingBag className="h-5 w-5 mt-0.5 text-green-500" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">Flash sale on featured products</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">1 hour ago</p>
                            </div>
                          </div>
                        </a>
                        
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <Link
                            to="/notifications"
                            className="block px-4 py-2 text-center text-sm text-primary-600 hover:text-primary-500"
                            onClick={() => setIsNotificationOpen(false)}
                          >
                            View all notifications
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User Menu */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  >
                    {user.avatar ? (
                      <img className="h-8 w-8 rounded-full" src={user.avatar} alt={user.name} />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* User Menu Dropdown */}
                  {isUserMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <UserIcon className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                        {user.role === 'streamer' && (
                          <Link
                            to="/studio"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Creator Studio
                          </Link>
                        )}
                        <Link
                          to="/orders"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Orders
                        </Link>
                        <Link
                          to="/wishlist"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Wishlist
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
                        <div className="border-t border-gray-200 dark:border-gray-700"></div>
                        <button
                          onClick={() => {
                            onLogout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 lg:hidden">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">OMI Live</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <nav className="px-2 py-4">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 mb-1 rounded-md text-sm font-medium transition-colors',
                        isActive(item.path)
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {user && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  <div className="px-2 py-4">
                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</p>
                    <nav className="mt-3">
                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 mb-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      >
                        <UserIcon className="h-5 w-5" />
                        Profile
                      </Link>
                      {user.role === 'streamer' && (
                        <Link
                          to="/studio"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 mb-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                        >
                          <Video className="h-5 w-5" />
                          Creator Studio
                        </Link>
                      )}
                      <Link
                        to="/orders"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 mb-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      >
                        <Package className="h-5 w-5" />
                        Orders
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 mb-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      >
                        <Settings className="h-5 w-5" />
                        Settings
                      </Link>
                    </nav>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              {user ? (
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-3 py-2 text-center text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};