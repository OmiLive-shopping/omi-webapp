// frontend/src/pages/CommunityPage.tsx
import { useState } from 'react';
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
