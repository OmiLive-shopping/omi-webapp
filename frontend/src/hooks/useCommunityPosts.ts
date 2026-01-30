// src/hooks/useCommunityPosts.ts
import { useState, useEffect, useCallback } from 'react';
import {apiClient} from '../lib/api-Client'; // Your existing API client
import { API_ENDPOINTS } from '../api/endpoints';

export interface User {
  id: string;
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface Comment {
  id: string;
  userId: string;
  comment: string;
  likes: number;
  createdAt: string;
  user: User;
}

export interface Post {
  id: string;
  userId: string;
  postDescription: string;
  postImage?: string | null;
  likes: number;
  createdAt: string;
  user: User;
  comments: Comment[];
}

export const useCommunityPosts = (loggedInUserId?: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const limit = 5;

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (!loggedInUserId) {
        setPosts([]);
        setError('User not logged in');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const currentSkip = reset ? 0 : skip;

        const response = await apiClient.get<Post[]>(
          API_ENDPOINTS.posts.list(limit, currentSkip)
        );

        if (!Array.isArray(response)) {
          throw new Error('Invalid response from server');
        }

        // If reset, replace posts; otherwise append and prevent duplicates
        setPosts(prev =>
          reset
            ? response
            : [
                ...prev,
                ...response.filter(r => !prev.some(p => p.id === r.id)),
              ]
        );

        setSkip(currentSkip + response.length);
        setError(null);
      } catch (err: any) {
        console.error('[FETCH POSTS ERROR]', err);
        setError(err.message || 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    },
    [loggedInUserId, skip]
  );

  // Fetch initial posts
  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  const loadMore = () => fetchPosts(false);

  return { posts, loading, error, loadMore };
};
