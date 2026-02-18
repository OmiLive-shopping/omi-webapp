from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np

app = FastAPI()

# Load model once
model = SentenceTransformer('all-MiniLM-L6-v2')

class TextRequest(BaseModel):
    text: str

class SearchRequest(BaseModel):
    query: str
    embeddings_list: list[list[float]]  # List of embeddings from DB
    top_k: int = 10

@app.post("/embed")
async def embed_text(request: TextRequest):
    embedding = model.encode(request.text).tolist()
    return {"embedding": embedding}

@app.post("/search")
async def search_text(request: SearchRequest):
    query_embedding = model.encode(request.query)
    embeddings_array = np.array(request.embeddings_list)
    
    # Compute cosine similarity
    dot_products = np.dot(embeddings_array, query_embedding)
    norms = np.linalg.norm(embeddings_array, axis=1) * np.linalg.norm(query_embedding)
    similarities = dot_products / norms

    # Get top_k indices
    top_indices = similarities.argsort()[::-1][:request.top_k]
    return {"top_indices": top_indices.tolist(), "similarities": similarities[top_indices].tolist()}
