import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryStateHandler, PaginatedQueryHandler, LoadingSkeletons } from '@/components/query/QueryStateHandler';
import { 
  useStreamList, 
  useStreamDetail, 
  useStreamStart, 
  useStreamEnd 
} from '@/hooks/queries/useStreamQueries';
import { 
  useProductList, 
  useProductDetail, 
  useCartAdd, 
  useWishlistAdd 
} from '@/hooks/queries/useProductQueries';
import { 
  useUserProfile, 
  useUserDetail,
  useFollowUser,
  useUnfollowUser
} from '@/hooks/queries/useUserQueries';
import { queryKeys } from '@/lib/query-client';

export const QueryDebug: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('user-1');

  // Queries
  const streamsQuery = useStreamList({ isLive: true, pageSize: 5 });
  const streamDetailQuery = useStreamDetail(selectedStreamId, !!selectedStreamId);
  const productsQuery = useProductList({ featured: true, pageSize: 5 });
  const productDetailQuery = useProductDetail(selectedProductId, !!selectedProductId);
  const profileQuery = useUserProfile();
  const userDetailQuery = useUserDetail(selectedUserId);

  // Mutations
  const streamStartMutation = useStreamStart();
  const streamEndMutation = useStreamEnd();
  const cartAddMutation = useCartAdd();
  const wishlistAddMutation = useWishlistAdd();
  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();

  // Test data
  const testStreamData = {
    title: 'Test Stream ' + Date.now(),
    description: 'Testing TanStack Query implementation',
    category: 'Gaming',
    tags: ['test', 'debug'],
  };

  const testProduct = {
    id: 'test-' + Date.now(),
    name: 'Test Product',
    description: 'Testing product queries',
    price: 99.99,
    images: ['https://via.placeholder.com/150'],
    category: 'Test',
    tags: ['test'],
    inStock: true,
    featured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="p-4 space-y-4">
      {/* Query Client Stats */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Query Client Stats</h2>
          <div className="space-y-2 text-sm">
            <div>Active Queries: {queryClient.getQueryCache().getAll().length}</div>
            <div>Active Mutations: {queryClient.getMutationCache().getAll().length}</div>
            <div className="flex space-x-2 mt-4">
              <Button 
                size="sm" 
                onClick={() => queryClient.invalidateQueries()}
              >
                Invalidate All
              </Button>
              <Button 
                size="sm" 
                onClick={() => queryClient.clear()}
              >
                Clear Cache
              </Button>
              <Button 
                size="sm" 
                onClick={() => queryClient.refetchQueries()}
              >
                Refetch All
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Streams Section */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Streams Queries</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Stream List</h3>
            <PaginatedQueryHandler
              query={streamsQuery}
              loadingComponent={<LoadingSkeletons.List count={3} />}
            >
              {(data) => (
                <div className="space-y-2">
                  {data.data.map((stream) => (
                    <div 
                      key={stream.id}
                      className="p-2 bg-gray-100 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => setSelectedStreamId(stream.id)}
                    >
                      <div className="font-medium">{stream.title}</div>
                      <div className="text-sm text-gray-600">{stream.category}</div>
                    </div>
                  ))}
                  <div className="text-sm text-gray-500">
                    Total: {data.total} | Page: {data.page}/{data.totalPages}
                  </div>
                </div>
              )}
            </PaginatedQueryHandler>
          </div>

          {selectedStreamId && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Stream Detail</h3>
              <QueryStateHandler query={streamDetailQuery}>
                {(data) => (
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <pre className="text-xs">{JSON.stringify(data.data, null, 2)}</pre>
                  </div>
                )}
              </QueryStateHandler>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => streamStartMutation.mutate(testStreamData)}
              disabled={streamStartMutation.isPending}
            >
              {streamStartMutation.isPending ? 'Starting...' : 'Start Stream'}
            </Button>
            <Button
              size="sm"
              onClick={() => selectedStreamId && streamEndMutation.mutate(selectedStreamId)}
              disabled={!selectedStreamId || streamEndMutation.isPending}
            >
              {streamEndMutation.isPending ? 'Ending...' : 'End Stream'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Section */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Products Queries</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Product List</h3>
            <PaginatedQueryHandler
              query={productsQuery}
              loadingComponent={<LoadingSkeletons.List count={3} />}
            >
              {(data) => (
                <div className="space-y-2">
                  {data.data.map((product) => (
                    <div 
                      key={product.id}
                      className="p-2 bg-gray-100 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">${product.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </PaginatedQueryHandler>
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => cartAddMutation.mutate({ product: testProduct })}
              disabled={cartAddMutation.isPending}
            >
              {cartAddMutation.isPending ? 'Adding...' : 'Add to Cart'}
            </Button>
            <Button
              size="sm"
              onClick={() => wishlistAddMutation.mutate(testProduct)}
              disabled={wishlistAddMutation.isPending}
            >
              {wishlistAddMutation.isPending ? 'Adding...' : 'Add to Wishlist'}
            </Button>
          </div>
        </div>
      </Card>

      {/* User Section */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">User Queries</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">User Profile</h3>
            <QueryStateHandler 
              query={profileQuery}
              loadingComponent={<LoadingSkeletons.Text lines={3} />}
            >
              {(data) => (
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <div>Username: {data.data.username}</div>
                  <div>Email: {data.data.email}</div>
                  <div>Role: {data.data.role}</div>
                </div>
              )}
            </QueryStateHandler>
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">User Detail (ID: {selectedUserId})</h3>
            <QueryStateHandler query={userDetailQuery}>
              {(data) => (
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <div>Username: {data.data.username}</div>
                  <div>Followers: {data.data.followerCount || 0}</div>
                  <div>Following: {data.data.isFollowing ? 'Yes' : 'No'}</div>
                </div>
              )}
            </QueryStateHandler>
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => followUserMutation.mutate(selectedUserId)}
              disabled={followUserMutation.isPending}
            >
              {followUserMutation.isPending ? 'Following...' : 'Follow User'}
            </Button>
            <Button
              size="sm"
              onClick={() => unfollowUserMutation.mutate(selectedUserId)}
              disabled={unfollowUserMutation.isPending}
            >
              {unfollowUserMutation.isPending ? 'Unfollowing...' : 'Unfollow User'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Mutation States */}
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Recent Mutations</h2>
          <div className="space-y-2 text-sm">
            {queryClient.getMutationCache().getAll().slice(-5).map((mutation, i) => (
              <div key={i} className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <div>Key: {mutation.options.mutationKey?.join(', ') || 'N/A'}</div>
                <div>State: {mutation.state.status}</div>
                {mutation.state.error && (
                  <div className="text-red-500">Error: {mutation.state.error.message}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};