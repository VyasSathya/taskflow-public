-- Add Viber-Focused Fields to Tasks
-- Supports: status flow (todo/vibing/done), project tagging, AI tracking, energy levels

-- ============================================
-- ADD NEW COLUMNS
-- ============================================

-- Status: Replaces boolean completed with 3-state flow
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo'
  CHECK (status IN ('todo', 'vibing', 'done'));

-- Project Tag: Auto-detected from git/directory
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_tag TEXT;

-- Created By: Track if AI or human created task
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'human'
  CHECK (created_by IN ('ai', 'human'));

-- Context Notes: Track AI progress, blockers, next steps
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS context_notes TEXT;

-- Energy Required: Help vibers match tasks to their energy level
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS energy_required TEXT
  CHECK (energy_required IN ('low', 'medium', 'high'));

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Convert completed boolean to status
UPDATE public.tasks
SET status = CASE
  WHEN completed = true THEN 'done'
  ELSE 'todo'
END
WHERE status = 'todo'; -- Only migrate unmigrated tasks

-- Set completed_at for done tasks if not already set
UPDATE public.tasks
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_tag ON public.tasks(project_tag);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_energy_required ON public.tasks(energy_required);

-- Composite index for common query: get tasks by project and status
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_tag, status);

-- ============================================
-- DROP OLD COLUMN (AFTER MIGRATION)
-- ============================================

-- Keep completed column for backwards compatibility with mobile app
-- Will remove in future migration once mobile is updated
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS completed;

-- ============================================
-- UPDATE TRIGGER FOR AUTO-COMPLETE
-- ============================================

-- When status changes to 'done', set completed_at
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  END IF;

  -- If status changes FROM done, clear completed_at
  IF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;

  -- Keep completed boolean in sync with status (for backwards compat)
  NEW.completed = (NEW.status = 'done');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_completed_at_trigger ON public.tasks;
CREATE TRIGGER set_completed_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- ============================================
-- INSERT TRIGGER FOR NEW TASKS
-- ============================================

-- Set completed boolean when inserting new tasks
CREATE OR REPLACE FUNCTION sync_completed_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completed = (NEW.status = 'done');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_completed_insert_trigger ON public.tasks;
CREATE TRIGGER sync_completed_insert_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_completed_on_insert();
