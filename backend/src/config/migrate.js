import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  console.log('⏳ Running database migrations...');
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  console.log('✅ Migrations completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Migration failed:', err);
      await pool.end();
      process.exit(1);
    });
}
