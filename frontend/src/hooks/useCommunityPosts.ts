import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { useAuthState } from '@/lib/auth-client';

export interface UserPost {
  id: string;
  userId: string;
  postDescription: string;
  likes: number;
  comments: { id: string; content: string }[];
  createdAt: string;
}

export function useCommunityPosts() {
  const { user: authUser, isAuthenticated } = useAuthState();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    if (!isAuthenticated || !authUser) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(
        API_ENDPOINTS.posts.list(authUser.username)
      );

      if (response.success && Array.isArray(response.data)) {
        setPosts(response.data);
      } else {
        setError(response.message || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Posts fetch error:', err);
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [authUser, isAuthenticated]);

  return { posts, setPosts, loading, error, refetch: fetchPosts };
}


