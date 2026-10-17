-- Add calendar and time blocking fields to tasks table
-- These fields are needed for the calendar view functionality

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
ADD COLUMN IF NOT EXISTS recurrence_end TIMESTAMPTZ;

-- Add indexes for efficient calendar queries
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_time ON tasks(scheduled_time);

-- Comments
COMMENT ON COLUMN tasks.start_date IS 'When task becomes actionable (for scheduled/future tasks)';
COMMENT ON COLUMN tasks.duration_minutes IS 'Estimated duration for time blocking in calendar';
COMMENT ON COLUMN tasks.scheduled_time IS 'Specific time of day in HH:MM format';
COMMENT ON COLUMN tasks.recurrence_end IS 'When recurring task stops repeating';
