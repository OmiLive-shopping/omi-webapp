import { Outlet } from 'react-router-dom';
import Navigation from '../navigation/Navigation';

interface LayoutProps {
  children?: React.ReactNode;
  type?: 'mobile' | 'responsive';
}

const Layout = ({ children, type }: LayoutProps) => {
  const layoutType = type ?? 'responsive';

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <Navigation />
      <main className={`${layoutType === 'mobile' ? 'pb-16' : ''}`}>
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
