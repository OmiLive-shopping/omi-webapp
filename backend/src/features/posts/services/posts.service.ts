import { PostsRepository } from '../repositories/posts.repository.js';
import {
  textToVector,
  cosineSimilarity,
} from '../../../utils/semantic.util.js';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

  // ---------------- Get All Posts ----------------
  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  // ---------------- Create Post ----------------
  async createPost(
    userId: string,
    postDescription: string,
    postImage?: string | null
  ) {
    const embedding = textToVector(postDescription);

    return this.postsRepo.createPost(
      userId,
      postDescription,
      postImage,
      embedding
    );
  }

  // ---------------- Like Post ----------------
  likePost(postId: string) {
    if (!postId) throw new Error('Post ID is required');
    return this.postsRepo.likePost(postId);
  }

  // ---------------- Keyword Search ----------------
  searchPosts(query: string) {
    if (!query?.trim()) return [];
    return this.postsRepo.getPostsBySearch(query.trim());
  }

  // ---------------- Semantic Search ----------------
  async semanticSearchPosts(query: string) {
    if (!query?.trim()) return [];

    const queryVector = textToVector(query);

    const posts = await this.postsRepo.getAllForSemantic();

    const scored = posts.map((post: any) => {
      const similarity = cosineSimilarity(
        queryVector,
        post.contentEmbedding || []
      );

      return { ...post, similarity };
    });

    return scored
      .filter(p => p.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ similarity, ...post }) => post);
  }
}
