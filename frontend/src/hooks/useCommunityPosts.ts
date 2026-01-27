// frontend/src/hooks/useCommunityPosts.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { postSchema, commentSchema } from '@/lib/validation';

/** ---------------------- Types ---------------------- */
export interface UserComment {
  id: string;
  postId: string;
  comment: string;
  userId: string;
  likes: number;
  createdAt: string;
}

export interface UserPost {
  id: string;
  postDescription: string;
  postImage?: string | null;
  userId: string;
  likes: number;
  createdAt: string;
  comments: UserComment[];
}

/** ---------------------- Hook ---------------------- */
export function useCommunityPosts(loggedInUserId?: string) {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** validation errors per input */
  const [postError, setPostError] = useState<string | null>(null);
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});

  /** ---------------- Fetch posts ---------------- */
  const fetchPosts = useCallback(async () => {
    if (!loggedInUserId) {
      setPosts([]);
      setError('User not logged in');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get<UserPost[]>(API_ENDPOINTS.posts.list());
      setPosts(Array.isArray(response) ? response : []);
      setError(null);
    } catch {
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [loggedInUserId]);

  /** ---------------- Add post ---------------- */
  const addPost = async (postDescription: string, postImage?: string | null) => {
    setPostError(null);
    if (!loggedInUserId) {
      setPostError('User not logged in');
      return;
    }

    const result = postSchema.safeParse({ postDescription, postImage });
    if (!result.success) {
      setPostError(result.error.format().postDescription?._errors[0] || 'Invalid post');
      return;
    }

    try {
      const response = await apiClient.post<UserPost>(API_ENDPOINTS.posts.create(), {
        postDescription,
        postImage: postImage || null,
        userId: loggedInUserId,
      });
      if (response && response.id) setPosts(prev => [response, ...prev]);
    } catch {
      setPostError('Failed to add post');
    }
  };

  /** ---------------- Add comment ---------------- */
  const addComment = async (postId: string, comment: string) => {
    setCommentErrors(prev => ({ ...prev, [postId]: '' }));
    if (!loggedInUserId) {
      setCommentErrors(prev => ({ ...prev, [postId]: 'User not logged in' }));
      return;
    }

    const result = commentSchema.safeParse({ comment });
    if (!result.success) {
      setCommentErrors(prev => ({
        ...prev,
        [postId]: result.error.format().comment?._errors[0] || 'Invalid comment',
      }));
      return;
    }

    try {
      const response = await apiClient.post<UserComment>(API_ENDPOINTS.comments.create(), {
        postId,
        comment,
        userId: loggedInUserId,
      });
      if (response && response.id) {
        setPosts(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, comments: [...p.comments, response] } : p
          )
        );
      }
    } catch {
      setCommentErrors(prev => ({ ...prev, [postId]: 'Failed to add comment' }));
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    postError,
    commentErrors,
    addPost,
    addComment,
    refetch: fetchPosts,
  };
}
