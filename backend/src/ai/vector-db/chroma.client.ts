//start chromadb in docker 
/*docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v $(pwd)/chroma:/chroma \
  chromadb/chroma:latest
*/

// backend/src/ai/vector-db/chroma.client.ts
// backend/src/ai/vector-db/chroma.client.ts
import { ChromaClient } from 'chromadb';

export const chroma = new ChromaClient({
  host: 'http://localhost:8000', // backend URL for Chroma
});

export async function getPostsCollection() {
  return chroma.getOrCreateCollection({
    name: 'community-posts',
    // Do NOT use embeddingFunction; we will pass embeddings manually
  });
}


