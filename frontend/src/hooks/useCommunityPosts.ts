import { useState, useEffect } from "react";
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

  const fetchPosts = async () => {
    if (!loggedInUserId) return;
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: Post[] }>("/posts");
      setPosts(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInUserId) fetchPosts();
  }, [loggedInUserId]);

  return { posts, loading, error, fetchPosts };
};
