import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../config/db.js';
import { users } from '../models/index.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

import bcrypt from 'bcryptjs';

describe('adminController: System stats, User management & Audit trail inspection', () => {
  it('enforces requireAdmin guard: forbids regular users and unauthenticated requests', async () => {
    // 1. Unauthenticated request
    const unauthRes = await request(app).get('/api/admin/stats');
    expect(unauthRes.status).toBe(401);

    // 2. Regular user request
    const [regularUser] = await db
      .insert(users)
      .values({
        name: 'Normal User',
        username: 'regular_user',
        email: 'regular_user@splittrack.test',
        passwordHash: 'hash',
        role: 'user',
      })
      .returning();

    const userToken = jwt.sign({ userId: regularUser.id }, env.JWT_SECRET, { expiresIn: '1h' });

    const forbiddenRes = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [`splittrack_token=${userToken}`]);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
  });

  it('allows admin to fetch system stats, list users, and toggle user active status', async () => {
    // 1. Create Admin
    const passwordHash = await bcrypt.hash('adminPassword123', 10);
    const [adminUser] = await db
      .insert(users)
      .values({
        name: 'System Superadmin',
        username: 'system_superadmin',
        email: 'superadmin@splittrack.test',
        passwordHash,
        role: 'admin',
      })
      .returning();

    const adminToken = jwt.sign({ userId: adminUser.id }, env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Create Target User to toggle
    const [targetUser] = await db
      .insert(users)
      .values({
        name: 'Target Account',
        username: 'target_account',
        email: 'target_account@splittrack.test',
        passwordHash,
        isActive: true,
      })
      .returning();

    // 3. Admin fetches stats
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [`splittrack_token=${adminToken}`]);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data.users.total).toBeGreaterThanOrEqual(2);
    expect(statsRes.body.data.expenses).toBeDefined();

    // 4. Admin lists users with search
    const usersRes = await request(app)
      .get('/api/admin/users?search=Target')
      .set('Cookie', [`splittrack_token=${adminToken}`]);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.data.users.length).toBeGreaterThanOrEqual(1);
    expect(usersRes.body.data.users[0].email).toBe('target_account@splittrack.test');

    // 5. Admin toggles user active status to false
    const toggleRes = await request(app)
      .patch(`/api/admin/users/${targetUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Account violation review',
        currentPassword: 'adminPassword123',
      });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isActive).toBe(false);

    // Verify self-deactivation is forbidden
    const selfDeactRes = await request(app)
      .patch(`/api/admin/users/${adminUser.id}/status`)
      .set('Cookie', [`splittrack_token=${adminToken}`])
      .send({
        isActive: false,
        reason: 'Attempt self deactivation',
        currentPassword: 'adminPassword123',
      });

    expect(selfDeactRes.status).toBe(400);
    expect(selfDeactRes.body.error.code).toBe('CANNOT_SELF_DEACTIVATE');

    // 6. Admin queries audit logs
    const auditRes = await request(app)
      .get('/api/admin/audit-logs?action=admin.user.disable')
      .set('Cookie', [`splittrack_token=${adminToken}`]);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.logs.length).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data.logs[0].entityId).toBe(targetUser.id);
  });
});
