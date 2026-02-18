import { PostsRepository } from '../repositories/posts.repository.js';
import axios from 'axios';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

  // ---------------- Get All Posts ----------------
  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  // ---------------- Keyword Search ----------------
  searchPosts(query: string) {
    if (!query || !query.trim()) return [];
    return this.postsRepo.getPostsBySearch(query.trim());
  }

  // ---------------- Like Post ----------------
  likePost(postId: string) {
    if (!postId) throw new Error('Post ID is required');
    return this.postsRepo.likePost(postId);
  }

  // ---------------- Create Post with Embedding ----------------
  async createPostWithEmbedding(userId: string, postDescription: string, postImage?: string | null) {
    // Create post normally
    const post = await this.postsRepo.createPost(userId, postDescription, postImage);

    // Generate embedding from Python semantic search module
    const embedRes = await axios.post('http://localhost:8000/embed', { text: postDescription });
    const embedding = embedRes.data.embedding as number[];

    // Save embedding in DB
    await this.postsRepo.savePostEmbedding(post.id, embedding);

    return post;
  }

  // ---------------- Semantic Search ----------------
  async semanticSearchPosts(query: string) {
    // Fetch all posts with embeddings
    const postsWithEmbeddings = await this.postsRepo.getAllPosts();
    const embeddingsList = postsWithEmbeddings
      .filter(p => p.contentEmbedding)
      .map(p => p.contentEmbedding as number[]);

    if (!embeddingsList.length) return [];

    // Call Python semantic search API
    const res = await axios.post('http://localhost:8000/search', {
      query,
      embeddings_list: embeddingsList,
      top_k: 10,
    });

    const { top_indices } = res.data;

    // Map indices to post IDs
    const topPostIds = top_indices.map((i: number) => postsWithEmbeddings[i].id);

    // Fetch full post data
    return this.postsRepo.getPostsByIds(topPostIds);
  }
}
