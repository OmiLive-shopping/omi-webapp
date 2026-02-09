// hooks/useCommunityPosts.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

export interface UserComment {
  id: string;
  userId: string;
  comment: string;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface UserPost {
  id: string;
  userId: string;
  postDescription: string;
  postImage: string | null;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  comments: UserComment[];
}

export function useCommunityPosts() {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<UserPost[]>(API_ENDPOINTS.posts.list());
      setPosts(response);
    } catch (err) {
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPosts = async (query: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get<UserPost[]>(API_ENDPOINTS.posts.search(query));
      setPosts(response);
    } catch (err) {
      setError('Failed to search posts');
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (postDescription: string, postImage?: string | null, userId?: string) => {
    try {
      const response = await apiClient.post<UserPost>(API_ENDPOINTS.posts.create(), { postDescription, postImage });
      setPosts(prev => [response, ...prev]);
    } catch (err) {
      setError('Failed to add post');
    }
  };

  const likePost = async (postId: string) => {
    try {
      const response = await apiClient.patch<{ likes: number }>(API_ENDPOINTS.posts.like(postId));
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, likes: response.likes } : p))
      );
    } catch (err) {
      setError('Failed to like post');
    }
  };

  const addComment = async (postId: string, comment: string, userId?: string) => {
    try {
      const response = await apiClient.post<UserComment>(API_ENDPOINTS.comments.create(), { postId, comment });
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, comments: [...p.comments, response] } : p))
      );
    } catch (err) {
      setError('Failed to add comment');
    }
  };

  const likeComment = async (postId: string, commentId: string) => {
    try {
      const response = await apiClient.patch<{ likes: number }>(API_ENDPOINTS.comments.like(commentId));
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map(c => (c.id === commentId ? { ...c, likes: response.likes } : c)),
              }
            : p
        )
      );
    } catch (err) {
      setError('Failed to like comment');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, refetch: fetchPosts, searchPosts, addPost, likePost, addComment, likeComment };
}
