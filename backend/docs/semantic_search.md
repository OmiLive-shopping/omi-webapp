# Semantic Search Integration (Local)

## Stack
- Frontend: React + Tailwind  
- Backend: Express + Prisma + PostgreSQL (Dockerized)  
- Current Search: Keyword search via `/posts/search` endpoint  

## Goal
Implement **local semantic search** for community posts without relying on any external API.

---

## Architecture Overview
Architecture Overview

The local semantic search system can be broken down into several conceptual components:

1) Text Embedding Generation: - Each post is converted into a dense vector representation (embedding) that captures its semantic meaning.

Embeddings are generated locally using a transformer-based model (e.g., a compact sentence transformer) when a post is created or updated.

2) Embedding Storage

Embeddings are stored alongside posts in the PostgreSQL database.

Specialized vector data types and indexes allow efficient similarity search without scanning all posts.

3) Search Query Processing

When a user performs a search, the query is converted into a vector embedding using the same model.

A similarity metric (such as cosine similarity) compares the query embedding with post embeddings to find the most semantically relevant posts.

4) Backend API Integration

The existing /posts/search endpoint is extended to support semantic search.

The backend handles the workflow of embedding the query, searching the database, and returning ranked results.

5) Frontend Integration

The UI allows the user to toggle semantic search mode.

Search results are displayed similarly to keyword search, but are ranked by semantic relevance rather than exact keyword match.

Implementation Approach (Conceptual Steps)

Selecting a Local Embedding Model

Models like MiniLM, DistilBERT, or other lightweight sentence transformers

Generate Embeddings for Posts

Every time a post is created or updated, generate its embedding vector and store it in the database.

Storing Embeddings Efficiently

Store in db and enable pgvector extension

Create vector indexes to allow fast similarity search.

Search Workflow

Convert the user’s search query into an embedding vector.

Compare the query embedding with stored post embeddings using a similarity metric.

Return the top results ranked by relevance.

Frontend
 ├─ pages/communityPage.js
 └─ hooks/useCommunityPosts.js
       │
       ▼
   API Call (/posts/search?mode=semantic)
       │
       ▼
Backend
 ├─ src/features/posts/posts.controller.js
 │       │
 │       ▼
 │  posts.service.js
 │       │
 │       ▼
 │  ┌───────────────────────────┐
 │  │ semantic-search/main.py    │  <-- Generates embeddings, computes similarity
 │  └───────────────────────────┘
 │       │
 │       ▼
 └─ posts.repository.js          <-- Fetch post details by IDs
       │
       ▼
Database (PostgreSQL + vector extension)
 └─ posts table
       ├─ title
       ├─ content
       └─ content_embedding   <-- Stores embeddings for semantic search


