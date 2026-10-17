-- Feedback integrations migration
-- Adds support for GitHub, Email, and Slack feedback sources

-- Add source tracking fields to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_issue_id BIGINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_issue_number INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_repo TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS email_from TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_channel TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_user TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_ts TEXT;

-- Create index for GitHub issue deduplication
CREATE INDEX IF NOT EXISTS idx_tasks_github_issue_id ON tasks(github_issue_id) WHERE github_issue_id IS NOT NULL;

-- GitHub integrations table
CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_secret TEXT NOT NULL UNIQUE,
  github_secret TEXT, -- Optional: GitHub webhook signing secret
  repos TEXT[], -- Optional: specific repos to track
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Email integrations table
CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_secret TEXT NOT NULL UNIQUE,
  provider TEXT DEFAULT 'generic', -- mailgun, sendgrid, postmark, generic
  email_address TEXT, -- The email address configured to receive
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Slack integrations table
CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_secret TEXT NOT NULL UNIQUE,
  slack_signing_secret TEXT, -- Optional: Slack app signing secret
  allowed_channels TEXT[], -- Channels to monitor (empty = all)
  trigger_words TEXT[] DEFAULT ARRAY['feedback', 'bug', 'feature request', 'suggestion'],
  trigger_reactions TEXT[] DEFAULT ARRAY['eyes', 'memo', 'bug'],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS policies for integration tables
ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view own github integrations" ON github_integrations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own github integrations" ON github_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own github integrations" ON github_integrations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own github integrations" ON github_integrations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own email integrations" ON email_integrations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email integrations" ON email_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email integrations" ON email_integrations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own email integrations" ON email_integrations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own slack integrations" ON slack_integrations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own slack integrations" ON slack_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own slack integrations" ON slack_integrations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own slack integrations" ON slack_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Comment on source_type enum values
COMMENT ON COLUMN tasks.source_type IS 'Source of the task: manual, github_bug, github_feedback, email_bug, email_feedback, slack_bug, slack_feedback, sentry, ci';
