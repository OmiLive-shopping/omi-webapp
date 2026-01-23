import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { useProfile } from '@/hooks/useProfile';

const CommunityPage: React.FC = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { posts, setPosts, loading, error } = useCommunityPosts();

  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentMap, setNewCommentMap] = useState<Record<string, string>>({});

  /* -------------------- POSTS -------------------- */

  const handleAddPost = async () => {
    if (!newPostContent.trim() || !profile) return;

    const response = await apiClient.post(API_ENDPOINTS.posts.create(), {
      postDescription: newPostContent,
    });

    if (response.success && response.data) {
      setPosts(prev => [response.data, ...prev]);
      setNewPostContent('');
    }
  };

  const handleLikePost = async (postId: string) => {
    await apiClient.patch(API_ENDPOINTS.posts.like(postId));

    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, likes: p.likes + 1 } : p,
      ),
    );
  };

  /* -------------------- COMMENTS -------------------- */

  const handleCommentChange = (postId: string, value: string) => {
    setNewCommentMap(prev => ({ ...prev, [postId]: value }));
  };

  const handleAddComment = async (postId: string) => {
    const comment = newCommentMap[postId]?.trim();
    if (!comment || !profile) return;

    const response = await apiClient.post(API_ENDPOINTS.comments.create(), {
      postId,
      comment,
    });

    if (response.success && response.data) {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments: [...p.comments, response.data] }
            : p,
        ),
      );

      setNewCommentMap(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    await apiClient.patch(API_ENDPOINTS.comments.like(commentId));

    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.map(c =>
                c.id === commentId
                  ? { ...c, likes: c.likes + 1 }
                  : c,
              ),
            }
          : p,
      ),
    );
  };

  /* -------------------- UI STATES -------------------- */

  if (loading || profileLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!profile) return <p>User not logged in.</p>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-6">Community</h1>

      {/* CREATE POST */}
      <div className="mb-6">
        <textarea
          className="w-full p-3 border rounded-md"
          placeholder="What's on your mind?"
          value={newPostContent}
          onChange={e => setNewPostContent(e.target.value)}
        />
        <button
          className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          onClick={handleAddPost}
        >
          Submit Post
        </button>
      </div>

      {/* POSTS */}
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        posts.map(post => (
          <div
            key={post.id}
            className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm"
          >
            {/* POST HEADER */}
            <p className="font-semibold">{post.user.username}</p>
            <p className="mt-1">{post.postDescription}</p>

            {/* POST ACTIONS */}
            <div className="flex items-center space-x-6 mt-3 text-gray-500">
              <button
                className="flex items-center space-x-1 hover:text-red-500"
                onClick={() => handleLikePost(post.id)}
              >
                <Heart size={16} />
                <span>{post.likes}</span>
              </button>

              <div className="flex items-center space-x-1">
                <MessageCircle size={16} />
                <span>{post.comments.length}</span>
              </div>
            </div>

            {/* ADD COMMENT */}
            <div className="mt-4">
              <textarea
                className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Write a comment..."
                value={newCommentMap[post.id] || ''}
                onChange={e =>
                  handleCommentChange(post.id, e.target.value)
                }
              />
              <button
                className="bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
                onClick={() => handleAddComment(post.id)}
              >
                Add Comment
              </button>
            </div>

            {/* COMMENTS */}
            {post.comments.length > 0 && (
              <div className="mt-4 space-y-2 text-sm">
                {post.comments.map(c => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center"
                  >
                    <p>
                      <span className="font-semibold">
                        {c.user.username}:
                      </span>{' '}
                      {c.comment}
                    </p>

                    <button
                      className="flex items-center space-x-1 text-gray-400 hover:text-red-500"
                      onClick={() =>
                        handleLikeComment(post.id, c.id)
                      }
                    >
                      <Heart size={14} />
                      <span>{c.likes}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default CommunityPage;
