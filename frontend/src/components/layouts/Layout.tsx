import { Outlet } from 'react-router-dom';
import Navigation from '../navigation/Navigation';
import { useAuthState, signOut } from '@/lib/auth-client';

interface LayoutProps {
  children?: React.ReactNode;
  type?: 'mobile' | 'responsive';
}

const Layout = ({ children, type }: LayoutProps) => {
  const layoutType = type ?? 'responsive';
  const { isAuthenticated, user } = useAuthState();
  
  const logout = async () => {
    await signOut();
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <Navigation 
        isAuthenticated={isAuthenticated}
        user={user ? {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.name || '',
          email: user.email,
          avatar: user.avatarUrl,
          role: user.role
        } : undefined}
        onLogout={logout}
      />
      <main className={`${layoutType === 'mobile' ? 'pb-16' : ''}`}>
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
