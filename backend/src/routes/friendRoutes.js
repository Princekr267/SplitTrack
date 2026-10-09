import { Router } from 'express';
import {
  getLinkedProfiles,
  submitFriendPayment,
  resubmitFriendPayment,
  getGroupBillsForFriend,
} from '../controllers/friendController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { resolveViewingPerson } from '../middleware/privacyMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createFriendPaymentSchema, resubmitFriendPaymentSchema } from '../validations/paymentValidation.js';

const router = Router();

router.use(authenticate);

// Friend Dashboard - All linked profiles across groups
router.get('/profiles', getLinkedProfiles);

// Friend submits repayment (goes to host as pending)
router.post('/payments', resolveViewingPerson, validate(createFriendPaymentSchema), submitFriendPayment);

// Friend edits and resubmits rejected payment
router.patch('/payments/:paymentId', resolveViewingPerson, validate(resubmitFriendPaymentSchema), resubmitFriendPayment);

// Friend views all group bills (only if host granted can_view_all_bills)
router.get('/profiles/:personId/group-bills', getGroupBillsForFriend);

export default router;
