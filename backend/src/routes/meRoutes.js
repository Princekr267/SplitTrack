import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  signOutAll,
  exportUserData,
  dismissNotice,
} from '../controllers/meController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { analyticsQuerySchema } from '../validations/analyticsValidation.js';
import { getFriendAnalytics } from '../controllers/analyticsController.js';

const router = Router();

// All /api/me routes are protected
router.use(authenticate);

router.get('/', getProfile);
router.patch('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/sign-out-all', signOutAll);
router.get('/export', exportUserData);
router.post('/dismiss-password-notice', dismissNotice);
router.post('/password-notice/dismiss', dismissNotice);

// Friend statement analytics (own data only)
router.get('/profiles/:personId/analytics', validate(analyticsQuerySchema), getFriendAnalytics);

export default router;

