// hooks/useCommunityPosts.ts
/*import { useState, useEffect, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

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

  /** ---------------- Fetch posts from backend ---------------- */
/*  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(API_ENDPOINTS.posts.list());

      // Your API returns array directly
      if (Array.isArray(response)) {
        setPosts(response);
      } else {
        setError('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  /** ---------------- Add a new post ---------------- */
  /*const addPost = async (postDescription: string, postImage?: string | null) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.posts.create(), {
        postDescription,
        postImage,
      });

      // Assuming backend returns the created post object
      if (response && response.id) {
        setPosts(prev => [response, ...prev]);
        return response as UserPost;
      }
    } catch (err) {
      console.error('Failed to add post', err);
    }
  };

  /** ---------------- Like a post ---------------- */
  /*const likePost = async (postId: string) => {
    try {
      await apiClient.patch(API_ENDPOINTS.posts.like(postId));
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
      );
    } catch (err) {
      console.error('Failed to like post', err);
    }
  };

  /** ---------------- Add a comment ---------------- */
  /*const addComment = async (postId: string, comment: string) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.comments.create(), {
        postId,
        comment,
      });

      if (response && response.id) {
        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, comments: [...p.comments, response] }
              : p
          )
        );
        return response;
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  /** ---------------- Like a comment ---------------- */
  /*const likeComment = async (postId: string, commentId: string) => {
    try {
      await apiClient.patch(API_ENDPOINTS.comments.like(commentId));

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map(c =>
                  c.id === commentId ? { ...c, likes: c.likes + 1 } : c
                ),
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like comment', err);
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
    addPost,
    likePost,
    addComment,
    likeComment,
  };
}
  */


/* new code for testing communityposts */
// hooks/useCommunityPosts.ts
/*
import { useState, useEffect, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

/** Comment type *//*
export interface UserComment {
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
}

/** Post type *//*
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
  comments: UserComment[];
}

export function useCommunityPosts() {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** ---------------- Fetch posts from backend ---------------- */
  /*const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<UserPost[]>(API_ENDPOINTS.posts.list());

      if (Array.isArray(response)) {
        setPosts(response);
      } else {
        setError('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  /** ---------------- Add a new post ---------------- */
  /*const addPost = async (postDescription: string, postImage?: string | null) => {
    try {
      const response = await apiClient.post<UserPost>(API_ENDPOINTS.posts.create(), {
        postDescription,
        postImage,
      });

      if (response && response.id) {
        setPosts(prev => [response, ...prev]);
        return response;
      }
    } catch (err) {
      console.error('Failed to add post', err);
    }
  };

  /** ---------------- Like a post ---------------- */
  /*const likePost = async (postId: string) => {
    try {
      await apiClient.patch(API_ENDPOINTS.posts.like(postId));
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
      );
    } catch (err) {
      console.error('Failed to like post', err);
    }
  };

  /** ---------------- Add a comment ---------------- */
  /*const addComment = async (postId: string, comment: string) => {
    try {
      const response = await apiClient.post<UserComment>(API_ENDPOINTS.comments.create(), {
        postId,
        comment,
      });

      if (response && response.id) {
        setPosts(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, comments: [...p.comments, response] } : p
          )
        );
        return response;
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  /** ---------------- Like a comment ---------------- */
  /*const likeComment = async (postId: string, commentId: string) => {
    try {
      await apiClient.patch(API_ENDPOINTS.comments.like(commentId));

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map(c =>
                  c.id === commentId ? { ...c, likes: c.likes + 1 } : c
                ),
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like comment', err);
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
    addPost,
    likePost,
    addComment,
    likeComment,
  };
}
*/

/* new code for comments */
// hooks/useCommunityPosts.ts
// hooks/useCommunityPosts.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

/** ---------------------- Types ---------------------- */
export interface UserComment {
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
}

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
  comments: UserComment[];
}

/** ---------------------- Hook ---------------------- */
export function useCommunityPosts() {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** ---------------- Fetch posts ---------------- */
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<UserPost[]>(API_ENDPOINTS.posts.list());

      if (Array.isArray(response)) {
        setPosts(response);
      } else {
        setError('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  /** ---------------- Add a post ---------------- */
  const addPost = async (postDescription: string, postImage?: string | null, userId?: string) => {
    if (!userId || !postDescription.trim()) return;

    try {
      const response = await apiClient.post<UserPost>(API_ENDPOINTS.posts.create(), {
        postDescription,
        postImage: postImage || null,
        userId,
      });

      if (response && response.id) {
        setPosts(prev => [response, ...prev]); // immediate UI update
        return response;
      }
    } catch (err) {
      console.error('Failed to add post', err);
    }
  };

  /** ---------------- Like a post ---------------- */
  const likePost = async (postId: string) => {
    try {
      await apiClient.patch(API_ENDPOINTS.posts.like(postId));
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, likes: p.likes + 1 } : p)));
    } catch (err) {
      console.error('Failed to like post', err);
    }
  };

  /** ---------------- Add a comment ---------------- */
  const addComment = async (postId: string, comment: string, userId?: string) => {
    if (!userId || !comment.trim()) return;

    try {
      const response = await apiClient.post<UserComment>(API_ENDPOINTS.comments.create(), {
        postId,
        comment,
        userId,
      });

      if (response && response.id) {
        setPosts(prev =>
          prev.map(p => (p.id === postId ? { ...p, comments: [...p.comments, response] } : p))
        );
        return response;
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  /** ---------------- Like a comment ---------------- */
  const likeComment = async (postId: string, commentId: string) => {
    try {
      await apiClient.patch(API_ENDPOINTS.comments.like(commentId));
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map(c =>
                  c.id === commentId ? { ...c, likes: c.likes + 1 } : c
                ),
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like comment', err);
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
    addPost,
    likePost,
    addComment,
    likeComment,
  };
}
