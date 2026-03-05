Community Page Documentation
1. Overview

The Community Page allows users to create posts, interact through comments and likes, and search content using both keyword-based search and semantic search. The page is designed to provide a seamless and interactive user experience while maintaining scalability and performance.

2. Features
2.1 Post Management

Users can create posts with:

Text description (5–500 characters validation)

Optional image

Posts are displayed in descending order (newest first).

Newly created posts appear instantly at the top.

2.2 Comment Management

Users can add comments to posts.

Comments are validated before submission.

Comments are displayed in chronological order.

Each comment includes user details and timestamp.

2.3 Like Functionality

Users can like posts.

Like count updates immediately after interaction.

Like functionality is handled securely via authenticated API routes.

2.4 Pagination (Load More)

Posts are fetched in batches.

A "Load More" button retrieves additional posts.

Pagination prevents performance issues with large datasets.

2.5 Toast Notifications

Success and error messages are displayed using toast notifications.

Feedback is provided when:

Adding posts

Adding comments

Search validation errors

3. Search System

The Community Page supports two types of search:

3.1 Simple (Keyword) Search

Performs case-insensitive substring matching.

Filters posts where postDescription contains the query.

Implemented via backend query using Prisma.

3.2 Semantic Search

Uses embeddings to understand the meaning of text.

Does not rely on third-party APIs.

Implemented using @xenova/transformers.

Uses cosine similarity to rank posts based on meaning similarity.

4. Semantic Search Architecture
4.1 Backend Changes

Added contentEmbedding: Float[] field in Prisma Post model.

Embeddings are generated when a post is created.

Embeddings are stored in the database for reuse.

Backend supports a mode query parameter:

mode=keyword

mode=semantic

4.2 Frontend Implementation

Transformer model loads locally in the browser.

Query embedding is generated when semantic mode is active.

Cosine similarity is calculated between:

Query embedding

Stored post embeddings

Posts are sorted by similarity score.

A toggle button switches between search modes.

5. Toggle Search Mode

A toggle button is placed near the search input:

Keyword Mode (Default) → Uses traditional search.

Semantic Mode → Uses embedding similarity.

Users can switch modes without refreshing the page.

Existing features (likes, comments, pagination) remain unaffected.

6. Backend Structure
Files Modified

schema.prisma → Added contentEmbedding

posts.repository.ts → Handles post selection & embedding storage

posts.service.ts → Handles search logic

posts.controller.ts → Accepts mode parameter

posts.routes.ts → Search route with validation

7. Frontend Structure
Key Files

useCommunityPosts.ts → Manages state, fetch logic, and search mode

CommunityPage.tsx → UI rendering and toggle integration

8. Validation Rules
Post Validation

Minimum 5 characters

Maximum 500 characters

Comment Validation

Cannot be empty

Search Validation

Search query cannot be empty

9. Performance Considerations

Pagination limits post fetch size.

Embeddings are stored once to avoid recomputation.

Semantic search runs only when toggle is enabled.

Cosine similarity calculation is lightweight and client-side.

10. Security

Post creation and likes require authentication.

Input validation is handled using Zod.

Backend ensures safe query execution via Prisma ORM.

Conclusion

The Community Page combines traditional CRUD operations with advanced semantic search, delivering both standard keyword filtering and intelligent meaning-based search while preserving performance, scalability, and user experience.

For community page, comment recommendation can be added