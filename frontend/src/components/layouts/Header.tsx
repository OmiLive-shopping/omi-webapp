import clsx from 'clsx';
import { BiMoon, BiSun } from 'react-icons/bi';
import { Link, useLocation } from 'react-router-dom';

import Button from '../Button';
import { useTheme } from '@/hooks/useTheme';

const Header = ({ type }: { type: string }) => {
  const [theme, handleChange] = useTheme();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/live-streams', label: 'Live Streams' },
    { path: '/studio', label: 'Studio' },
    { path: '/products', label: 'Products' },
  ];

  return (
    <header
      className={clsx(
        'fixed top-0 z-50 w-full bg-white/10 px-0.5 py-1',
        'dark:bg-gray-700/10',
        'shadow-sm'
      )}
    >
      <div
        className={clsx(
          'flex items-center justify-between',
          'mx-auto h-14 px-3 md:px-1',
          type === 'responsive' ? 'max-w-5xl' : 'max-w-lg'
        )}
      >
        <div className="flex items-center gap-6">
          <Link to='/' className="text-xl font-bold text-gray-900 dark:text-white">
            OMI Live
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  location.pathname === item.path
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button
          variant='outline'
          className={clsx(
            'dark:border-white dark:text-white dark:hover:bg-gray-500',
            'hover:border-black hover:bg-gray-200',
            'border-black !p-2 text-black',
            'rounded-full transition hover:rotate-45'
          )}
          onClick={handleChange}
        >
          {theme === 'light' ? <BiMoon size={20} /> : <BiSun size={20} />}
        </Button>
      </div>
    </header>
  );
};

export default Header;
