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
<<<<<<< HEAD
  const { isAuthenticated } = useAuthState();
=======
  const { user: authUser, isAuthenticated } = useAuthState();
>>>>>>> 1ebd541cce622c48c3d099d4a9f80d1c1e828e74
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
<<<<<<< HEAD
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.posts.list());
=======
    if (!isAuthenticated || !authUser) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(
        API_ENDPOINTS.posts.list(authUser.username)
      );
>>>>>>> 1ebd541cce622c48c3d099d4a9f80d1c1e828e74

      if (response.success && Array.isArray(response.data)) {
        setPosts(response.data);
      } else {
        setError(response.message || 'Failed to fetch posts');
      }
    } catch (err) {
<<<<<<< HEAD
      console.error(err);
=======
      console.error('Posts fetch error:', err);
>>>>>>> 1ebd541cce622c48c3d099d4a9f80d1c1e828e74
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
<<<<<<< HEAD
  }, [isAuthenticated]);

  return { posts, setPosts, loading, error, refetch: fetchPosts };
}
=======
  }, [authUser, isAuthenticated]);

  return { posts, setPosts, loading, error, refetch: fetchPosts };
}


>>>>>>> 1ebd541cce622c48c3d099d4a9f80d1c1e828e74
