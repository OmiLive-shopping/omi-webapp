import { pipeline } from "@xenova/transformers";

let embedder: any = null;

async function loadEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "sentence-transformers/all-MiniLM-L6-v2"
    );
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await loadEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}


export async function getPostsCollection(text: string): Promise<number[]> {
  const extractor = await loadEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
