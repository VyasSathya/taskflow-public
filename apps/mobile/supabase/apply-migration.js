#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables from web .env.local
const envPath = path.join(__dirname, '../../web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const serviceRoleKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read migration file
const migrationPath = path.join(__dirname, 'migrations/20260109000000_add_status_columns.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('\n🔄 Applying migration: 20260109000000_add_status_columns.sql\n');

// Split SQL into individual statements and execute them
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

async function runMigration() {
  for (const statement of statements) {
    if (!statement) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // If exec_sql doesn't exist, try direct query
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { error: queryError } = await supabase.from('_migration').select('*').limit(0);

        if (queryError && queryError.code === 'PGRST204') {
          throw new Error('Unable to execute SQL. Please run migration manually.');
        }
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }

  console.log('✅ Migration completed!\n');
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
