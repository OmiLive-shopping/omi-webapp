import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useCommunityPosts, UserPost } from '@/hooks/useCommunityPosts';
import { useAuthState } from '@/lib/auth-client';

const CommunityPage: React.FC = () => {
  const { isAuthenticated } = useAuthState();
  const { posts, loading, error } = useCommunityPosts();
  const [newCommentMap, setNewCommentMap] = useState<{ [postId: string]: string }>({});

  if (!isAuthenticated) return <p>User not logged in.</p>;
  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const handleCommentChange = (postId: string, value: string) => {
    setNewCommentMap(prev => ({ ...prev, [postId]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4">Community Page</h1>

      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        posts.map(post => (
          <div key={post.id} className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm">
            <p><strong>{post.username}:</strong> {post.postDescription}</p>

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
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CommunityPage;

