import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { useAuthState } from '@/lib/auth-client';

export function useCommunityPosts() {
  const { isAuthenticated } = useAuthState();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.posts.list());

      if (response.success && Array.isArray(response.data)) {
        setPosts(response.data);
      } else {
        setError(response.message || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []); // 👈 no need to depend on auth unless posts are private

  return {
    posts,
    setPosts,
    loading,
    error,
    refetch: fetchPosts,
  };
}

