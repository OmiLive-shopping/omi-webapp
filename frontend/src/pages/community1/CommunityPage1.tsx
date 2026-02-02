import React from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";

const CommunityPage: React.FC = () => {
  console.log("COMMUNITY PAGE MOUNTED");

  const { profile, loading: profileLoading } = useProfile();

  const loggedInUserId = profile?.id;

  const {
    posts,
    loading: postsLoading,
    error,
    loadMore,
    hasMore
  } = useCommunityPosts(loggedInUserId);

  // 1. Still loading user info
  if (profileLoading) {
    return <p>Loading user...</p>;
  }

  // 2. User NOT logged in
  if (!profile) {
    return (
      <div style={{ padding: 20 }}>
        <h2>User not logged in</h2>
        <p>Please log in to view community posts.</p>
      </div>
    );
  }

  // 3. User logged in → show posts
  return (
    <div style={{ padding: 20 }}>
      <h1>Community</h1>

      {postsLoading && posts.length === 0 && <p>Loading posts...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

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
        </div>
      ))}

      {/* Load More Button */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={postsLoading}
          style={{ padding: "8px 16px", marginTop: 10 }}
        >
          {postsLoading ? "Loading..." : "Load More"}
        </button>
      )}

      {!hasMore && posts.length > 0 && (
        <p style={{ marginTop: 12, color: "#666" }}>No more posts</p>
      )}
    </div>
  );
};

export default CommunityPage;
