import React from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';

const HomePage: React.FC = () => {
  usePageTitle('Home');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to OMI Live</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Your platform for live streaming and e-commerce.
      </p>
      <div className="flex gap-4">
        <Link to="/products" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition">
          Browse Products
        </Link>
        <Link to="/schedule" className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition">
          View Schedule
        </Link>
      </div>
    </div>
  );
};

export default HomePage;