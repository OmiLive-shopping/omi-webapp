// Simple text → vector embedding (bag-of-words style)

export function textToVector(text: string): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/);

  const freqMap: Record<string, number> = {};

  for (const word of words) {
    if (!word) continue;
    freqMap[word] = (freqMap[word] || 0) + 1;
  }

  // Convert to fixed-length vector (hash-based)
  const vector = new Array(100).fill(0);

  Object.entries(freqMap).forEach(([word, count]) => {
    const hash = hashWord(word) % 100;
    vector[hash] += count;
  });

  return normalize(vector);
}

function hashWord(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = word.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );
  return magnitude === 0
    ? vector
    : vector.map(v => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

