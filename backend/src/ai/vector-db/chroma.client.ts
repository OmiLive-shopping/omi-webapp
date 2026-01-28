import { ChromaClient } from 'chromadb';

export const chroma = new ChromaClient({
  path: './chroma', // local persistence
});

export async function getPostsCollection() {
  return chroma.getOrCreateCollection({
    name: 'community-posts',
    metadata: { description: 'Community posts embeddings' },
  });
}
