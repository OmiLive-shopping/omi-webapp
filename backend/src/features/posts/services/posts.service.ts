// backend/src/features/posts/services/posts.service.ts
import { PostsRepository } from '../repositories/posts.repository.js';
import { generateEmbedding } from '../../../ai/embeddings/embedding.service.js';
import { getPostsCollection } from '../../../ai/vector-db/chroma.client.js';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  async createPost(userId: string, postDescription: string, postImage?: string | null) {
    const post = await this.postsRepo.createPost(userId, postDescription, postImage);

    const embedding = await generateEmbedding(postDescription);

    const collection = await getPostsCollection();
    await collection.add({
      ids: [post.id],
      embeddings: [embedding],
      documents: [postDescription],
      metadatas: [{ userId, createdAt: post.createdAt.toISOString() }],
    });

    return post;
  }

  async likePost(postId: string) {
    return this.postsRepo.likePost(postId);
  }

  async searchPosts(query: string) {
    const collection = await getPostsCollection();
    const embedding = await generateEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [embedding], // <-- manually pass embeddings
      nResults: 10,
    });

    // results.ids is an array of arrays
    const postIds: string[] = results.ids[0] ?? [];
    return this.postsRepo.getPostsByIds(postIds);
  }
}
