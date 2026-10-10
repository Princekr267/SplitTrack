import { Router } from 'express';
import { getPublicStatement } from '../controllers/shareController.js';
import { getPublicShareAnalytics } from '../controllers/analyticsController.js';
import { resolveViewingPerson } from '../middleware/privacyMiddleware.js';
import { publicLinkLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { analyticsQuerySchema } from '../validations/analyticsValidation.js';

const router = Router();

// Level 1: Public read-only statement
router.get('/:token/analytics', publicLinkLimiter, resolveViewingPerson, validate(analyticsQuerySchema), getPublicShareAnalytics);
router.get('/:token', publicLinkLimiter, resolveViewingPerson, getPublicStatement);

export default router;

