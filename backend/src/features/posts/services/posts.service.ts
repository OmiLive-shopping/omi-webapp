/*import { PostsRepository } from '../repositories/posts.repository.js';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  createPost(userId: string, postDescription: string, postImage?: string | null) {
    return this.postsRepo.createPost(userId, postDescription, postImage);
  }

  likePost(postId: string) {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    return this.postsRepo.likePost(postId);
  }
}
*/

//new code with embedding handling
// backend/src/features/posts/services/posts.service.ts
import { PostsRepository } from '../repositories/posts.repository.js';
import { generateEmbedding } from '../../../ai/embeddings/embedding.service.js';
import { getPostsCollection } from '../../../ai/vector-db/chroma.client.js';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  /**
   * Create post + generate embedding + store in Chroma
   */
  async createPost(userId: string, postDescription: string, postImage?: string | null) {
    // 1️⃣ Create post in DB
    const post = await this.postsRepo.createPost(userId, postDescription, postImage);

    // 2️⃣ Generate embedding (local HuggingFace / langchain)
    const embedding = await generateEmbedding(postDescription);

    // 3️⃣ Store embedding in ChromaDB
    const collection = await getPostsCollection();
    await collection.add({
      ids: [post.id],
      embeddings: [embedding],
      documents: [postDescription],
      metadatas: [
        {
          userId,
          createdAt: post.createdAt.toISOString(),
        },
      ],
    });

    return post;
  }

  /**
   * Increment post likes
   */
  async likePost(postId: string) {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    return this.postsRepo.likePost(postId);
  }
}
