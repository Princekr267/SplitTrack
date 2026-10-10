#!/usr/bin/env node
import 'dotenv/config';
import { runIntegrityCheck } from '../src/services/integrityService.js';
import { pool } from '../src/config/db.js';

async function main() {
  console.log('🔍 Running SplitOrbit Database Integrity Check...');
  try {
    const report = await runIntegrityCheck(null);
    console.log(`\nIntegrity Status: ${report.status === 'clean' ? '✅ CLEAN' : '❌ CORRUPTED'}`);
    console.log(`Duration: ${report.durationMs}ms`);
    console.log(`Checked at: ${new Date(report.checkedAt).toLocaleString()}`);
    console.log(`Issues found: ${report.issues.length}`);

    if (report.issues.length > 0) {
      console.log('\n--- DETECTED ISSUES ---');
      report.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.check}] ${issue.message}`);
      });
      process.exit(1);
    } else {
      console.log('\nAll invariants held: 0 net balance sum, valid splits, no cross-references.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Failed to run integrity check:', error);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
