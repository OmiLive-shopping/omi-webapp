// pages/community/CommunityPage.tsx
import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useCommunityPosts, UserPost } from '@/hooks/useCommunityPosts';
import { useProfile } from '@/hooks/useProfile';

const CommunityPage: React.FC = () => {
  const { profile, loading: profileLoading } = useProfile();
  const {
    posts,
    loading,
    error,
    addPost,
    likePost,
    addComment,
    likeComment,
    searchPosts,
  } = useCommunityPosts();

  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentMap, setNewCommentMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  /** ---------------- Add a new post ---------------- */
  const handleAddPost = async () => {
    if (!profile) return;
    await addPost(newPostContent);
    setNewPostContent('');
  };

  /** ---------------- Add a comment ---------------- */
  const handleAddComment = async (postId: string) => {
    const commentContent = newCommentMap[postId]?.trim();
    if (!commentContent) return;
    await addComment(postId, commentContent);
    setNewCommentMap(prev => ({ ...prev, [postId]: '' }));
  };

  /** ---------------- Search posts ---------------- */
  const handleSearch = async () => {
    await searchPosts(searchQuery);
  };

  if (loading || profileLoading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">Community Page</h1>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      {/* Search Bar */}
      <div className="mb-4 flex space-x-2">
        <input
          type="text"
          className="flex-1 p-2 border rounded-md"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          onClick={handleSearch}
        >
          Search
        </button>
      </div>

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

      {/* Posts */}
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        posts.map((post: UserPost) => (
          <div
            key={post.id}
            className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm"
          >
            {/* Post content */}
            <p className="font-medium">{post.user.username}</p>
            <p>{post.postDescription}</p>

            {/* Likes & comments */}
            <div className="flex space-x-4 mt-2 text-gray-500">
              <button
                className="flex items-center space-x-1"
                onClick={() => likePost(post.id)}
              >
                <Heart size={16} /> <span>{post.likes}</span>
              </button>

              <div className="flex items-center space-x-1">
                <ThumbsUp size={16} /> <span>{post.comments.length}</span>
              </div>
            </div>

            {/* Add Comment */}
            <div className="mt-2">
              <textarea
                className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Write a comment..."
                value={newCommentMap[post.id] || ''}
                onChange={e =>
                  setNewCommentMap(prev => ({ ...prev, [post.id]: e.target.value }))
                }
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
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                {post.comments.map(c => (
                  <div key={c.id} className="flex justify-between items-center">
                    <p>
                      <span className="font-semibold">{c.user.username}:</span> {c.comment}
                    </p>
                    <button
                      className="flex items-center space-x-1 text-gray-400 hover:text-red-500"
                      onClick={() => likeComment(post.id, c.id)}
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
