#!/bin/bash
# Apply migration using psql
# Usage: bash apply-migration.sh

SUPABASE_DB_URL="postgresql://postgres.[your-project-ref]:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "Applying notifications and recurring tasks migration..."

psql "$SUPABASE_DB_URL" -f migrations/20260108_add_notifications_and_recurring.sql

if [ $? -eq 0 ]; then
    echo "Migration applied successfully!"
else
    echo "Migration failed. You can also:"
    echo "1. Go to https://supabase.com/dashboard/project/cbkkztbcoitrfcleghfd/sql/new"
    echo "2. Copy and paste the contents of migrations/20260108_add_notifications_and_recurring.sql"
    echo "3. Click 'Run'"
fi
