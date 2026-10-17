-- ============================================
-- VibeTasks Status System Migration
-- ============================================
--
-- This migration implements the VibeTasks status flow system, which replaces
-- the simple boolean "completed" field with a 3-state workflow:
--   - 'todo'   : Task is not started
--   - 'vibing' : Task is in progress (actively being worked on)
--   - 'done'   : Task is completed
--
-- New columns added:
--   - status: The 3-state status enum
--   - context_notes: "Where I left off" notes for when you come back to a task
--   - project: Project grouping for organizing tasks
--
-- This migration is idempotent and safe to run multiple times.
-- ============================================

-- ============================================
-- 1. ADD STATUS COLUMN
-- ============================================
-- Add status column if it doesn't exist
-- Default is 'todo' for new tasks

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'tasks'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.tasks
        ADD COLUMN status TEXT DEFAULT 'todo';
    END IF;
END $$;

-- Drop existing check constraint if it exists (to recreate with proper naming)
DO $$
BEGIN
    -- Try to drop any existing unnamed or differently named constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'tasks'
        AND constraint_name = 'tasks_status_check'
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
    END IF;

    -- Also try to drop the old auto-generated constraint name
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%status%'
        AND constraint_schema = 'public'
    ) THEN
        -- PostgreSQL generates constraint names, we'll handle this in a try-catch
        NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Constraint doesn't exist, that's fine
        NULL;
END $$;

-- Add named check constraint for status values
DO $$
BEGIN
    ALTER TABLE public.tasks
    ADD CONSTRAINT chk_tasks_status
    CHECK (status IN ('todo', 'vibing', 'done'));
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, that's fine
        NULL;
END $$;

-- ============================================
-- 2. ADD CONTEXT_NOTES COLUMN
-- ============================================
-- For "where I left off" notes when returning to a task
-- Useful for vibing tasks to track progress and blockers

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS context_notes TEXT;

COMMENT ON COLUMN public.tasks.context_notes IS
    'Where I left off notes - useful for tracking progress on vibing tasks, blockers, and next steps';

-- ============================================
-- 3. ADD PROJECT COLUMN
-- ============================================
-- For grouping tasks by project
-- Supports project-based organization and filtering

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS project TEXT;

COMMENT ON COLUMN public.tasks.project IS
    'Project grouping - can be auto-detected from git/directory or manually set';

-- ============================================
-- 4. MIGRATE EXISTING DATA
-- ============================================
-- Convert completed boolean to status:
--   completed = true  -> status = 'done'
--   completed = false -> status = 'todo'
--
-- Only update rows where status hasn't been set yet

UPDATE public.tasks
SET status = CASE
    WHEN completed = true THEN 'done'
    ELSE 'todo'
END
WHERE status IS NULL OR status = '';

-- Ensure all NULL status values default to 'todo'
UPDATE public.tasks
SET status = 'todo'
WHERE status IS NULL;

-- ============================================
-- 5. SET COMPLETED_AT FOR DONE TASKS
-- ============================================
-- Backfill completed_at for tasks marked as done that don't have it set

UPDATE public.tasks
SET completed_at = COALESCE(completed_at, updated_at, created_at)
WHERE status = 'done' AND completed_at IS NULL;

-- ============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index on status for filtering tasks by state
CREATE INDEX IF NOT EXISTS idx_tasks_status
ON public.tasks(status);

-- Index on project for project-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_project
ON public.tasks(project);

-- Composite index for common query: get user's tasks by status
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
ON public.tasks(user_id, status);

-- Composite index for project and status (filter tasks in a project by state)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
ON public.tasks(project, status);

-- Partial index for active tasks (todo and vibing only)
CREATE INDEX IF NOT EXISTS idx_tasks_active
ON public.tasks(user_id, status, due_date)
WHERE status IN ('todo', 'vibing');

-- ============================================
-- 7. UPDATE TRIGGERS FOR STATUS SYNC
-- ============================================
-- Keep completed boolean in sync with status for backwards compatibility
-- When status changes:
--   'done' -> completed = true, set completed_at
--   'todo' or 'vibing' -> completed = false, clear completed_at

CREATE OR REPLACE FUNCTION sync_status_with_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'done', set completed = true and timestamp
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        NEW.completed := true;
        NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    END IF;

    -- When status changes FROM 'done' to something else, clear completed
    IF NEW.status != 'done' AND (OLD.status = 'done') THEN
        NEW.completed := false;
        NEW.completed_at := NULL;
    END IF;

    -- Ensure completed matches status (for direct status updates)
    IF NEW.status = 'done' THEN
        NEW.completed := true;
    ELSE
        NEW.completed := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_status_completed ON public.tasks;

-- Create trigger for UPDATE operations
CREATE TRIGGER trigger_sync_status_completed
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION sync_status_with_completed();

-- ============================================
-- 8. INSERT TRIGGER FOR NEW TASKS
-- ============================================
-- Sync completed boolean when inserting new tasks

CREATE OR REPLACE FUNCTION sync_status_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completed based on status for new tasks
    NEW.completed := (NEW.status = 'done');

    -- Set completed_at if status is done
    IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
        NEW.completed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_status_on_insert ON public.tasks;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_sync_status_on_insert
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION sync_status_on_insert();

-- ============================================
-- 9. HANDLE COMPLETED BOOLEAN UPDATES
-- ============================================
-- When completed is updated directly (for backwards compat),
-- sync the status accordingly

CREATE OR REPLACE FUNCTION sync_completed_to_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If completed changed but status didn't change correspondingly
    IF NEW.completed IS DISTINCT FROM OLD.completed THEN
        IF NEW.completed = true AND NEW.status != 'done' THEN
            NEW.status := 'done';
            NEW.completed_at := COALESCE(NEW.completed_at, NOW());
        ELSIF NEW.completed = false AND NEW.status = 'done' THEN
            NEW.status := 'todo';
            NEW.completed_at := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_completed_to_status ON public.tasks;

-- Create trigger for UPDATE operations (runs after status sync)
CREATE TRIGGER trigger_sync_completed_to_status
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION sync_completed_to_status();

-- ============================================
-- 10. RLS POLICIES (NO CHANGES NEEDED)
-- ============================================
-- The existing RLS policy "Users manage own tasks" covers all columns
-- No additional policies are needed for the new columns

-- ============================================
-- 11. OPTIONAL: DROP OLD COMPLETED COLUMN
-- ============================================
-- Keeping completed column for backwards compatibility with existing code
-- Uncomment the line below to remove it once all apps are updated
--
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS completed;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.tasks.status IS
    'VibeTasks status flow: todo (not started), vibing (in progress), done (completed)';

-- ============================================
-- VERIFICATION QUERY (for manual testing)
-- ============================================
-- Run this to verify migration was successful:
--
-- SELECT
--     column_name,
--     data_type,
--     column_default,
--     is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'tasks'
-- AND column_name IN ('status', 'context_notes', 'project')
-- ORDER BY column_name;
--
-- Check constraint exists:
-- SELECT * FROM information_schema.table_constraints
-- WHERE table_name = 'tasks' AND constraint_type = 'CHECK';
--
-- Check indexes exist:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname LIKE '%status%';
