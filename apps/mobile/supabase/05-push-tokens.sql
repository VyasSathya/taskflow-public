-- ============================================
-- Push Notification Tokens
-- Store device tokens for push notifications
-- ============================================

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),

  -- Device info
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,

  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each user can only have one token per device
  UNIQUE(user_id, device_id)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Function to register/update push token
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token TEXT,
  p_platform TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  INSERT INTO public.push_tokens (
    user_id, token, platform, device_id, device_name, app_version
  ) VALUES (
    auth.uid(), p_token, p_platform, p_device_id, p_device_name, p_app_version
  )
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    token = EXCLUDED.token,
    platform = EXCLUDED.platform,
    device_name = EXCLUDED.device_name,
    app_version = EXCLUDED.app_version,
    active = TRUE,
    last_used_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate a token (on logout)
CREATE OR REPLACE FUNCTION public.deactivate_push_token(p_device_id TEXT)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.push_tokens
  SET active = FALSE
  WHERE user_id = auth.uid() AND device_id = p_device_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS push_tokens_active_idx ON public.push_tokens(active) WHERE active = TRUE;
