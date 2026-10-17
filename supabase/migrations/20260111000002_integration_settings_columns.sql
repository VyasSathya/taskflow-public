-- Add additional columns to integration tables for settings UI
-- This extends the existing integration tables with more configuration options

-- GitHub integrations additional columns
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS enabled_events TEXT DEFAULT 'issues';
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS default_priority TEXT DEFAULT 'high';
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS default_project_tag TEXT;
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS auto_close_on_resolve BOOLEAN DEFAULT true;
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS tasks_created INTEGER DEFAULT 0;
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- Migrate 'enabled' to 'is_enabled' if it exists
UPDATE github_integrations SET is_enabled = enabled WHERE enabled IS NOT NULL;

-- Email integrations additional columns
ALTER TABLE email_integrations ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE email_integrations ADD COLUMN IF NOT EXISTS default_priority TEXT DEFAULT 'medium';
ALTER TABLE email_integrations ADD COLUMN IF NOT EXISTS allowed_senders TEXT;
ALTER TABLE email_integrations ADD COLUMN IF NOT EXISTS auto_classify BOOLEAN DEFAULT true;
ALTER TABLE email_integrations ADD COLUMN IF NOT EXISTS tasks_created INTEGER DEFAULT 0;
ALTER TABLE email_integrations ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- Migrate 'enabled' to 'is_enabled' if it exists
UPDATE email_integrations SET is_enabled = enabled WHERE enabled IS NOT NULL;

-- Slack integrations additional columns
ALTER TABLE slack_integrations ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE slack_integrations ADD COLUMN IF NOT EXISTS default_priority TEXT DEFAULT 'medium';
ALTER TABLE slack_integrations ADD COLUMN IF NOT EXISTS tasks_created INTEGER DEFAULT 0;
ALTER TABLE slack_integrations ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- Migrate 'enabled' to 'is_enabled' if it exists
UPDATE slack_integrations SET is_enabled = enabled WHERE enabled IS NOT NULL;

-- Create a unified webhook logs table for all integrations
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'github', 'email', 'slack', 'sentry'
  action TEXT NOT NULL, -- 'created', 'updated', 'closed', etc.
  resource TEXT NOT NULL, -- 'issue', 'email', 'message', etc.
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  ip_address TEXT,
  metadata JSONB, -- Store integration-specific data
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_type ON webhook_logs(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- RLS for webhook logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook logs" ON webhook_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert webhook logs" ON webhook_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own webhook logs" ON webhook_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Function to increment tasks_created counter
CREATE OR REPLACE FUNCTION increment_integration_tasks_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the appropriate integration table based on source_type
  IF NEW.source_type LIKE 'github%' THEN
    UPDATE github_integrations 
    SET tasks_created = tasks_created + 1, last_webhook_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.source_type LIKE 'email%' THEN
    UPDATE email_integrations 
    SET tasks_created = tasks_created + 1, last_webhook_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.source_type LIKE 'slack%' THEN
    UPDATE slack_integrations 
    SET tasks_created = tasks_created + 1, last_webhook_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.source_type = 'sentry' THEN
    UPDATE sentry_integrations 
    SET tasks_created = tasks_created + 1, last_webhook_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment task counts
DROP TRIGGER IF EXISTS trigger_increment_integration_tasks ON tasks;
CREATE TRIGGER trigger_increment_integration_tasks
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.source_type IS NOT NULL)
  EXECUTE FUNCTION increment_integration_tasks_created();
