/**
 * Simple migration runner. Tracks applied migrations in schema_migrations table.
 * Usage: node scripts/migrate.js
 * Idempotent — safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function run() {
  // Ensure the tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename varchar(255) PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const allFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

  // Superuser files are applied manually — remind the user and skip
  const superuserFiles = allFiles.filter(f => f.includes('_superuser'));
  if (superuserFiles.length > 0) {
    console.log('\n⚠️  The following migrations require the postgres superuser and must be run manually:');
    for (const f of superuserFiles) {
      console.log(`   sudo -u postgres psql -d ${process.env.DB_NAME || 'evershop'} -f migrations/${f}`);
    }
    console.log('');
  }

  const files = allFiles.filter(f => !f.includes('_superuser'));

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const { rows: applied } = await db.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.map(r => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  [skip]  ${file} (already applied)`);
      continue;
    }

    console.log(`  [run]   ${file} ...`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`  [done]  ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  [FAIL]  ${file}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('All migrations complete.');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
