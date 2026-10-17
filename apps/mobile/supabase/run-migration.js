#!/usr/bin/env node
/**
 * Run Supabase migration
 * Usage: node run-migration.js <migration-file>
 */

const fs = require('fs');
const path = require('path');

// Read environment variables from web .env.local
const envPath = path.join(__dirname, '../../web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const serviceRoleKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

// Get migration file from command line argument
const migrationFile = process.argv[2] || 'migrations/20260109000000_add_status_columns.sql';
const migrationPath = path.join(__dirname, migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(`\n🔄 Running migration: ${path.basename(migrationFile)}\n`);

// Execute SQL using Supabase REST API
fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  },
  body: JSON.stringify({ query: sql })
})
.then(async res => {
  if (!res.ok) {
    // Try alternative approach using pg client if REST API doesn't work
    console.log('⚠️  REST API approach failed, trying direct connection...\n');
    return runWithPgClient(supabaseUrl, serviceRoleKey, sql);
  }
  return res.json();
})
.then(data => {
  console.log('✅ Migration completed successfully!\n');
  if (data) console.log(data);
})
.catch(err => {
  console.error('❌ Migration failed:', err.message);
  console.log('\n📝 To run manually:');
  console.log('1. Go to https://supabase.com/dashboard/project/cbkkztbcoitrfcleghfd/sql/new');
  console.log(`2. Copy and paste the SQL from: ${migrationPath}`);
  console.log('3. Click "Run"\n');
  process.exit(1);
});

async function runWithPgClient(supabaseUrl, serviceRoleKey, sql) {
  // Extract project ref from URL
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  console.log('\n📋 Manual migration required:');
  console.log(`\n1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log(`2. Copy the SQL from: ${migrationPath}`);
  console.log('3. Paste and click "Run"\n');

  throw new Error('Please run migration manually via Supabase Dashboard');
}
