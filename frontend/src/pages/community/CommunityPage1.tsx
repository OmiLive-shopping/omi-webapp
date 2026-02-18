import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useCommunityPosts, UserPost } from '@/hooks/useCommunityPosts';
import { useProfile } from '@/hooks/useProfile';
import { Toaster, toast } from 'react-hot-toast';  // Import Toaster and toast

const CommunityPage: React.FC = () => {
  const { profile, loading: profileLoading } = useProfile();
  const {
    posts,
    loading,
    loadingMore,
    error,
    addPost,
    likePost,
    addComment,
    likeComment,
    searchPosts,
    loadMore,
    hasMore,
  } = useCommunityPosts();

  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentMap, setNewCommentMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  /** ---------------- Add a new post ---------------- */
  const handleAddPost = async () => {
    if (!profile) return; // safeguard
    try {
      await addPost(newPostContent);
      toast.success('Post added successfully!'); // Show success toast
      setNewPostContent(''); // reset post content
    } catch (err) {
      toast.error('Failed to add post'); // Show error toast
    }
  };

  /** ---------------- Add a comment ---------------- */
  const handleAddComment = async (postId: string) => {
    const commentContent = newCommentMap[postId]?.trim();
    try {
      await addComment(postId, commentContent);
      toast.success('Comment added successfully!'); // Show success toast
      setNewCommentMap(prev => ({ ...prev, [postId]: '' })); // reset comment input
    } catch (err) {
      toast.error('Failed to add comment'); // Show error toast
    }
  };

  /** ---------------- Search posts ---------------- */
  const handleSearch = async () => {
    await searchPosts(searchQuery);
  };

  // --- Show loading state
  if (loading || profileLoading) return <p>Loading...</p>;

  // --- Show message if user not logged in
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <h1 className="text-2xl font-bold mb-4">Community Page</h1>
        <p className="text-red-500">User not logged in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <Toaster position="top-right" /> {/* Place Toaster here for toast notifications */}

      <h1 className="text-2xl font-bold mb-4">Community Page</h1>

      {/* Display any error messages */}
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

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
