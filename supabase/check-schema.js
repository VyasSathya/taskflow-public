// Quick script to check if tables exist and apply migration if needed
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = (process.env.SUPABASE_URL || '');
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndApplyMigration() {
  // Check if task_notifications table exists
  const { data, error } = await supabase
    .from('task_notifications')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('Tables do not exist. Migration needs to be applied.');
    console.log('Please run the SQL migration manually in Supabase Dashboard > SQL Editor');
    console.log('File: supabase/migrations/20260108_add_notifications_and_recurring.sql');
  } else if (error) {
    console.log('Error checking schema:', error.message);
  } else {
    console.log('Migration already applied! Tables exist.');
  }
}

checkAndApplyMigration();
