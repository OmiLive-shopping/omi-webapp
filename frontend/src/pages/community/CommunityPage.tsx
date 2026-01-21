import React, { useState } from 'react';
<<<<<<< HEAD
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
=======
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Heart, ThumbsUp } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  content: string;
  comments: string[];
  likes: number;
}

const CommunityPage: React.FC = () => {
  const { profile, loading } = useProfile();

  const [posts, setPosts] = useState<Post[]>([
    { id: 1, title: 'First Post', content: 'Hello world!', comments: ['Nice!'], likes: 5 },
    { id: 2, title: 'Another Post', content: 'React is awesome!', comments: [], likes: 2 },
  ]);

  const [newPostContent, setNewPostContent] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [newCommentMap, setNewCommentMap] = useState<{ [postId: number]: string }>({});

  const handleAddPost = () => {
    if (!newPostContent.trim()) return;
    const newPost: Post = {
      id: posts.length + 1,
      title: `Post ${posts.length + 1}`,
      content: newPostContent,
      comments: [],
      likes: 0,
    };
    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  const handleSelectPost = (id: number) => {
    setSelectedPostId(id);
  };

  const handleCommentChange = (postId: number, value: string) => {
    setNewCommentMap(prev => ({ ...prev, [postId]: value }));
  };

  const handleAddComment = (postId: number) => {
    const comment = newCommentMap[postId]?.trim();
    if (!comment) return;

    setPosts(posts.map(post => 
      post.id === postId ? { ...post, comments: [...post.comments, comment] } : post
    ));

    setNewCommentMap(prev => ({ ...prev, [postId]: '' })); // clear input
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <div className="w-1/5 bg-white dark:bg-gray-800 p-4 border-r">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">User</h2>
          {loading ? (
            <p>Loading...</p>
          ) : profile ? (
            <>
              <p className="font-medium">{profile.username}</p>
              <p className="text-gray-500">{profile.email}</p>
            </>
          ) : (
            <p>No user data</p>
          )}
        </div>

        {/* Center Content */}
        <div className="w-3/5 p-6">
          <h1 className="text-2xl font-bold mb-4">Community Page</h1>

          {/* Add Post Box */}
          <div className="mb-6">
            <textarea
              className="w-full p-2 border rounded-md"
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <button
              className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              onClick={handleAddPost}
            >
              Submit Post
            </button>
          </div>

          {/* Display Posts */}
          {posts.map((post) => (
            <div
              key={post.id}
              className={`mb-4 p-4 rounded-md shadow-sm cursor-pointer ${
                selectedPostId === post.id ? 'bg-primary-100 dark:bg-primary-900' : 'bg-white dark:bg-gray-800'
              }`}
              onClick={() => handleSelectPost(post.id)}
            >
              <p>{post.content}</p>

              {/* Comment input for selected post */}
              {selectedPostId === post.id && (
                <div className="mt-2">
                  <textarea
                    className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Write a comment..."
                    value={newCommentMap[post.id] || ''}
                    onChange={(e) => handleCommentChange(post.id, e.target.value)}
                  />
                  <button
                    className="bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
                    onClick={() => handleAddComment(post.id)}
                  >
                    Add Comment
                  </button>
                </div>
              )}

              {/* Existing comments */}
              {post.comments.length > 0 && (
                <div className="mt-2">
                  {post.comments.map((c, idx) => (
                    <p key={idx} className="text-sm text-gray-600 dark:text-gray-300">- {c}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Sidebar */}
        <div className="w-1/5 bg-white dark:bg-gray-800 p-4 border-l">
          <h2 className="text-lg font-semibold mb-4">Post Details</h2>
          {posts.map((post) => (
            <div key={post.id} className="mb-4 p-2 border-b border-gray-200 dark:border-gray-700">
              <p className="font-semibold">{post.title}</p>
              <div className="flex items-center space-x-4 mt-1 text-gray-500 text-sm">
                <div className="flex items-center space-x-1">
                  <Heart size={16} /> <span>{post.comments.length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ThumbsUp size={16} /> <span>{post.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
>>>>>>> 1ebd541cce622c48c3d099d4a9f80d1c1e828e74
    </div>
  );
};

export default CommunityPage;
<<<<<<< HEAD

=======
>>>>>>> 1ebd541cce622c48c3d099d4a9f80d1c1e828e74
