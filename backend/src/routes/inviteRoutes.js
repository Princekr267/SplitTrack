import { Router } from 'express';
import { getInviteDetails, acceptInviteCode } from '../controllers/inviteController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { publicLinkLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Inspect invite code
router.get('/:code', publicLinkLimiter, getInviteDetails);

// Accept invite code (requires user authentication)
router.post('/:code/accept', authenticate, acceptInviteCode);

export default router;
