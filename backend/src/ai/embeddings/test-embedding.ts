import { generateEmbedding } from './embedding.service.js';

async function testEmbedding() {
  const text = "This is a test post for embeddings!";
  
  try {
    const embedding = await generateEmbedding(text);
    
    console.log("Embedding length:", embedding.length);
    console.log("First 10 values:", embedding.slice(0, 10));
  } catch (err) {
    console.error("Error generating embedding:", err);
  }
}

testEmbedding();
