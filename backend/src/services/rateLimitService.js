import { eq, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { authRateLimits } from '../models/authRateLimits.js';

/**
 * Checks and increments a rate limit counter stored in PostgreSQL.
 * @param {string} key Unique identifier for the rate limit bucket (e.g. "login:ip:127.0.0.1")
 * @param {number} maxLimit Max allowed attempts in the window
 * @param {number} windowMs Window duration in milliseconds
 * @returns {Promise<{ allowed: boolean, remaining: number, retryAfterSeconds: number }>}
 */
export async function checkAndConsumeRateLimit(key, maxLimit, windowMs) {
  const now = new Date();

  // Try to find existing entry
  const [existing] = await db
    .select()
    .from(authRateLimits)
    .where(eq(authRateLimits.key, key));

  if (!existing) {
    await db
      .insert(authRateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoNothing();
    return { allowed: true, remaining: maxLimit - 1, retryAfterSeconds: 0 };
  }

  const windowAge = now.getTime() - new Date(existing.windowStart).getTime();

  if (windowAge > windowMs) {
    // Window expired, reset counter
    await db
      .update(authRateLimits)
      .set({ count: 1, windowStart: now })
      .where(eq(authRateLimits.key, key));
    return { allowed: true, remaining: maxLimit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxLimit) {
    const retryAfterSeconds = Math.ceil((windowMs - windowAge) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  // Increment within window
  await db
    .update(authRateLimits)
    .set({ count: existing.count + 1 })
    .where(eq(authRateLimits.key, key));

  return { allowed: true, remaining: maxLimit - (existing.count + 1), retryAfterSeconds: 0 };
}

/**
 * Checks if a key is currently rate-limited without consuming an attempt.
 */
export async function isRateLimited(key, maxLimit, windowMs) {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(authRateLimits)
    .where(eq(authRateLimits.key, key));

  if (!existing) return { isLimited: false, retryAfterSeconds: 0 };

  const windowAge = now.getTime() - new Date(existing.windowStart).getTime();
  if (windowAge > windowMs) {
    return { isLimited: false, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxLimit) {
    const retryAfterSeconds = Math.ceil((windowMs - windowAge) / 1000);
    return { isLimited: true, retryAfterSeconds };
  }

  return { isLimited: false, retryAfterSeconds: 0 };
}

/**
 * Resets a rate limit counter (e.g. after successful login).
 */
export async function resetRateLimit(key) {
  await db.delete(authRateLimits).where(eq(authRateLimits.key, key));
}

/**
 * Records a failed attempt for failure-only rate limits (e.g. recovery-code or admin password).
 */
export async function recordFailedAttempt(key, maxLimit, windowMs) {
  return checkAndConsumeRateLimit(key, maxLimit, windowMs);
}
