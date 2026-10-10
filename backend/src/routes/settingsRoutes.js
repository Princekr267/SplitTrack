import { Router } from 'express';
import { getPublicSettings } from '../services/settingsService.js';

const router = Router();

/**
 * GET /api/settings/public
 * Returns public safe settings (allowRegistration, announcement).
 */
router.get('/public', async (req, res, next) => {
  try {
    const data = await getPublicSettings();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
