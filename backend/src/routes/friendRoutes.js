import { Router } from 'express';
import {
  getLinkedProfiles,
  submitFriendPayment,
  resubmitFriendPayment,
} from '../controllers/friendController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { resolveViewingPerson } from '../middleware/privacyMiddleware.js';

const router = Router();

router.use(authenticate);

// Friend Dashboard - All linked profiles across groups
router.get('/profiles', getLinkedProfiles);

// Friend submits repayment (goes to host as pending)
router.post('/payments', resolveViewingPerson, submitFriendPayment);

// Friend edits and resubmits rejected payment
router.patch('/payments/:paymentId', resolveViewingPerson, resubmitFriendPayment);

export default router;
