# TaskFlow: Deployment Guide

## Quick Start (5 Minutes to Live)

### 1. Run Database Migrations (2 min)
```bash
# Go to Supabase Dashboard → SQL Editor
# Run these two files:

# Migration 1: Add scheduling fields
```
Copy paste content from: `supabase/migrations/20260108_add_scheduling_fields.sql`
```sql
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS scheduled_time TIME,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_dates
ON tasks(start_date, due_date)
WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_tasks_recurring
ON tasks(recurrence_rule)
WHERE recurrence_rule IS NOT NULL;
```

# Migration 2: Add Google Calendar support
```sql
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_google_calendar_event
ON tasks(google_calendar_event_id)
WHERE google_calendar_event_id IS NOT NULL;
```

### 2. Deploy Web App (2 min)

#### Option A: Vercel (Recommended)
```bash
cd apps/web

# Install Vercel CLI (if not already)
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# Project name: taskflow
# Framework: Next.js
# Root directory: ./
```

Add environment variables in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Option B: Netlify
```bash
cd apps/web

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Build command: npm run build
# Publish directory: .next
```

### 3. Test Production (1 min)
1. Visit your deployed URL
2. Sign in with Google/Apple
3. Create a task
4. Check calendar view
5. Edit a task (test modal)
6. ✅ Done!

---

## Google Calendar Sync (Optional - 5 min)

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project"
   - Name: TaskFlow
   - Click "Create"

### 2. Enable Google Calendar API
1. In project dashboard, go to "APIs & Services" → "Library"
2. Search "Google Calendar API"
3. Click "Enable"

### 3. Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: TaskFlow Web
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://yourdomain.com
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/google-calendar/callback
   https://yourdomain.com/auth/google-calendar/callback
   ```
7. Click "Create"
8. Copy **Client ID** and **Client Secret**

### 4. Add Environment Variables
```bash
# In Vercel/Netlify or .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 5. Deploy Edge Function (Supabase)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy function
cd supabase/functions
supabase functions deploy google-calendar-sync
```

### 6. Test Calendar Sync
1. Go to Settings page
2. Click "Connect Google Calendar"
3. Authorize Google
4. Create a task with start date
5. Check Google Calendar - task should appear as event ✅

---

## Production Checklist

### Pre-Launch
- [ ] Run both database migrations
- [ ] Test auth flow (Apple + Google)
- [ ] Test task creation/editing
- [ ] Test calendar view
- [ ] Test recurring tasks
- [ ] Test on mobile (responsive)
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics (PostHog/Plausible)

### Launch Day
- [ ] Deploy to production
- [ ] Test all core features live
- [ ] Share on ProductHunt
- [ ] Post on Reddit r/productivity
- [ ] Email signup list (if any)

### Post-Launch
- [ ] Monitor errors (Sentry dashboard)
- [ ] Track signups (analytics)
- [ ] Collect feedback (user interviews)
- [ ] Fix critical bugs within 24h
- [ ] Plan iteration based on usage data

---

## Environment Variables Reference

### Required (All Environments)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional (Google Calendar Sync)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxx
```

### Development Only
```bash
NODE_ENV=development
```

---

## Monitoring & Analytics

### 1. Sentry (Error Tracking)
```bash
# Already configured in app
# Just add DSN to environment:
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 2. PostHog (Analytics)
```bash
# Already configured
# Add project key:
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 3. Plausible (Privacy-Friendly Alternative)
```html
<!-- Add to app/layout.tsx <head> -->
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

---

## Performance Optimization

### 1. Enable Caching
```typescript
// In next.config.js
module.exports = {
  images: {
    unoptimized: false,
    domains: ['your-supabase-url.supabase.co'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### 2. Database Indexes
Already created in migrations:
- ✅ idx_tasks_dates (calendar queries)
- ✅ idx_tasks_recurring (recurring tasks)
- ✅ idx_tasks_google_calendar_event (sync)

### 3. Query Optimization
Already implemented:
- ✅ TanStack Query caching (60s stale time)
- ✅ Optimistic UI updates
- ✅ Real-time subscriptions (filtered by user_id)

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Auth Not Working
1. Check Supabase Auth settings:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/**`
2. Verify Apple/Google OAuth credentials
3. Check middleware.ts is deployed

### Calendar Not Showing Tasks
1. Run migrations (check above)
2. Verify tasks have `due_date` or `start_date`
3. Check browser console for errors
4. Test with: Create task → Set due date → Go to calendar

### Google Calendar Sync Fails
1. Verify OAuth credentials are correct
2. Check redirect URI matches exactly
3. Enable Google Calendar API in Cloud Console
4. Check Edge Function logs: `supabase functions logs google-calendar-sync`

---

## Rollback Plan

If something breaks:

### 1. Revert Deployment
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

### 2. Revert Database (if needed)
```sql
-- Remove new columns (only if critical issue)
ALTER TABLE tasks
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS duration_minutes,
DROP COLUMN IF EXISTS scheduled_time,
DROP COLUMN IF EXISTS recurrence_rule,
DROP COLUMN IF EXISTS recurrence_end,
DROP COLUMN IF EXISTS google_calendar_event_id;
```

**Note**: This will lose data! Only do if absolutely necessary.

---

## Support

### Resources
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Google Calendar API: https://developers.google.com/calendar/api/v3/reference

### Common Issues
- **Build error**: Check package versions, clear cache
- **Auth error**: Verify Supabase settings and env vars
- **Database error**: Check migrations ran successfully
- **Calendar sync error**: Verify Google OAuth setup

---

## Success! 🎉

TaskFlow is now live. Monitor:
1. Error rate (Sentry)
2. User signups (Analytics)
3. Feature usage (PostHog events)
4. Feedback (user interviews)

**Ship fast. Iterate faster.** 🚀
