//install these two packages for post embedding
//npm install @langchain/core@1.0.0 @langchain/community@1.1.9 chromadb --save --legacy-peer-deps


// backend/src/ai/embeddings/embedding.service.ts
// backend/src/ai/embeddings/embedding.service.ts
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

/**
 * Load the model once
 */
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const result = await model(text);
  // result is 2D array, flatten it
  return (result[0] as number[]).flat();
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEmbedder();
  const embeddings: number[][] = [];
  for (const text of texts) {
    const result = await model(text);
    embeddings.push((result[0] as number[]).flat());
  }
  return embeddings;
}
