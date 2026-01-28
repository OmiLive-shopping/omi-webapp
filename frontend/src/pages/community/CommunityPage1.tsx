// frontend/src/pages/CommunityPage.tsx
/*import { useState } from 'react';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';

export default function CommunityPage() {
  const loggedInUserId = '123'; // replace with your auth state
  const {
    posts,
    loading,
    error,
    postError,
    commentErrors,
    addPost,
    addComment,
  } = useCommunityPosts(loggedInUserId);

  const [newPost, setNewPost] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Community</h1>

      <div>
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Write a new post"
        />
        {postError && <p style={{ color: 'red' }}>{postError}</p>}
        <button onClick={() => { addPost(newPost); setNewPost(''); }}>
          Add Post
        </button>
      </div>

      {posts.map(post => (
        <div key={post.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <p>{post.postDescription}</p>

          <div>
            {post.comments.map(comment => (
              <p key={comment.id}>{comment.comment}</p>
            ))}

            <input
              value={commentInputs[post.id] || ''}
              onChange={e =>
                setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))
              }
              placeholder="Add a comment"
            />
            {commentErrors[post.id] && (
              <p style={{ color: 'red' }}>{commentErrors[post.id]}</p>
            )}
            <button
              onClick={() => {
                addComment(post.id, commentInputs[post.id] || '');
                setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
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
*/


// frontend/src/pages/CommunityPage.tsx
// frontend/src/pages/CommunityPage.tsx
import { useState } from 'react';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { useSemanticSearch } from '@/hooks/useSemanticSearch'; // your semantic search hook

export default function CommunityPage() {
  const loggedInUserId = '123'; // replace with your auth state
  const communityId = 'abc'; // replace with your community id

  // Existing posts hook
  const {
    posts,
    loading: postsLoading,
    error: postsError,
    postError,
    commentErrors,
    addPost,
    addComment,
  } = useCommunityPosts(loggedInUserId);

  // Semantic search hook
  const { search, results, loading: searchLoading, error: searchError } = useSemanticSearch();

  // Local state
  const [newPost, setNewPost] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value); // only one argument
  };

  if (postsLoading) return <p>Loading...</p>;
  if (postsError) return <p>{postsError}</p>;

  // Decide which posts to display: search results or all posts
  const postsToDisplay = results.length > 0 ? results : posts;

  return (
    <div>
      <h1>Community</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search posts..."
        value={query}
        onChange={handleSearch}
        style={{ padding: '8px', width: '100%', marginBottom: '16px' }}
      />
      {searchLoading && <p>Searching...</p>}
      {searchError && <p style={{ color: 'red' }}>{searchError}</p>}

      {/* Add new post */}
      <div>
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Write a new post"
        />
        {postError && <p style={{ color: 'red' }}>{postError}</p>}
        <button
          onClick={() => {
            addPost(newPost);
            setNewPost('');
          }}
        >
          Add Post
        </button>
      </div>

      {/* List posts */}
      {postsToDisplay.map(post => (
        <div
          key={post.id}
          style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}
        >
          <p>{post.postDescription}</p>

          {/* Comments */}
          <div>
            {post.comments.map(comment => (
              <p key={comment.id}>{comment.comment}</p>
            ))}

            <input
              value={commentInputs[post.id] || ''}
              onChange={e =>
                setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))
              }
              placeholder="Add a comment"
            />
            {commentErrors[post.id] && (
              <p style={{ color: 'red' }}>{commentErrors[post.id]}</p>
            )}
            <button
              onClick={() => {
                addComment(post.id, commentInputs[post.id] || '');
                setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
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
