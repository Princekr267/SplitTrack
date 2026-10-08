import { Router } from 'express';
import { getPublicStatement } from '../controllers/shareController.js';
import { resolveViewingPerson } from '../middleware/privacyMiddleware.js';
import { publicLinkLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Level 1: Public read-only statement
router.get('/:token', publicLinkLimiter, resolveViewingPerson, getPublicStatement);

export default router;
