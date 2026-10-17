-- ============================================
-- User Content
-- Generic user-generated content storage
-- Customize based on your app's needs
-- ============================================

-- Create user_content table
CREATE TABLE IF NOT EXISTS public.user_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content type (customize: 'post', 'note', 'workout', 'recipe', etc.)
  content_type TEXT NOT NULL,

  -- Content data
  title TEXT,
  body TEXT,
  media_urls TEXT[] DEFAULT '{}', -- Array of media URLs
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible extra data

  -- Visibility
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'friends')),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_content ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own content"
  ON public.user_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public content"
  ON public.user_content FOR SELECT
  USING (visibility = 'public' AND status = 'active');

CREATE POLICY "Users can insert own content"
  ON public.user_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content"
  ON public.user_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content"
  ON public.user_content FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS user_content_updated_at ON public.user_content;
CREATE TRIGGER user_content_updated_at
  BEFORE UPDATE ON public.user_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS user_content_user_idx ON public.user_content(user_id);
CREATE INDEX IF NOT EXISTS user_content_type_idx ON public.user_content(content_type);
CREATE INDEX IF NOT EXISTS user_content_visibility_idx ON public.user_content(visibility) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS user_content_created_idx ON public.user_content(created_at DESC);

-- ============================================
-- Storage Bucket for User Media
-- ============================================

-- Create storage bucket for user uploads (run in Supabase dashboard if this fails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-media', 'user-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view public media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-media');
