import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import env from '../config/env.js';
import { db } from '../config/db.js';
import { users } from '../models/index.js';

export const COOKIE_NAME = 'splittrack_token';

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session has expired or is invalid. Please log in again.',
        },
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'This account has been disabled or no longer exists.',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
