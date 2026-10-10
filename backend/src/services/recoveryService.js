import crypto from 'crypto';
import env from '../config/env.js';

// 32-character unambiguous alphabet (no 0, O, 1, I, L)
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Normalizes a recovery or reset code by removing dashes/whitespace and uppercasing.
 */
export function normalizeCode(code) {
  if (!code || typeof code !== 'string') return '';
  return code.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Formats an 8-character normalized code into XXXX-XXXX.
 */
export function formatCode(normalized) {
  if (!normalized || normalized.length !== 8) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

/**
 * Generates a single cryptographically secure 8-character code from the unambiguous alphabet.
 */
export function generateRawCode() {
  let result = '';
  for (let i = 0; i < 8; i++) {
    const idx = crypto.randomInt(0, RECOVERY_ALPHABET.length);
    result += RECOVERY_ALPHABET[idx];
  }
  return result;
}

/**
 * Hashes a code using HMAC-SHA256 with the secret RECOVERY_PEPPER.
 */
export function hashRecoveryCode(code) {
  const normalized = normalizeCode(code);
  return crypto
    .createHmac('sha256', env.RECOVERY_PEPPER)
    .update(normalized)
    .digest('hex');
}

/**
 * Constant-time comparison between code input and stored HMAC hash.
 */
export function verifyRecoveryCode(code, storedHash) {
  if (!code || !storedHash) return false;
  const computedHash = hashRecoveryCode(code);
  const a = Buffer.from(computedHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generates exactly 8 recovery codes for a normal user registration.
 * Returns array of objects: { plain: 'XXXX-XXXX', hash: string }
 */
export function generateEightRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const raw = generateRawCode();
    codes.push({
      plain: formatCode(raw),
      hash: hashRecoveryCode(raw),
    });
  }
  return codes;
}

/**
 * Generates a 32-byte secure random token (64 hex characters) for admin reset links.
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a reset link token with SHA-256.
 */
export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const hashToken = hashResetToken;

/**
 * Generates an 8-character short code for admin resets.
 */
export function generateAdminShortCode() {
  const raw = generateRawCode();
  return {
    plain: formatCode(raw),
    hash: hashRecoveryCode(raw),
  };
}
