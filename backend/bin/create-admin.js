#!/usr/bin/env node
import readline from 'readline';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
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
  console.log('\n=== SplitPrism: Create Admin Account ===\n');

  const username = (await ask('Admin Username: ')).toLowerCase().trim();
  if (!username || !/^[a-z][a-z0-9_]{2,19}$/.test(username)) {
    console.error('❌ Error: Username must be 3-20 characters, lowercase letters, digits, underscores, starting with a letter.');
    process.exit(1);
  }

  // Idempotent protection: refuse if username exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));

  if (existing) {
    console.error(`❌ Error: User with username "${username}" already exists.`);
    process.exit(1);
  }

  const name = (await ask('Display Name: ')).trim();
  if (!name || name.length < 2) {
    console.error('❌ Error: Display name must be at least 2 characters.');
    process.exit(1);
  }

  const email = (await ask('Email (optional, press Enter to skip): ')).trim() || null;
  const phone = (await ask('Phone (optional, press Enter to skip): ')).trim() || null;

  const password = await ask('Password: ', true);
  if (!validatePasswordBytes(password, username)) {
    console.error('❌ Error: Password must be 8-72 bytes and not equal to username.');
    process.exit(1);
  }

  const confirmPassword = await ask('Confirm Password: ', true);
  if (password !== confirmPassword) {
    console.error('❌ Error: Passwords do not match.');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [newAdmin] = await db
    .insert(users)
    .values({
      name,
      username,
      email,
      phone,
      passwordHash,
      role: 'admin',
      isActive: true,
      tokenVersion: 0,
    })
    .returning();

  await recordAuditLog({
    actor: { id: newAdmin.id, role: 'admin', name: newAdmin.name },
    action: 'admin.create',
    entityType: 'User',
    entityId: newAdmin.id,
    reason: 'server command',
  });

  console.log(`\n✅ Admin account "${username}" created successfully with NO recovery codes.\n`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Failed to create admin:', err.message);
    await pool.end();
    process.exit(1);
  });
