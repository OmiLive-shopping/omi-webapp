import React from 'react';
import usePageTitle from '@/hooks/usePageTitle';
import DependencyTest from '@/components/common/DependencyTest';

const HomePage: React.FC = () => {
  usePageTitle('Home');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Home Page</h1>
      <DependencyTest />
    </div>
  );
};

export default HomePage;