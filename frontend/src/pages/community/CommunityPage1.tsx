import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useCommunityPosts, UserPost } from '@/hooks/useCommunityPosts';
import { useProfile } from '@/hooks/useProfile';
import { Toaster, toast } from 'react-hot-toast';

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
  const [newCommentMap, setNewCommentMap] =
    useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] =
    useState<'keyword' | 'semantic'>('keyword');

  // ---------------- Add Post ----------------
  const handleAddPost = async () => {
    if (!profile) return;

    try {
      await addPost(newPostContent);
      toast.success('Post added successfully!');
      setNewPostContent('');
    } catch {
      toast.error('Failed to add post');
    }
  };

  // ---------------- Add Comment ----------------
  const handleAddComment = async (postId: string) => {
    const commentContent =
      newCommentMap[postId]?.trim();

    try {
      await addComment(postId, commentContent);
      toast.success('Comment added successfully!');
      setNewCommentMap(prev => ({
        ...prev,
        [postId]: '',
      }));
    } catch {
      toast.error('Failed to add comment');
    }
  };

  // ---------------- Search ----------------
  const handleSearch = async () => {
    await searchPosts(searchQuery, searchMode);
  };

  if (loading || profileLoading)
    return <p>Loading...</p>;

  if (!profile) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">
          Community Page
        </h1>
        <p className="text-red-500">
          User not logged in
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />

      <h1 className="text-2xl font-bold mb-4">
        Community Page
      </h1>

      {error && (
        <p className="text-red-500 mb-2">
          {error}
        </p>
      )}

      {/* SEARCH BAR WITH TOGGLE */}
      <div className="mb-4 flex space-x-2 items-center">
        <input
          type="text"
          className="flex-1 p-2 border rounded-md"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={e =>
            setSearchQuery(e.target.value)
          }
        />

        <button
          className="bg-primary-600 text-white px-4 py-2 rounded-md"
          onClick={handleSearch}
        >
          Search
        </button>

        <button
          onClick={() =>
            setSearchMode(prev =>
              prev === 'keyword'
                ? 'semantic'
                : 'keyword'
            )
          }
          className={`px-4 py-2 rounded-md border ${
            searchMode === 'semantic'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200'
          }`}
        >
          {searchMode === 'semantic'
            ? 'Semantic ON'
            : 'Semantic OFF'}
        </button>
      </div>

      {/* ADD POST */}
      <div className="mb-6">
        <textarea
          className="w-full p-2 border rounded-md"
          placeholder="What's on your mind?"
          value={newPostContent}
          onChange={e =>
            setNewPostContent(e.target.value)
          }
        />
        <button
          className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-md"
          onClick={handleAddPost}
        >
          Submit Post
        </button>
      </div>

      {/* POSTS */}
      {posts.length === 0 ? (
        <p>No posts found.</p>
      ) : (
        posts.map((post: UserPost) => (
          <div
            key={post.id}
            className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-md shadow"
          >
            <p className="font-medium">
              {post.user.username}
            </p>
            <p>{post.postDescription}</p>

            <div className="flex space-x-4 mt-2 text-gray-500">
              <button
                className="flex items-center space-x-1"
                onClick={() =>
                  likePost(post.id)
                }
              >
                <Heart size={16} />
                <span>{post.likes}</span>
              </button>

              <div className="flex items-center space-x-1">
                <ThumbsUp size={16} />
                <span>
                  {post.comments.length}
                </span>
              </div>
            </div>

            {/* Add Comment */}
            <div className="mt-2">
              <textarea
                className="w-full p-2 border rounded-md mb-2"
                placeholder="Write a comment..."
                value={
                  newCommentMap[post.id] || ''
                }
                onChange={e =>
                  setNewCommentMap(prev => ({
                    ...prev,
                    [post.id]:
                      e.target.value,
                  }))
                }
              />
              <button
                className="bg-primary-600 text-white px-3 py-1 rounded-md"
                onClick={() =>
                  handleAddComment(post.id)
                }
              >
                Add Comment
              </button>
            </div>

            {/* Comments */}
            {post.comments.length > 0 && (
              <div className="mt-2 text-sm space-y-1">
                {post.comments.map(c => (
                  <div
                    key={c.id}
                    className="flex justify-between"
                  >
                    <p>
                      <span className="font-semibold">
                        {c.user.username}:
                      </span>{' '}
                      {c.comment}
                    </p>
                    <button
                      onClick={() =>
                        likeComment(
                          post.id,
                          c.id
                        )
                      }
                      className="flex items-center space-x-1"
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

      {/* LOAD MORE */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            className="bg-gray-200 px-4 py-2 rounded-md"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? 'Loading...'
              : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
