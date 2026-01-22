import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

/**
 * Frontend representation of a Post from the backend
 */
export interface UserPost {
  id: string;
  userId: string;
  postDescription: string;
  postImage?: string | null;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  comments: {
    id: string;
    userId: string;
    comment: string;
    likes: number;
    createdAt: string;
    user: {
      id: string;
      username: string;
      name?: string | null;
      avatarUrl?: string | null;
    };
  }[];
}

export function useCommunityPosts() {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(API_ENDPOINTS.posts.list());

      if (response.success && Array.isArray(response.data)) {
        setPosts(response.data);
      } else {
        setError(response.message || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Community posts fetch error:', err);
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // Add, update, or remove posts locally
  const addPost = (newPost: UserPost) => setPosts((prev) => [newPost, ...prev]);
  const updatePost = (updatedPost: UserPost) =>
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  const removePost = (postId: string) =>
    setPosts((prev) => prev.filter((p) => p.id !== postId));

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
    setPosts,
    addPost,
    updatePost,
    removePost,
  };
}
