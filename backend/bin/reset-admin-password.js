#!/usr/bin/env node
import readline from 'readline';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { pool, db } from '../src/config/db.js';
import { users } from '../src/models/users.js';
import { recordAuditLog } from '../src/services/auditService.js';
import { validatePasswordBytes } from '../src/validations/authValidation.js';

function ask(question, isHidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (isHidden && process.stdin.isTTY) {
      process.stdout.write(question);
      let input = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (chunk) => {
        for (const char of chunk) {
          if (char === '\r' || char === '\n') {
            process.stdin.setRawMode(false);
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            rl.close();
            resolve(input);
            return;
          } else if (char === '\u0003') {
            process.exit(1);
          } else if (char === '\b' || char === '\x7f') {
            input = input.slice(0, -1);
          } else {
            input += char;
          }
        }
      };
      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.replace(/[\r\n]/g, '').trim());
      });
    }
  });
}

async function main() {
  console.log('\n=== SplitTrack: Reset Admin Password ===\n');

  const username = (await ask('Admin Username: ')).toLowerCase().trim();
  if (!username) {
    console.error('❌ Error: Username is required.');
    process.exit(1);
  }

  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));

  if (!adminUser) {
    console.error(`❌ Error: User "${username}" not found.`);
    process.exit(1);
  }

  if (adminUser.role !== 'admin') {
    console.error(`❌ Error: User "${username}" is not an administrator. This tool is only for admin accounts.`);
    process.exit(1);
  }

  const newPassword = await ask('New Password: ', true);
  if (!validatePasswordBytes(newPassword, username)) {
    console.error('❌ Error: Password must be 8-72 bytes and not equal to username.');
    process.exit(1);
  }

  const confirmPassword = await ask('Confirm New Password: ', true);
  if (newPassword !== confirmPassword) {
    console.error('❌ Error: Passwords do not match.');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await db
    .update(users)
    .set({
      passwordHash,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      passwordChangedAt: new Date(),
      // No notice banner for CLI reset
      passwordChangeNoticePending: false,
      passwordChangeMethod: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, adminUser.id));

  await recordAuditLog({
    actor: { id: null, role: 'system', name: 'CLI' },
    action: 'admin.password_reset',
    entityType: 'User',
    entityId: adminUser.id,
    reason: 'server command',
  });

  console.log(`\n✅ Password for admin "${username}" has been reset. All active sessions have been terminated.\n`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Failed to reset admin password:', err.message);
    await pool.end();
    process.exit(1);
  });
