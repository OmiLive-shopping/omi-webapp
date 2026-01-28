// backend/src/ai/semantic-search/semantic-search.service.ts
import { generateEmbedding } from '../embeddings/embedding.service.js';
import { getPostsCollection } from '../vector-db/chroma.client.js';
import { PostsRepository } from '../../features/posts/repositories/posts.repository.js';
import { PrismaClient } from '@prisma/client';

export class SemanticSearchService {
  private postsRepo: PostsRepository;

  constructor() {
    const prisma = new PrismaClient();
    this.postsRepo = new PostsRepository(prisma);
  }

  /**
   * Search posts semantically by query
   */
  async searchPosts(query: string, limit = 10) {
    if (!query) return [];

    // 1️⃣ Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // 2️⃣ Query ChromaDB
    const collection = await getPostsCollection();
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      includeMetadata: true,
      includeDocuments: true,
      includeIds: true,
    });

    const ids = results[0]?.ids || [];
    if (ids.length === 0) return [];

    // 3️⃣ Fetch posts from database by IDs
    const posts = await this.postsRepo.getPostsByIds(ids);

    // 4️⃣ Sort posts in order returned by ChromaDB
    const postsMap = new Map(posts.map((p) => [p.id, p]));
    const sortedPosts = ids.map((id) => postsMap.get(id)).filter(Boolean);

    return sortedPosts;
  }
}
