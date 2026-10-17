-- Add notifications, recurring tasks, and advanced features
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. NOTIFICATIONS & REMINDERS
-- =====================================================

-- Add reminder fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Create notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  notification_type TEXT NOT NULL, -- 'due_time', 'reminder', 'overdue'
  device_token TEXT, -- For push notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
ON task_notifications(user_id, scheduled_for)
WHERE sent_at IS NULL;

-- RLS for notifications
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON task_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
ON task_notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON task_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON task_notifications FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 2. RECURRING TASKS
-- =====================================================

-- Add recurring task fields
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT, -- RRULE format (RFC 5545)
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB, -- Simplified: {type: 'daily'|'weekly'|'monthly', interval: 1, days: [0,1,2]}
ADD COLUMN IF NOT EXISTS parent_recurring_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;

-- Create index for recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_recurring
ON tasks(user_id, is_recurring)
WHERE is_recurring = TRUE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_recurring
ON tasks(parent_recurring_task_id)
WHERE parent_recurring_task_id IS NOT NULL;

COMMENT ON COLUMN tasks.recurrence_pattern IS 'Simplified recurrence: {type: "daily"|"weekly"|"monthly"|"yearly", interval: 1, days: [1,2,3], time: "09:00"}';

-- =====================================================
-- 3. SEARCH & FILTERING
-- =====================================================

-- Add full-text search index
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(notes, '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS idx_tasks_search
ON tasks USING GIN(search_vector);

-- =====================================================
-- 4. TIME TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER, -- Calculated when ended
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task
ON task_time_entries(task_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_user
ON task_time_entries(user_id, started_at DESC);

-- RLS for time entries
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entries"
ON task_time_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries"
ON task_time_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
ON task_time_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
ON task_time_entries FOR DELETE
USING (auth.uid() = user_id);

-- Add total time tracked to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER DEFAULT 0;

-- =====================================================
-- 5. TASK TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tasks JSONB NOT NULL, -- Array of task objects
  is_public BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user
ON task_templates(user_id);

-- RLS for templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates and public templates"
ON task_templates FOR SELECT
USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own templates"
ON task_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON task_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON task_templates FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 6. DEVICE TOKENS FOR PUSH NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  device_name TEXT,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user
ON device_tokens(user_id);

-- RLS for device tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device tokens"
ON device_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens"
ON device_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens"
ON device_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
ON device_tokens FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 7. QUICK CAPTURE / INBOX
-- =====================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_inbox BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_inbox
ON tasks(user_id, is_inbox)
WHERE is_inbox = TRUE;

-- =====================================================
-- 8. FUNCTIONS
-- =====================================================

-- Function to update task search vector (if needed manually)
CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate time entry duration
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_time_duration
BEFORE INSERT OR UPDATE ON task_time_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_time_entry_duration();

-- Function to update total time on task
CREATE OR REPLACE FUNCTION update_task_total_time()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET total_time_seconds = (
    SELECT COALESCE(SUM(duration_seconds), 0)
    FROM task_time_entries
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_time
AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
FOR EACH ROW
EXECUTE FUNCTION update_task_total_time();

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Compound index for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_date_completed
ON tasks(user_id, due_date, completed);

CREATE INDEX IF NOT EXISTS idx_tasks_user_priority
ON tasks(user_id, priority)
WHERE completed = FALSE;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE task_notifications IS 'Scheduled and sent notifications for tasks';
COMMENT ON TABLE task_time_entries IS 'Time tracking entries for tasks';
COMMENT ON TABLE task_templates IS 'Reusable task templates/checklists';
COMMENT ON TABLE device_tokens IS 'Push notification device tokens';
COMMENT ON COLUMN tasks.reminder_time IS 'Specific time to send reminder';
COMMENT ON COLUMN tasks.reminder_minutes_before IS 'Minutes before due_date to send reminder';
COMMENT ON COLUMN tasks.recurrence_rule IS 'iCalendar RRULE format for advanced recurring';
COMMENT ON COLUMN tasks.is_inbox IS 'Quick capture inbox tasks';
