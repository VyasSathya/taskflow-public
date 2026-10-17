-- Migration: Add error_context and feedback_context columns to tasks
-- These JSONB columns store structured error/feedback information attached to tasks
-- Part of the ultra-low-friction error/feedback capture system

-- Add error_context column (stores ErrorContext type as JSONB)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS error_context JSONB;

-- Add feedback_context column (stores FeedbackContext type as JSONB)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS feedback_context JSONB;

-- Add acknowledgment column (stores Acknowledgment type as JSONB)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS acknowledgment JSONB;

-- Add source_type column if not exists (enum-like text column)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_type TEXT;

-- Create index on source_type for filtering inbox items
CREATE INDEX IF NOT EXISTS idx_tasks_source_type ON tasks(source_type) WHERE source_type IS NOT NULL;

-- Create index on tasks with error_context for quick error queries
CREATE INDEX IF NOT EXISTS idx_tasks_has_error ON tasks((error_context IS NOT NULL)) WHERE error_context IS NOT NULL;

-- Create index on tasks with feedback_context for quick feedback queries
CREATE INDEX IF NOT EXISTS idx_tasks_has_feedback ON tasks((feedback_context IS NOT NULL)) WHERE feedback_context IS NOT NULL;

-- Create index on acknowledgment status for inbox filtering
CREATE INDEX IF NOT EXISTS idx_tasks_acknowledged ON tasks((acknowledgment->>'action')) WHERE acknowledgment IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN tasks.error_context IS 'Structured error information attached to this task (ErrorContext JSONB)';
COMMENT ON COLUMN tasks.feedback_context IS 'Structured feedback information attached to this task (FeedbackContext JSONB)';
COMMENT ON COLUMN tasks.acknowledgment IS 'Acknowledgment status for inbox triage (Acknowledgment JSONB)';
COMMENT ON COLUMN tasks.source_type IS 'Where this task originated from (manual, sentry_error, github_bug, etc.)';
