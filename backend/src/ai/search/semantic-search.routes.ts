// backend/src/ai/semantic-search/semantic-search.routes.ts
import { Router } from 'express';
import { SemanticSearchController } from './semantic-search.controller.js';

const router = Router();
const controller = new SemanticSearchController();

// GET /search?q=keyword
router.get('/', (req, res) => controller.searchPosts(req, res));

export default router;
