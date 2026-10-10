import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  handleSettleGroup,
  handleReopenGroup,
} from '../controllers/groupController.js';
import { bulkSetViewAllBills } from '../controllers/personController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireGroupHost } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
} from '../validations/groupValidation.js';
import { bulkViewAllSchema } from '../validations/personValidation.js';
import { analyticsQuerySchema } from '../validations/analyticsValidation.js';
import { getGroupAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createGroupSchema), createGroup);
router.get('/', getGroups);
router.get('/:groupId/analytics', validate(analyticsQuerySchema), getGroupAnalytics);
router.get('/:groupId', validate(groupIdParamSchema), getGroupById);
router.patch('/:groupId', requireGroupHost, validate(updateGroupSchema), updateGroup);
router.delete('/:groupId', requireGroupHost, validate(groupIdParamSchema), deleteGroup);
router.post('/:groupId/settle', requireGroupHost, validate(groupIdParamSchema), handleSettleGroup);
router.post('/:groupId/reopen', requireGroupHost, validate(groupIdParamSchema), handleReopenGroup);

// Bulk bill visibility permission (host only)
router.post('/:groupId/permissions/view-all', requireGroupHost, validate(bulkViewAllSchema), bulkSetViewAllBills);


export default router;
