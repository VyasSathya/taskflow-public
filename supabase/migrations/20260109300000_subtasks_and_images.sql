-- VibeTasks: Subtasks JSON and Image Attachments
-- Adds inline subtasks and better image support for AI tools

-- ============================================
-- ADD SUBTASKS JSON FIELD
-- ============================================
-- Stores subtasks as JSON array within the task
-- Format: [{"id": "uuid", "title": "string", "done": boolean, "notes": "string"}]

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Add description field (separate from rich notes)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- ADD ATTACHMENT METADATA FOR AI
-- ============================================
-- Add fields to task_attachments for AI consumption

ALTER TABLE public.task_attachments
ADD COLUMN IF NOT EXISTS alt_text TEXT,
ADD COLUMN IF NOT EXISTS ai_description TEXT,
ADD COLUMN IF NOT EXISTS is_image BOOLEAN DEFAULT FALSE;

-- Update existing attachments to mark images
UPDATE public.task_attachments
SET is_image = TRUE
WHERE file_type LIKE 'image/%';

-- ============================================
-- FUNCTION: Get task with subtasks and images
-- ============================================

CREATE OR REPLACE FUNCTION get_task_with_details(task_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'notes', t.notes,
    'status', t.status,
    'priority', t.priority,
    'subtasks', COALESCE(t.subtasks, '[]'::jsonb),
    'context_notes', t.context_notes,
    'due_date', t.due_date,
    'created_at', t.created_at,
    'attachments', COALESCE(
      (SELECT json_agg(json_build_object(
        'id', a.id,
        'file_name', a.file_name,
        'file_type', a.file_type,
        'storage_path', a.storage_path,
        'is_image', a.is_image,
        'alt_text', a.alt_text,
        'ai_description', a.ai_description
      ))
      FROM public.task_attachments a
      WHERE a.task_id = t.id),
      '[]'::json
    )
  ) INTO result
  FROM public.tasks t
  WHERE t.id = task_uuid AND t.user_id = auth.uid();

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEX FOR SUBTASKS QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_subtasks ON public.tasks USING GIN (subtasks);
CREATE INDEX IF NOT EXISTS idx_attachments_is_image ON public.task_attachments(is_image);
