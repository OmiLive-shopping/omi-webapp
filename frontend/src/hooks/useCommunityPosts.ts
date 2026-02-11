// src/hooks/useCommunityPosts.ts

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
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Failed to fetch posts'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPosts = async (query: string) => {
    if (!query.trim()) {
      setError('Search query cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get<UserPost[]>(
        API_ENDPOINTS.posts.search(query)
      );
      setPosts(response);
      setError(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Failed to search posts'
      );
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (postDescription: string, postImage?: string | null) => {
  if (!postDescription.trim()) {
    setError('Post content cannot be empty');
    return;
  }

  try {
    const response = await apiClient.post<UserPost>(
      API_ENDPOINTS.posts.create(),
      { postDescription, postImage }
    );

    setPosts(prev => [response, ...prev]);
    setError(null);

  } catch (err: any) {
    setError(
      err?.response?.data?.errors?.[0]?.message || 
      err?.response?.data?.message || 
      'Failed to add post'
    );
  }
};

  const addComment = async (postId: string, comment: string) => {
  // Frontend empty check
    if (!comment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
    const response = await apiClient.post<UserComment>(
      API_ENDPOINTS.comments.create(),
      { postId, comment }
      );

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments: [...p.comments, response] }
            : p
        )
      );

      setError(null);

    } catch (err: any) {
    // Extract backend validation errors (Zod)
      const backendErrors =
        err?.response?.data?.errors?.map((e: any) => e.message).join(', ') ||
        err?.response?.data?.message;

      setError(backendErrors || 'Failed to add comment');
    }
  };




  const likePost = async (postId: string) => {
    try {
      const response = await apiClient.patch<{ likes: number }>(
        API_ENDPOINTS.posts.like(postId)
      );

      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, likes: response.likes } : p
        )
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Failed to like post'
      );
    }
  };

  

  const likeComment = async (postId: string, commentId: string) => {
    try {
      const response = await apiClient.patch<UserComment>(
        API_ENDPOINTS.comments.like(commentId)
      );

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map(c =>
                  c.id === commentId ? response : c
                ),
              }
            : p
        )
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Failed to like comment'
      );
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
    searchPosts,
    addPost,
    likePost,
    addComment,
    likeComment,
  };
}
