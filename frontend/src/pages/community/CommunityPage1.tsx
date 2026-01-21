import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useCommunityPosts, UserPost } from '@/hooks/useCommunityPosts';
import { useProfile } from '@/hooks/useProfile';
// import { apiClient } from '@/lib/api-client'; // keep commented since we're not saving

const CommunityPage: React.FC = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { posts, setPosts, loading, error } = useCommunityPosts();

  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentMap, setNewCommentMap] = useState<{ [postId: string]: string }>({});

  const handleAddPost = async () => {
    if (!newPostContent.trim() || !profile) return;

    // Commented out saving posts
    /*
    const response = await apiClient.post('/posts', {
      userId: profile.id,
      postDescription: newPostContent,
    });

    if (response.success && response.data) {
      setPosts([response.data, ...posts]);
      setNewPostContent('');
    }
    */
  };

  const handleCommentChange = (postId: string, value: string) => {
    setNewCommentMap(prev => ({ ...prev, [postId]: value }));
  };

  const handleAddComment = async (postId: string) => {
    const commentContent = newCommentMap[postId]?.trim();
    if (!commentContent || !profile) return;

    // Commented out saving comments
    /*
    const response = await apiClient.post(`/comments`, {
      postId,
      userId: profile.id,
      content: commentContent,
    });

    if (response.success && response.data) {
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, comments: [...post.comments, response.data] }
          : post
      ));
      setNewCommentMap(prev => ({ ...prev, [postId]: '' }));
    }
    */
  };

  if (loading || profileLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!profile) return <p>User not logged in.</p>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">Community Page</h1>

      {/* Add Post */}
      <div className="mb-6">
        <textarea
          className="w-full p-2 border rounded-md"
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

      {/* Display Posts */}
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        posts.map(post => (
          <div key={post.id} className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm">
            <p>{post.postDescription}</p>
            <div className="flex space-x-4 mt-2 text-gray-500">
              <div className="flex items-center space-x-1">
                <Heart size={16} /> <span>{post.comments.length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ThumbsUp size={16} /> <span>{post.likes}</span>
              </div>
            </div>

            {/* Add Comment */}
            <div className="mt-2">
              <textarea
                className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Write a comment..."
                value={newCommentMap[post.id] || ''}
                onChange={e => handleCommentChange(post.id, e.target.value)}
              />
              <button
                className="bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
                onClick={() => handleAddComment(post.id)}
              >
                Add Comment
              </button>
            </div>

            {/* Existing Comments */}
            {post.comments.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {post.comments.map(c => (
                  <p key={c.id}>- {c.content}</p>
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

