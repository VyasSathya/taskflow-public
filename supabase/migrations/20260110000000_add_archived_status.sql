-- ============================================
-- Add 'archived' to status constraint
-- ============================================
-- VibeTasks status flow: todo -> vibing -> done -> archived

-- Drop existing check constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_status;

-- Add updated check constraint with 'archived'
ALTER TABLE public.tasks
ADD CONSTRAINT chk_tasks_status
CHECK (status IN ('todo', 'vibing', 'done', 'archived'));

-- Add archived_at column if not exists
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for archived tasks
CREATE INDEX IF NOT EXISTS idx_tasks_archived
ON public.tasks(archived_at)
WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.tasks.status IS
    'VibeTasks status flow: todo (not started), vibing (in progress), done (completed), archived';
