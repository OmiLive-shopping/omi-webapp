import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

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
      if (!loggedInUserId) return;

      try {
        setLoading(true);

        const currentSkip = reset ? 0 : skip;

        const newPosts = await apiClient.get<Post[]>("/posts", {
          params: { limit, skip: currentSkip }
        });

        setPosts(prev =>
          reset
            ? newPosts
            : [...prev, ...newPosts.filter(p => !prev.some(x => x.id === p.id))]
        );

        setSkip(currentSkip + newPosts.length);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch posts");
      } finally {
        setLoading(false);
      }
    },
    [loggedInUserId, skip]
  );

  useEffect(() => {
    if (loggedInUserId) {
      setPosts([]);
      setSkip(0);
      fetchPosts(true);
    }
  }, [loggedInUserId, fetchPosts]);

  const loadMore = () => fetchPosts(false);

  const hasMore = posts.length > 0 && posts.length % limit === 0;

  return {
    posts,
    loading,
    error,
    loadMore,
    hasMore,
    fetchPosts
  };
};
