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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 5;

  // ---------------- Fetch Posts ----------------
  const fetchPosts = useCallback(
    async (reset = false) => {
      try {
        reset ? setLoading(true) : setLoadingMore(true);
        setError(null);

        const currentSkip = reset ? 0 : skip;

        const response = await apiClient.get<UserPost[]>(
          API_ENDPOINTS.posts.list(LIMIT, currentSkip)
        );

        if (reset) {
          setPosts(response);
        } else {
          setPosts(prev => [...prev, ...response]);
        }

        if (response.length < LIMIT) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        setSkip(currentSkip + LIMIT);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'Failed to fetch posts'
        );
      } finally {
        reset ? setLoading(false) : setLoadingMore(false);
      }
    },
    [skip]
  );

  // ---------------- Load More ----------------
  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    await fetchPosts(false);
  };

  // ---------------- Search Posts (Keyword + Semantic) ----------------
  const searchPosts = async (
    query: string,
    mode: 'keyword' | 'semantic' = 'keyword'
  ) => {
    if (!query.trim()) {
      setError('Search query cannot be empty');
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.get<UserPost[]>(
        API_ENDPOINTS.posts.search(query, mode)
      );

      setPosts(response);
      setHasMore(false); // disable load more during search
      setError(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to search posts'
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Add Post ----------------
  const addPost = async (
    postDescription: string,
    postImage?: string | null
  ) => {
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

  // ---------------- Add Comment ----------------
  const addComment = async (postId: string, comment: string) => {
    if (!comment?.trim()) {
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
      setError(
        err?.response?.data?.errors?.[0]?.message ||
          err?.response?.data?.message ||
          'Failed to add comment'
      );
    }
  };

  // ---------------- Like Post ----------------
  const likePost = async (postId: string) => {
    try {
      const response = await apiClient.patch<{ likes: number }>(
        API_ENDPOINTS.posts.like(postId)
      );

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes: response.likes }
            : p
        )
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to like post'
      );
    }
  };

  // ---------------- Like Comment ----------------
  const likeComment = async (
    postId: string,
    commentId: string
  ) => {
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
    fetchPosts(true);
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    searchPosts,
    addPost,
    likePost,
    addComment,
    likeComment,
  };
}
