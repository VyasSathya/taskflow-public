-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permission to use cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Set up cron job to send notifications every minute
-- Note: Replace <your-project-ref> and <your-anon-key> with actual values from your Supabase project
-- You can find these in: Project Settings → API → Project URL and anon/public key

-- IMPORTANT: Update these values before deploying!
-- This is a template - you'll need to manually update the URL and key after deployment
-- Or set them as variables in your Supabase project settings

-- Send notifications every minute
SELECT cron.schedule(
  'send-notifications-cron',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        -- REPLACE THIS URL WITH YOUR ACTUAL PROJECT URL
        url:='https://your-project-ref.supabase.co/functions/v1/send-notifications',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer your-anon-key-here'
        )
    ) as request_id;
  $$
);

-- Generate recurring tasks daily at midnight UTC
SELECT cron.schedule(
  'generate-recurring-tasks-cron',
  '0 0 * * *', -- Daily at midnight UTC
  $$
  SELECT
    net.http_post(
        -- REPLACE THIS URL WITH YOUR ACTUAL PROJECT URL
        url:='https://your-project-ref.supabase.co/functions/v1/generate-recurring-tasks',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer your-anon-key-here'
        )
    ) as request_id;
  $$
);

-- View all cron jobs
-- SELECT * FROM cron.job;

-- To unschedule (for testing/debugging):
-- SELECT cron.unschedule('send-notifications-cron');
-- SELECT cron.unschedule('generate-recurring-tasks-cron');

-- To view cron job history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
