import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, PaginatedResponse, ApiResponse } from '@/lib/api';
import { ExtendedStreamInfo, Product, User } from '@/lib/mock-api/mock-data';

const MockApiDebugPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'streams' | 'products' | 'users' | 'auth'>('streams');

  // Test queries
  const streamsQuery = useQuery({
    queryKey: ['debug', 'streams'],
    queryFn: () => apiClient.get<PaginatedResponse<ExtendedStreamInfo>>('/streams', {
      params: { page: 1, pageSize: 5, isLive: true }
    }),
  });

  const productsQuery = useQuery({
    queryKey: ['debug', 'products'],
    queryFn: () => apiClient.get<PaginatedResponse<Product>>('/products', {
      params: { page: 1, pageSize: 5, featured: true }
    }),
  });

  const usersQuery = useQuery({
    queryKey: ['debug', 'users'],
    queryFn: () => apiClient.get<ApiResponse<User>>('/users/profile'),
    enabled: selectedTab === 'users',
  });

  const testAuth = async () => {
    try {
      const result = await apiClient.post('/auth/login', {
        email: 'demo@example.com',
        password: 'password123'
      });
      console.log('Login successful:', result);
      alert('Login successful! Check console for details.');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed! Check console for details.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Mock API Debug Page
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The mock API is {import.meta.env.VITE_USE_MOCK_API === 'true' ? 
              <span className="text-green-600 font-semibold">ENABLED</span> : 
              <span className="text-red-600 font-semibold">DISABLED</span>
            }
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Toggle by setting VITE_USE_MOCK_API=true in .env.development
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          {(['streams', 'products', 'users', 'auth'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === tab
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {selectedTab === 'streams' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Live Streams</h2>
              {streamsQuery.isLoading && <p>Loading streams...</p>}
              {streamsQuery.error && <p className="text-red-600">Error: {streamsQuery.error.message}</p>}
              {streamsQuery.data && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Total: {streamsQuery.data.total} streams
                  </p>
                  <div className="space-y-4">
                    {streamsQuery.data.data.map((stream) => (
                      <div key={stream.id} className="border dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold">{stream.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {stream.category} • {stream.viewerCount} viewers • 
                          {stream.isLive ? ' 🔴 LIVE' : ' Offline'}
                        </p>
                        <p className="text-sm mt-2">{stream.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'products' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Featured Products</h2>
              {productsQuery.isLoading && <p>Loading products...</p>}
              {productsQuery.error && <p className="text-red-600">Error: {productsQuery.error.message}</p>}
              {productsQuery.data && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Total: {productsQuery.data.total} products
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productsQuery.data.data.map((product) => (
                      <div key={product.id} className="border dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-lg font-bold text-primary-600">${product.price}</p>
                        {product.comparePrice && (
                          <p className="text-sm text-gray-500 line-through">${product.comparePrice}</p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {product.category} • {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'users' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">User Profile</h2>
              {usersQuery.isLoading && <p>Loading user profile...</p>}
              {usersQuery.error && (
                <div>
                  <p className="text-red-600 mb-4">Error: {usersQuery.error.message}</p>
                  <p className="text-sm text-gray-600">
                    You need to login first to see profile data.
                  </p>
                </div>
              )}
              {usersQuery.data && (
                <div className="space-y-2">
                  <p><strong>Username:</strong> {usersQuery.data.data.username}</p>
                  <p><strong>Email:</strong> {usersQuery.data.data.email}</p>
                  <p><strong>Role:</strong> {usersQuery.data.data.role}</p>
                  <p><strong>Followers:</strong> {usersQuery.data.data.followerCount}</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'auth' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Authentication Test</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Test the mock authentication endpoints
              </p>
              <button
                onClick={testAuth}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Test Login
              </button>
              <p className="text-sm text-gray-500 mt-4">
                This will attempt to login with demo@example.com
              </p>
            </div>
          )}
        </div>

        {/* Raw Data Display */}
        <div className="mt-8 bg-gray-900 rounded-lg p-4">
          <h3 className="text-white font-mono text-sm mb-2">Raw API Response:</h3>
          <pre className="text-green-400 font-mono text-xs overflow-x-auto">
            {selectedTab === 'streams' && streamsQuery.data && 
              JSON.stringify(streamsQuery.data, null, 2)}
            {selectedTab === 'products' && productsQuery.data && 
              JSON.stringify(productsQuery.data, null, 2)}
            {selectedTab === 'users' && usersQuery.data && 
              JSON.stringify(usersQuery.data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MockApiDebugPage;