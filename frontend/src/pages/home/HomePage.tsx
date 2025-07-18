import React from 'react';
import usePageTitle from '@/hooks/usePageTitle';

const HomePage: React.FC = () => {
  usePageTitle('Home');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Home Page</h1>
    </div>
  );
};

export default HomePage;