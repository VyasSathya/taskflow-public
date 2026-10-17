-- Sentry Integration Schema
-- Adds fields to track Sentry issues and prevent duplicates

-- ============================================
-- ADD SENTRY FIELDS TO TASKS TABLE
-- ============================================

-- Sentry issue tracking fields
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS sentry_issue_id TEXT,
ADD COLUMN IF NOT EXISTS sentry_project TEXT,
ADD COLUMN IF NOT EXISTS sentry_error_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sentry_last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sentry_first_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sentry_level TEXT,
ADD COLUMN IF NOT EXISTS sentry_url TEXT;

-- Index for fast lookup by Sentry issue ID (for deduplication)
CREATE INDEX IF NOT EXISTS idx_tasks_sentry_issue_id ON public.tasks(sentry_issue_id);

-- ============================================
-- SENTRY INTEGRATIONS TABLE
-- ============================================
-- Stores per-user Sentry integration settings

CREATE TABLE IF NOT EXISTS public.sentry_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Webhook secret for verification
  webhook_secret TEXT NOT NULL,
  
  -- Settings
  is_enabled BOOLEAN DEFAULT TRUE,
  auto_create_tasks BOOLEAN DEFAULT TRUE,
  default_priority TEXT DEFAULT 'high' CHECK (default_priority IN ('none', 'low', 'medium', 'high')),
  
  -- Level mapping (which Sentry levels trigger task creation)
  -- 'fatal,error,warning,info,debug' - comma separated
  enabled_levels TEXT DEFAULT 'fatal,error',
  
  -- Optional: Default project tag for tasks
  default_project_tag TEXT,
  
  -- Stats
  tasks_created INTEGER DEFAULT 0,
  last_webhook_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for sentry_integrations
ALTER TABLE public.sentry_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sentry integration" ON public.sentry_integrations;
CREATE POLICY "Users manage own sentry integration"
  ON public.sentry_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for webhook lookup
CREATE INDEX IF NOT EXISTS idx_sentry_integrations_webhook_secret ON public.sentry_integrations(webhook_secret);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_sentry_integrations_updated_at ON public.sentry_integrations;
CREATE TRIGGER update_sentry_integrations_updated_at
  BEFORE UPDATE ON public.sentry_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SENTRY WEBHOOK LOG TABLE
-- ============================================
-- Logs webhook events for debugging and rate limiting

CREATE TABLE IF NOT EXISTS public.sentry_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Webhook metadata
  sentry_issue_id TEXT,
  action TEXT,
  resource TEXT,
  
  -- Result
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  
  -- For rate limiting
  ip_address TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for webhook logs
ALTER TABLE public.sentry_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own webhook logs" ON public.sentry_webhook_logs;
CREATE POLICY "Users view own webhook logs"
  ON public.sentry_webhook_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_sentry_webhook_logs_ip_created ON public.sentry_webhook_logs(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_sentry_webhook_logs_user_created ON public.sentry_webhook_logs(user_id, created_at);
