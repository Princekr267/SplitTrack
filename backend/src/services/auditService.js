import { db } from '../config/db.js';
import { auditLogs } from '../models/index.js';

// Fields forbidden from audit snapshots for security and privacy
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'newPassword',
  'currentPassword',
  'code',
  'codeHash',
  'code_hash',
  'token',
  'tokenHash',
  'token_hash',
  'shareTokenHash',
  'share_token_hash',
  'inviteCodeHash',
  'invite_code_hash',
  'recoveryCode',
  'recoveryCodes',
  'recovery_codes',
]);

/**
 * Strips sensitive data from an object before logging.
 */
export function sanitizeSnapshot(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeSnapshot);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizeSnapshot(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Creates an immutable audit log row.
 * If passed a transaction handle, this runs within that transaction, guaranteeing atomicity.
 * 
 * @param {object} params
 * @param {object} [params.actor] - { userId, role, name }
 * @param {string} params.action - e.g. 'CREATE_EXPENSE', 'auth.password_reset'
 * @param {string} params.entityType - 'Expense' | 'Payment' | 'Person' | 'Group' | 'User'
 * @param {string} params.entityId - Target entity UUID
 * @param {string} [params.groupId] - Associated group UUID
 * @param {string} [params.reason] - Optional reason for action
 * @param {object} [params.before] - Snapshot before mutation
 * @param {object} [params.after] - Snapshot after mutation
 * @param {string} [params.ipAddress] - Client IP address
 * @param {object} [tx=db] - Drizzle transaction handle
 */
export async function recordAuditLog(
  { actor, action, entityType, entityId, groupId, reason = null, before, after, ipAddress = '' },
  tx = db
) {
  const actorUserId = actor?.id || actor?.userId || null;
  const actorRole = actor?.role || 'anonymous';
  const actorName = actor?.name || 'System';

  await tx.insert(auditLogs).values({
    actorUserId,
    actorRole,
    actorName,
    action,
    entityType,
    entityId,
    groupId: groupId || null,
    reason: reason || null,
    before: before ? sanitizeSnapshot(before) : null,
    after: after ? sanitizeSnapshot(after) : null,
    ipAddress: ipAddress || '',
  });
}
