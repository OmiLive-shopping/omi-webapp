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

  // Fetch posts (reset = true means start from page 1)
  const fetchPosts = useCallback(
    async (reset = false) => {
      if (!loggedInUserId) return;

      try {
        setLoading(true);

        const currentSkip = reset ? 0 : skip;

        const newPosts = await apiClient.get<Post[]>("/posts", {
          params: { limit, skip: currentSkip }
        });

        // Merge posts correctly
        setPosts(prev =>
          reset
            ? newPosts
            : [...prev, ...newPosts.filter(p => !prev.some(x => x.id === p.id))]
        );

        // Update skip only based on new posts
        setSkip(currentSkip + newPosts.length);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch posts");
      } finally {
        setLoading(false);
      }
    },
    [loggedInUserId] // ❗ skip removed to prevent infinite resets
  );

  // Fetch posts when user logs in or changes
  useEffect(() => {
    if (loggedInUserId) {
      setPosts([]);   // clear old posts
      setSkip(0);     // reset pagination
      fetchPosts(true);
    }
  }, [loggedInUserId, fetchPosts]);

  // Load more posts
  const loadMore = () => fetchPosts(false);

  // Determine if more posts exist
  const hasMore = posts.length > 0 && posts.length % limit === 0;

  return {
    posts,
    loading,
    error,
    loadMore,
    hasMore
  };
};
