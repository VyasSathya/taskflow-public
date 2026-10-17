-- Create storage bucket for task attachments
-- This needs to be run manually in Supabase Dashboard > Storage

-- Run this SQL in Supabase SQL Editor:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('task-attachments', 'task-attachments', false)
-- ON CONFLICT (id) DO NOTHING;

-- Then set up RLS policies for the bucket:

-- 1. Allow authenticated users to upload files to their own folder
-- CREATE POLICY "Users can upload to own folder"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'task-attachments' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- 2. Allow users to read their own files
-- CREATE POLICY "Users can read own files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'task-attachments' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- 3. Allow users to delete their own files
-- CREATE POLICY "Users can delete own files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'task-attachments' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Note: Run these in Supabase Dashboard > SQL Editor
-- Storage buckets and policies cannot be created via migrations automatically
