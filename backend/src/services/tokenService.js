import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token (64 hex chars = 32 bytes).
 */
export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a SHA-256 hash of a token string.
 */
export function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}
