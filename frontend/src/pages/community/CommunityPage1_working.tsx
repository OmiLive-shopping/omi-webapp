import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { useProfile } from '@/hooks/useProfile';
// import { apiClient } from '@/lib/api-client'; // Uncomment when ready to save

const CommunityPage: React.FC = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { posts, setPosts, loading, error } = useCommunityPosts();

  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentMap, setNewCommentMap] = useState<{ [postId: string]: string }>({});

  // Add new post
  const handleAddPost = async () => {
    if (!newPostContent.trim() || !profile) return;

    // Uncomment when backend ready
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

    // UI only for now
    const fakePost = {
      id: Date.now().toString(),
      userId: profile.id,
      postDescription: newPostContent,
      postImage: null,
      likes: 0,
      createdAt: new Date().toISOString(),
      user: {
        id: profile.id,
        username: profile.username,
        name: profile.name || '',
        avatarUrl: profile.avatarUrl || null,
      },
      comments: [],
    };
    setPosts([fakePost, ...posts]);
    setNewPostContent('');
  };

  // Handle new comment input
  const handleCommentChange = (postId: string, value: string) => {
    setNewCommentMap(prev => ({ ...prev, [postId]: value }));
  };

  // Add new comment
  const handleAddComment = async (postId: string) => {
    const commentContent = newCommentMap[postId]?.trim();
    if (!commentContent || !profile) return;

    // Uncomment when backend ready
    /*
    const response = await apiClient.post('/comments', {
      postId,
      userId: profile.id,
      comment: commentContent,
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

    // UI only for now
    setPosts(posts.map(post =>
      post.id === postId
        ? {
            ...post,
            comments: [
              ...post.comments,
              {
                id: Date.now().toString(),
                userId: profile.id,
                comment: commentContent,
                likes: 0,
                createdAt: new Date().toISOString(),
                user: {
                  id: profile.id,
                  username: profile.username,
                  name: profile.name || '',
                  avatarUrl: profile.avatarUrl || null,
                },
              },
            ],
          }
        : post
    ));
    setNewCommentMap(prev => ({ ...prev, [postId]: '' }));
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
            {/* Post content */}
            <p className="font-medium">{post.user.username}</p>
            <p>{post.postDescription}</p>

            {/* Post likes & comments */}
            <div className="flex space-x-4 mt-2 text-gray-500">
              <div className="flex items-center space-x-1">
                <Heart size={16} /> <span>{post.likes}</span>
              </div>
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
                  <p key={c.id}>
                    <span className="font-semibold">{c.user.username}:</span> {c.comment}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

//need to add code to add posts, add comments and save those to backend tables using api
export default CommunityPage;
