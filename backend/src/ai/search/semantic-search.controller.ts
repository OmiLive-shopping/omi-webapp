// backend/src/ai/semantic-search/semantic-search.controller.ts
import { Request, Response } from 'express';
import { SemanticSearchService } from './semantic-search.service.js';

const searchService = new SemanticSearchService();

export class SemanticSearchController {
  async searchPosts(req: Request, res: Response) {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Query parameter "q" is required' });
    }

    try {
      const posts = await searchService.searchPosts(q, 10);
      res.json(posts);
    } catch (err) {
      console.error('Semantic search error:', err);
      res.status(500).json({ message: 'Failed to perform semantic search' });
    }
  }
}
