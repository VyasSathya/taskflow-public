-- Add missing columns to tasks table for VibeTasks status flow
-- This migration adds the status, archived_at, and viber feature columns

-- Add status column (todo -> vibing -> done -> archived)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo'
CHECK (status IN ('todo', 'vibing', 'done', 'archived'));

-- Add archived_at timestamp
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add Viber feature columns
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS project_tag TEXT;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'human'
CHECK (created_by IN ('ai', 'human'));

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS context_notes TEXT;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS energy_required TEXT
CHECK (energy_required IN ('low', 'medium', 'high'));

-- Migrate existing data: Set status based on completed field
UPDATE public.tasks
SET status = CASE
  WHEN completed = TRUE THEN 'done'
  ELSE 'todo'
END
WHERE status IS NULL OR status = 'todo';

-- Set completed_at for done tasks that don't have it
UPDATE public.tasks
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_tag ON public.tasks(project_tag);

-- Add comment documenting the status flow
COMMENT ON COLUMN public.tasks.status IS 'Task status: todo -> vibing -> done -> archived';
COMMENT ON COLUMN public.tasks.context_notes IS 'Where I left off - AI progress, blockers, next steps';
COMMENT ON COLUMN public.tasks.energy_required IS 'Match tasks to current energy level';
