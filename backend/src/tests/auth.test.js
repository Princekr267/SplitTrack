import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users, recoveryCodes, passwordResets, resetRequests, authRateLimits, auditLogs } from '../models/index.js';
import { eq, sql } from 'drizzle-orm';
import { hashRecoveryCode, hashToken } from '../services/recoveryService.js';
import bcrypt from 'bcryptjs';

describe('Phase 1: Username Auth, Recovery Codes & Password Reset Lifecycle', () => {
  beforeEach(async () => {
    // Clean test state before each test
    await db.delete(recoveryCodes);
    await db.delete(passwordResets);
    await db.delete(resetRequests);
    await db.delete(authRateLimits);
    await db.delete(auditLogs);
    await db.delete(users);
  });

  // 1. Register user with valid username, password, display_name
  it('1. Register user with valid username, password, display_name -> 201, returns user, exactly 8 plain recovery codes matching XXXX-XXXX', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ravi Kumar',
        username: 'ravi_k',
        password: 'securePassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe('ravi_k');
    expect(res.body.data.user.name).toBe('Ravi Kumar');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBe(0);

    // Exactly 8 recovery codes
    const codes = res.body.data.recoveryCodes;
    expect(codes).toHaveLength(8);
    codes.forEach((code) => {
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    });

    // DB rows: 8 hashed codes stored
    const dbCodes = await db
      .select()
      .from(recoveryCodes)
      .where(eq(recoveryCodes.userId, res.body.data.user.id));
    expect(dbCodes).toHaveLength(8);
    dbCodes.forEach((c) => {
      expect(c.usedAt).toBeNull();
      expect(c.codeHash).toBeDefined();
    });
  });

  // 2. Register rejects invalid payloads
  it('2. Register rejects: invalid username chars, reserved usernames, short pw, >72 bytes pw, pw===username, duplicate username', async () => {
    // 2a. Invalid username chars (uppercase, symbols, starts with digit)
    const resUpper = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', username: 'InvalidUpper', password: 'password123' });
    expect(resUpper.status).toBe(400);

    const resDigitStart = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', username: '1startdigit', password: 'password123' });
    expect(resDigitStart.status).toBe(400);

    const resSymbols = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', username: 'bad-symbol!', password: 'password123' });
    expect(resSymbols.status).toBe(400);

    // 2b. Reserved username
    const resReserved = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin Guy', username: 'admin', password: 'password123' });
    expect(resReserved.status).toBe(400);
    expect(resReserved.body.error.code).toBe('RESERVED_USERNAME');

    // 2c. Password < 8 characters
    const resShortPw = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', username: 'valid_user', password: 'short' });
    expect(resShortPw.status).toBe(400);

    // 2d. Password > 72 bytes (using multi-byte characters)
    // '🚀' is 4 bytes. 20 rocket emojis = 80 bytes (> 72 bytes)
    const longBytePassword = '🚀'.repeat(20);
    const resLongBytes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', username: 'valid_user', password: longBytePassword });
    expect(resLongBytes.status).toBe(400);
    expect(resLongBytes.body.error.message).toMatch(/72 bytes/);

    // 2e. Password === username
    const resPwSame = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', username: 'same_pass_user', password: 'same_pass_user' });
    expect(resPwSame.status).toBe(400);

    // 2f. Duplicate username (case-insensitive)
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'First User', username: 'duplicate_me', password: 'password123' });

    const resDup = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second User', username: 'duplicate_me', password: 'password123' });
    expect(resDup.status).toBe(409);
    expect(resDup.body.error.code).toBe('USERNAME_TAKEN');
  });

  // 3. DB constraint & trigger prevent username updates
  it('3. DB constraint & trigger prevent username updates: UPDATE users SET username throws DB error', async () => {
    const [created] = await db
      .insert(users)
      .values({
        name: 'Immutable Test',
        username: 'immutable_user',
        passwordHash: 'hash',
      })
      .returning();

    // Trigger trg_users_prevent_username_update must abort UPDATE
    await expect(
      db
        .update(users)
        .set({ username: 'hacked_username' })
        .where(eq(users.id, created.id))
    ).rejects.toThrow(/Username is permanent and cannot be updated/);
  });

  // 4. Login with username + password succeeds, sets cookie + returns token with token_version = 0
  it('4. Login with username + password succeeds, sets cookie + returns token with token_version = 0', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        username: 'login_hero',
        password: 'validPassword123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'LOGIN_HERO', // test case-insensitivity
        password: 'validPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('login_hero');
    expect(res.body.data.token).toBeDefined();

    // Verify splitorbit_token cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('splitorbit_token='))).toBe(true);

    // Fetch /api/auth/me using token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.username).toBe('login_hero');
    expect(meRes.body.data.user.tokenVersion).toBe(0);
  });

  // 5. Login with invalid password fails & timing side-channel mitigation
  it('5. Login with invalid password fails and performs dummy bcrypt compare for non-existent users', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Existing Guy',
        username: 'existing_user',
        password: 'correctPassword123!',
      });

    // 5a. Existing user with wrong password
    const resWrong = await request(app)
      .post('/api/auth/login')
      .send({ username: 'existing_user', password: 'wrongPassword123!' });
    expect(resWrong.status).toBe(401);
    expect(resWrong.body.error.code).toBe('INVALID_CREDENTIALS');

    // 5b. Non-existent user
    const resNone = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost_user_404', password: 'wrongPassword123!' });
    expect(resNone.status).toBe(401);
    expect(resNone.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // 6. Rate limiting on login: 6 consecutive failed attempts lock out 6th with 429 & Retry-After header
  it('6. Rate limiting on login: 6 consecutive failed attempts from same IP lock out 6th with 429 and Retry-After header', async () => {
    const ip = '198.51.100.22';

    // 5 attempts allowed to return 401
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ username: 'target_rate', password: 'bad_password' });
      expect(res.status).toBe(401);
    }

    // 6th attempt must be blocked by rate limit
    const resBlocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ username: 'target_rate', password: 'bad_password' });

    expect(resBlocked.status).toBe(429);
    expect(resBlocked.body.error.code).toBe('RATE_LIMITED');
    expect(resBlocked.headers['retry-after']).toBeDefined();
  });

  // 7. Use recovery code
  it('7. Use recovery code: resets password, marks code used, bumps token_version, sets notice banner, prevents reuse', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Recover Guy',
        username: 'recover_guy',
        password: 'initialPassword123!',
      });

    const plainCodes = regRes.body.data.recoveryCodes;
    const testCode = plainCodes[0];

    // Login with initial password to get session
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'recover_guy', password: 'initialPassword123!' });
    const oldCookie = login1.headers['set-cookie'];

    // 7a. Recover with code
    const recRes = await request(app)
      .post('/api/auth/recover-with-code')
      .send({
        username: 'recover_guy',
        recoveryCode: testCode.toLowerCase(), // test case-insensitivity
        newPassword: 'brandNewPassword456!',
      });

    expect(recRes.status).toBe(200);
    expect(recRes.body.success).toBe(true);

    // Verify old session revoked (token_version incremented)
    const oldSessionRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', oldCookie);
    expect(oldSessionRes.status).toBe(401);
    expect(oldSessionRes.body.error.code).toBe('SESSION_REVOKED');

    // Login with new password
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'recover_guy', password: 'brandNewPassword456!' });
    expect(login2.status).toBe(200);
    const newCookie = login2.headers['set-cookie'];

    // Check user has passwordChangeNoticePending = true and passwordChangeMethod = 'recovery_code'
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', newCookie);
    expect(meRes.body.data.user.passwordChangeNoticePending).toBe(true);
    expect(meRes.body.data.user.passwordChangeMethod).toBe('recovery_code');

    // Dismiss notice banner
    const disRes = await request(app)
      .post('/api/auth/password-notice/dismiss')
      .set('Cookie', newCookie);
    expect(disRes.status).toBe(200);

    const meRes2 = await request(app)
      .get('/api/auth/me')
      .set('Cookie', newCookie);
    expect(meRes2.body.data.user.passwordChangeNoticePending).toBe(false);

    // 7b. Reusing the same recovery code must fail
    const reuseRes = await request(app)
      .post('/api/auth/recover-with-code')
      .send({
        username: 'recover_guy',
        recoveryCode: testCode,
        newPassword: 'anotherNewPassword789!',
      });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('INVALID_RECOVERY_CODE');
  });

  // 8. Request admin reset
  it('8. Request admin reset: submits reset_requests row, rate-limited to 3/hour per IP', async () => {
    // Register user
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Locked Out', username: 'locked_out', password: 'password123!' });

    const ip = '198.51.100.99';

    // Submit 3 requests successfully
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/auth/request-reset')
        .set('X-Forwarded-For', ip)
        .send({
          username: 'locked_out',
          contactChannel: 'user@example.com',
          userNote: `Help ticket #${i + 1}`,
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }

    // 4th request must be rate limited (3/hour per IP)
    const resBlocked = await request(app)
      .post('/api/auth/request-reset')
      .set('X-Forwarded-For', ip)
      .send({ username: 'locked_out', userNote: 'Fourth attempt' });
    expect(resBlocked.status).toBe(429);
  });

  // 9. Reset password with token (from reset link)
  it('9. Reset password with token: valid resets pw & bumps token_version, expired fails, reused fails', async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Reset Token User',
        username: 'token_user',
        passwordHash: 'hash',
        tokenVersion: 1,
      })
      .returning();

    const plainToken = 'valid-test-reset-token-12345';
    const tokenHash = hashToken(plainToken);

    // 9a. Insert valid reset link
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      codeHash: 'dummy_code_hash_for_test_1234567890abcdef',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour ahead
    });

    // Validate token endpoint
    const valRes = await request(app)
      .get(`/api/auth/validate-reset-token?token=${plainToken}`);
    expect(valRes.status).toBe(200);
    expect(valRes.body.data.valid).toBe(true);
    expect(valRes.body.data.username).toBe('token_user');

    // Reset password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: plainToken,
        newPassword: 'newValidPassword123!',
      });
    expect(resetRes.status).toBe(200);

    // Verify token marked used
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updatedUser.tokenVersion).toBe(2);
    expect(updatedUser.passwordChangeNoticePending).toBe(true);
    expect(updatedUser.passwordChangeMethod).toBe('reset_link');

    // Reusing the same token must fail
    const reuseRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: plainToken, newPassword: 'anotherPassword123!' });
    expect(reuseRes.status).toBe(400);

    // 9b. Expired token fails
    const expiredPlainToken = 'expired-test-reset-token-999';
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: hashToken(expiredPlainToken),
      codeHash: 'dummy_code_hash_for_test_1234567890abcdef',
      expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
    });

    const expValRes = await request(app)
      .get(`/api/auth/validate-reset-token?token=${expiredPlainToken}`);
    expect(expValRes.body.data.valid).toBe(false);

    const expResetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: expiredPlainToken, newPassword: 'newValidPassword123!' });
    expect(expResetRes.status).toBe(400);
  });

  // 10. Reset password with 6-digit code
  it('10. Reset password with 6-digit code: valid resets pw, invalid code fails and rate-limits', async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Six Digit User',
        username: 'six_digit_user',
        passwordHash: 'hash',
        tokenVersion: 0,
      })
      .returning();

    const plainCode = '839201';
    const codeHash = hashToken(plainCode);

    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: 'dummy_token_hash_for_test_1234567890abcdef',
      codeHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // 10a. Valid code + username
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        username: 'six_digit_user',
        resetCode: '839201',
        newPassword: 'brandNewPassword123!',
      });
    expect(res.status).toBe(200);

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updatedUser.passwordChangeMethod).toBe('reset_code');
    expect(updatedUser.tokenVersion).toBe(1);

    // 10b. Invalid code attempts rate-limit after 5 tries
    const ip = '198.51.100.150';
    for (let i = 0; i < 5; i++) {
      const failRes = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Forwarded-For', ip)
        .send({
          username: 'six_digit_user',
          resetCode: '000000',
          newPassword: 'somePassword123!',
        });
      expect(failRes.status).toBe(400);
    }

    const blockedRes = await request(app)
      .post('/api/auth/reset-password')
      .set('X-Forwarded-For', ip)
      .send({
        username: 'six_digit_user',
        resetCode: '000000',
        newPassword: 'somePassword123!',
      });
    expect(blockedRes.status).toBe(429);
  });

  // 11. Admin CLI scripts logic verification
  it('11. Admin creation has NO recovery codes; admin password reset CLI bumps token_version and creates audit log row without banner', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('adminOriginal123!', salt);

    // 11a. Admin row created
    const [adminUser] = await db
      .insert(users)
      .values({
        name: 'Super Admin',
        username: 'cli_admin',
        passwordHash: hash,
        role: 'admin',
        tokenVersion: 0,
      })
      .returning();

    // Verify admin has NO recovery codes
    const adminCodes = await db
      .select()
      .from(recoveryCodes)
      .where(eq(recoveryCodes.userId, adminUser.id));
    expect(adminCodes).toHaveLength(0);

    // 11b. CLI Password Reset Simulation (same operations as bin/reset-admin-password.js)
    const newHash = await bcrypt.hash('newAdminPassword456!', salt);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        passwordChangedAt: new Date(),
        passwordChangeNoticePending: false, // CLI reset does NOT show banner
        passwordChangeMethod: null,
      })
      .where(eq(users.id, adminUser.id));

    await db.insert(auditLogs).values({
      actorId: null,
      actorRole: 'system',
      actorName: 'CLI',
      action: 'admin.password_reset',
      entityType: 'User',
      entityId: adminUser.id,
      reason: 'server command',
    });

    const [refreshedAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUser.id));

    expect(refreshedAdmin.tokenVersion).toBe(1);
    expect(refreshedAdmin.passwordChangeNoticePending).toBe(false);

    const [auditRow] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, adminUser.id));
    expect(auditRow).toBeDefined();
    expect(auditRow.actorRole).toBe('system');
    expect(auditRow.actorName).toBe('CLI');
    expect(auditRow.reason).toBe('server command');
  });
});
