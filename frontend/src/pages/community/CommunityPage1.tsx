// frontend/src/pages/CommunityPage.tsx
import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';

export default function CommunityPage() {
  // ----------- Auth state -----------
  const { profile, loading: profileLoading } = useProfile();
  const isLoggedIn = Boolean(profile);
  const loggedInUserId = profile?.id;

  // ----------- Community posts hook -----------
  const {
    posts,
    loading: postsLoading,
    error: postsError,
    postError,
    commentErrors,
    addPost,
    addComment,
  } = useCommunityPosts(loggedInUserId || '');

  // ----------- Semantic search hook -----------
  const { search, results, loading: searchLoading, error: searchError } = useSemanticSearch();

  // ----------- Local state -----------
  const [newPost, setNewPost] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  };

  // ----------- Loading / not logged in handling -----------
  if (profileLoading) return <p>Loading user data...</p>;
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
          User not logged in
        </h2>
      </div>
    );
  }

  if (postsLoading) return <p>Loading posts...</p>;
  if (postsError) return <p style={{ color: 'red' }}>{postsError}</p>;

  // Determine which posts to display: search results take priority
  const postsToDisplay = results.length > 0 ? results : posts;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">Community</h1>

      {/* ---------- Search ---------- */}
      <input
        type="text"
        placeholder="Search posts..."
        value={query}
        onChange={handleSearch}
        className="w-full p-2 border rounded-md mb-4"
      />
      {searchLoading && <p>Searching...</p>}
      {searchError && <p style={{ color: 'red' }}>{searchError}</p>}

      {/* ---------- Add New Post ---------- */}
      <div className="mb-6">
        <textarea
          className="w-full p-2 border rounded-md mb-2"
          value={newPost}
          placeholder="Write a new post"
          onChange={(e) => setNewPost(e.target.value)}
        />
        {postError && <p style={{ color: 'red' }}>{postError}</p>}
        <button
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          onClick={() => {
            addPost(newPost);
            setNewPost('');
          }}
        >
          Add Post
        </button>
      </div>

      {/* ---------- Posts List ---------- */}
      {postsToDisplay.map((post) => (
        <div
          key={post.id}
          className="mb-4 p-4 border rounded-md bg-white dark:bg-gray-800"
        >
          <p>{post.postDescription}</p>

          {/* ---------- Comments ---------- */}
          <div className="mt-2">
            {post.comments.map((comment) => (
              <p key={comment.id} className="text-sm text-gray-600 dark:text-gray-300">
                - {comment.comment}
              </p>
            ))}

            <input
              type="text"
              placeholder="Add a comment"
              value={commentInputs[post.id] || ''}
              onChange={(e) =>
                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
              }
              className="w-full p-1 border rounded-md mt-2 mb-1"
            />
            {commentErrors[post.id] && (
              <p style={{ color: 'red' }}>{commentErrors[post.id]}</p>
            )}
            <button
              className="bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
              onClick={() => {
                addComment(post.id, commentInputs[post.id] || '');
                setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
              }}
            >
              Add Comment
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
