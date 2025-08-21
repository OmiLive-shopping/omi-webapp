import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthState, signOut } from '@/lib/auth-client';
import { Navigation } from './Navigation';

const Layout: React.FC = () => {
  const { isAuthenticated, user } = useAuthState();
  
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header */}
      <Navigation 
        isAuthenticated={isAuthenticated}
        user={user ? {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.name || '',
          email: user.email,
          avatar: user.avatarUrl,
          role: user.role
        } : undefined}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2024 OMI Live. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;