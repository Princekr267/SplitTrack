import { beforeAll, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { pool, db } from '../config/db.js';
import { runMigrations } from '../config/migrate.js';

beforeAll(async () => {
  // Run migrations on test DB
  await runMigrations();
});

beforeEach(async () => {
  // Clean up test data between test suites
  await db.execute(sql`
    TRUNCATE TABLE 
      audit_logs, 
      payments, 
      expense_splits, 
      expenses, 
      people, 
      groups, 
      recovery_codes,
      password_resets,
      reset_requests,
      auth_rate_limits,
      users 
    CASCADE;
  `);
});

afterAll(async () => {
  await pool.end();
});
