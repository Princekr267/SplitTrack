import { Router } from 'express';
import {
  getSystemStats,
  getUsers,
  toggleUserStatus,
  getAdminGroups,
  getAuditLogs,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// Guard all admin routes
router.use(authenticate, requireAdmin);

router.get('/stats', getSystemStats);
router.get('/users', getUsers);
router.patch('/users/:userId/status', toggleUserStatus);
router.get('/groups', getAdminGroups);
router.get('/audit-logs', getAuditLogs);

export default router;
