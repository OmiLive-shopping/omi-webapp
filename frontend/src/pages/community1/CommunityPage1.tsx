import React, { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCommunityPosts, Post } from "@/hooks/useCommunityPosts";
import { apiClient } from "@/lib/api-client";

const CommunityPage: React.FC = () => {
  const { profile } = useProfile();
  const loggedInUserId = profile?.id;

  const { posts, fetchPosts } = useCommunityPosts(loggedInUserId);

  const [newPost, setNewPost] = useState("");
  const [creating, setCreating] = useState(false);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);

  const createPost = async () => {
    if (!newPost.trim() || !loggedInUserId) return;
    setCreating(true);
    await apiClient.post("/posts", { postDescription: newPost });
    setNewPost("");
    setCreating(false);
    fetchPosts();
  };

  const submitComment = async (postId: string) => {
    const comment = commentInputs[postId];
    if (!comment?.trim()) return;
    await apiClient.post("/comments", { postId, comment });
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    fetchPosts();
  };

  const searchPosts = async () => {
    if (!query.trim()) return;
    const res = await apiClient.get<{ success: boolean; data: Post[] }>("/posts/search", {
      params: { q: query },
    });
    setSearchResults(res.data);
  };

  if (!profile) return <p>Please log in</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Community</h1>

      {/* Search */}
      <div>
        <input
          placeholder="Search posts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button onClick={searchPosts}>Search</button>
      </div>

      {searchResults.length > 0 && (
        <div>
          <h2>Search Results</h2>
          {searchResults.map(post => (
            <div key={post.id}>{post.postDescription}</div>
          ))}
        </div>
      )}

      {/* New post */}
      <div>
        <textarea
          placeholder="Share something..."
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
        />
        <button onClick={createPost}>{creating ? "Posting..." : "Post"}</button>
      </div>

      {/* Posts */}
      {posts.map(post => (
        <div key={post.id}>
          <p>{post.postDescription}</p>
          <div>
            <input
              placeholder="Write a comment..."
              value={commentInputs[post.id] || ""}
              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
            />
            <button onClick={() => submitComment(post.id)}>Comment</button>
          </div>
          {post.comments.map(c => (
            <div key={c.id}>
              <strong>{c.user.username}</strong>: {c.comment}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CommunityPage;
