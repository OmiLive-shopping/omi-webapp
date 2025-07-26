import { Outlet } from 'react-router-dom';
import Navigation from '../navigation/Navigation';
// TODO: Replace with Better Auth
// import { useAuthStore } from '@/stores/authStore';

interface LayoutProps {
  children?: React.ReactNode;
  type?: 'mobile' | 'responsive';
}

const Layout = ({ children, type }: LayoutProps) => {
  const layoutType = type ?? 'responsive';
  // TODO: Replace with Better Auth
  // const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // const user = useAuthStore((state) => state.user);
  // const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = false; // Temporary placeholder
  const user = null as any; // Temporary placeholder
  const logout = () => {}; // Temporary placeholder

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <Navigation 
        isAuthenticated={isAuthenticated}
        user={user ? {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          email: user.email,
          avatar: user.avatar
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
