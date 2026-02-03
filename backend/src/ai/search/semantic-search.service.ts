// backend/ai/search/index.ts
import { embedText } from "../embeddings/embedding.service.js";
import { searchPostsByEmbedding } from "../vector-db/chroma.client.js";

export async function semanticSearch(query: string) {
  const embedding = await embedText(query);
  return searchPostsByEmbedding(embedding);
}
