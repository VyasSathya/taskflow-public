# TaskFlow Edge Functions

Supabase Edge Functions for background jobs and automation.

## Functions

### 1. send-notifications

Sends push notifications for task reminders.

**Trigger:** Cron - Every minute
**Purpose:** Check for tasks with reminders due in the next 5 minutes and send push notifications to users' devices.

**How it works:**
1. Queries tasks with `reminder_time` within the next 5 minutes
2. Fetches active device tokens for each user
3. Sends push notifications (Expo Push for mobile, Web Push for web)
4. Marks notifications as sent in the database
5. Creates notification records in `task_notifications` table

### 2. generate-recurring-tasks

Generates task instances from recurring patterns.

**Trigger:** Cron - Daily at midnight (00:00 UTC)
**Purpose:** Create task instances for recurring tasks scheduled for the next day.

**How it works:**
1. Queries all active recurring tasks
2. Calculates next occurrence based on recurrence pattern
3. If next occurrence is tomorrow, creates a new task instance
4. Checks for existing instances to avoid duplicates
5. Respects recurrence end dates

## Deployment

### Deploy Functions

```bash
cd supabase

# Deploy send-notifications function
npx supabase functions deploy send-notifications

# Deploy generate-recurring-tasks function
npx supabase functions deploy generate-recurring-tasks
```

### Set Up Cron Triggers

You can set up cron triggers using the Supabase dashboard or pg_cron SQL:

#### Option 1: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Database → Extensions
3. Enable the `pg_cron` extension
4. Go to SQL Editor and run:

```sql
-- Send notifications every minute
SELECT cron.schedule(
  'send-notifications-cron',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://<your-project-ref>.supabase.co/functions/v1/send-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <your-anon-key>"}'::jsonb
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
        url:='https://<your-project-ref>.supabase.co/functions/v1/generate-recurring-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <your-anon-key>"}'::jsonb
    ) as request_id;
  $$
);
```

#### Option 2: Migration File

Create a migration file:

```bash
cd supabase
npx supabase migration new setup_cron_jobs
```

Add the SQL from Option 1 to the migration file, then apply:

```bash
npx supabase db push
```

### View Cron Jobs

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Unscheduling Cron Jobs

```sql
-- Unschedule by name
SELECT cron.unschedule('send-notifications-cron');
SELECT cron.unschedule('generate-recurring-tasks-cron');
```

## Environment Variables

Both functions require these environment variables (automatically available in Edge Functions):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has full database access)

These are automatically set by Supabase when you deploy the functions.

## Testing Functions Manually

You can invoke functions manually for testing:

```bash
# Test send-notifications
npx supabase functions invoke send-notifications --no-verify-jwt

# Test generate-recurring-tasks
npx supabase functions invoke generate-recurring-tasks --no-verify-jwt
```

Or using curl:

```bash
curl -X POST 'https://<your-project-ref>.supabase.co/functions/v1/send-notifications' \
  -H 'Authorization: Bearer <your-anon-key>' \
  -H 'Content-Type: application/json'
```

## Monitoring

View function logs in the Supabase dashboard:

1. Go to Edge Functions
2. Select the function
3. View Logs tab

## Production Considerations

### Push Notifications Integration

The current implementation logs notifications but doesn't actually send them. To integrate:

#### For Expo Push Notifications (Mobile):

```typescript
// In send-notifications/index.ts
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const message = {
  to: device.token,
  sound: 'default',
  title: 'Task Reminder',
  body: task.title,
  data: { taskId: task.id, type: 'reminder' },
};

await fetch(EXPO_PUSH_URL, {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});
```

#### For Web Push (Web App):

Use the Web Push API with VAPID keys. See: https://web.dev/push-notifications-overview/

### Error Handling

Both functions include try/catch error handling and log errors to the console. Monitor the logs regularly to catch issues.

### Performance

- **send-notifications**: Runs every minute, processes only tasks due in next 5 minutes
- **generate-recurring-tasks**: Runs once daily, processes only active recurring tasks

Both functions are optimized for performance and should handle thousands of tasks efficiently.
