import React, { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCommunityPosts, Post } from "@/hooks/useCommunityPosts";
import { apiClient } from "@/lib/api-client";
import { useInView } from "react-intersection-observer";

const CommunityPage: React.FC = () => {
  const { profile, loading: profileLoading } = useProfile();
  const loggedInUserId = profile?.id;

  const {
    posts,
    loading: postsLoading,
    error,
    loadMore,
    hasMore,
    fetchPosts
  } = useCommunityPosts(loggedInUserId);

  const { ref, inView } = useInView();

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Create post
  const [newPost, setNewPost] = useState("");
  const [creating, setCreating] = useState(false);

  // Comments (per post)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (inView && hasMore && !postsLoading) {
      loadMore();
    }
  }, [inView, hasMore, postsLoading]);

  const searchPosts = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);

    const res = await apiClient.get<Post[]>("/posts/search", {
      params: { q: query }
    });

    setSearchResults(res);
    setSearchLoading(false);
  };

  const createPost = async () => {
    if (!newPost.trim()) return;

    setCreating(true);

    await apiClient.post("/posts", {
      postDescription: newPost,
      postImage: null
    });

    setNewPost("");
    setCreating(false);

    fetchPosts(true);
  };

  const likePost = async (postId: string) => {
    await apiClient.patch(`/posts/${postId}/like`);
    fetchPosts(true);
  };

  const submitComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    await apiClient.post("/comments", {
      postId,
      comment: text
    });

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    fetchPosts(true);
  };

  if (profileLoading) {
    return <p>Loading user...</p>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 20 }}>
        <h2>User not logged in</h2>
        <p>Please log in to view community posts.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Community</h1>

      {/* SEARCH */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search posts..."
          style={{ padding: 8, width: "100%", marginBottom: 8 }}
        />

        <button
          onClick={searchPosts}
          disabled={!query.trim()}
          style={{ padding: "8px 16px" }}
        >
          Search
        </button>
      </div>

      {searchLoading && <p>Searching...</p>}

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h2>Search Results</h2>
          {searchResults.map(post => (
            <div
              key={post.id}
              style={{ padding: 12, border: "1px solid #ccc", marginBottom: 10 }}
            >
              <p>{post.postDescription}</p>
            </div>
          ))}
        </div>
      )}

      {/* CREATE POST */}
      <div style={{ marginBottom: 30 }}>
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Share something..."
          style={{ width: "100%", padding: 10, minHeight: 80 }}
        />

        <button
          onClick={createPost}
          disabled={creating || !newPost.trim()}
          style={{ padding: "8px 16px", marginTop: 8 }}
        >
          {creating ? "Posting..." : "Post"}
        </button>
      </div>

      {/* POSTS FEED */}
      {posts.map(post => (
        <div
          key={post.id}
          style={{
            marginBottom: 20,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 6
          }}
        >
          <p>{post.postDescription}</p>

          {/* LIKE */}
          <button
            onClick={() => likePost(post.id)}
            style={{ padding: "6px 12px", marginTop: 8 }}
          >
            ❤️ {post.likes}
          </button>

          {/* COMMENTS */}
          <div style={{ marginTop: 10 }}>
            <input
              value={commentInputs[post.id] || ""}
              onChange={e =>
                setCommentInputs(prev => ({
                  ...prev,
                  [post.id]: e.target.value
                }))
              }
              placeholder="Write a comment..."
              style={{ padding: 6, width: "100%" }}
            />

            <button
              onClick={() => submitComment(post.id)}
              style={{ padding: "6px 12px", marginTop: 6 }}
            >
              Comment
            </button>

            {post.comments.map(c => (
              <div key={c.id} style={{ marginTop: 8, paddingLeft: 10 }}>
                <strong>{c.user.username}</strong>: {c.comment}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* INFINITE SCROLL SENTINEL */}
      <div ref={ref} style={{ height: 20 }} />
    </div>
  );
};

export default CommunityPage;
