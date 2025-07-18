import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { Home, Settings, User } from 'lucide-react';
import clsx from 'clsx';

// Test Zustand store
interface TestStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useTestStore = create<TestStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Test component
const DependencyTest: React.FC = () => {
  const { count, increment, decrement } = useTestStore();
  
  // Test React Query
  const { data, isLoading } = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { message: 'All dependencies working!' };
    },
  });

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Dependency Test Component
      </h2>
      
      {/* Test Lucide React icons */}
      <div className="flex gap-4 mb-4">
        <Home className="w-6 h-6 text-primary-500" />
        <Settings className="w-6 h-6 text-primary-500" />
        <User className="w-6 h-6 text-primary-500" />
      </div>
      
      {/* Test Zustand */}
      <div className="mb-4">
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Zustand Counter: {count}
        </p>
        <div className="flex gap-2">
          <button
            onClick={increment}
            className={clsx(
              'px-4 py-2 rounded-md transition',
              'bg-primary-500 hover:bg-primary-600 text-white'
            )}
          >
            Increment
          </button>
          <button
            onClick={decrement}
            className={clsx(
              'px-4 py-2 rounded-md transition',
              'bg-gray-500 hover:bg-gray-600 text-white'
            )}
          >
            Decrement
          </button>
        </div>
      </div>
      
      {/* Test React Query */}
      <div>
        <p className="text-gray-700 dark:text-gray-300">
          React Query Status: {isLoading ? 'Loading...' : data?.message}
        </p>
      </div>
    </div>
  );
};

export default DependencyTest;