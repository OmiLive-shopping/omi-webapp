// frontend/pages/CommunityPage.tsx
import React from 'react';
import { useCommunityPosts } from '../hooks/useCommunityPosts.js';

export const CommunityPage: React.FC = () => {
  const { posts, loading, error, fetchPosts, hasMore } = useCommunityPosts(5);

  return (
    <div className="community-page">
      <h1>Community</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="posts-list">
        {posts.map(post => (
          <div key={post.id} className="post-card">
            <p>{post.user.username}: {post.postDescription}</p>
            {post.postImage && <img src={post.postImage} alt="post" />}
            <p>Likes: {post.likes}</p>
          </div>
        ))}
      </div>

      {loading && <p>Loading...</p>}

      {hasMore && !loading && (
        <button onClick={() => fetchPosts(false)}>Load More</button>
      )}
    </div>
  );
};

