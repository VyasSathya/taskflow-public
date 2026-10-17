-- Task Time Entries Table
-- For tracking time spent on tasks

-- ============================================
-- TASK TIME ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own time entries" ON public.task_time_entries;
CREATE POLICY "Users manage own time entries"
  ON public.task_time_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_task_time_entries_task_id ON public.task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_user_id ON public.task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_started_at ON public.task_time_entries(started_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to auto-update updated_at on task_time_entries
DROP TRIGGER IF EXISTS update_task_time_entries_updated_at ON public.task_time_entries;
CREATE TRIGGER update_task_time_entries_updated_at
  BEFORE UPDATE ON public.task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
