import React from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';
import { Button } from '@/components/ui';

const HomePage: React.FC = () => {
  usePageTitle('Home');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to OMI Live</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Your platform for live streaming and e-commerce.
      </p>
      <div className="flex gap-4">
        <Link to="/ui-showcase">
          <Button>View UI Components</Button>
        </Link>
        <Link to="/products">
          <Button variant="secondary">Browse Products</Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;