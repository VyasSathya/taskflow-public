-- ============================================
-- FULL SETUP SCRIPT
-- Run this single file to set up everything
-- ============================================

-- ============================================
-- 1. USER PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{"push": true, "email": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view any profile" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- ============================================
-- 2. APP CONFIG
-- ============================================

CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config is publicly readable" ON public.config FOR SELECT USING (true);

INSERT INTO public.config (key, value, description) VALUES
  ('app_version_min', '1.0.0', 'Minimum supported app version'),
  ('app_version_latest', '1.0.0', 'Latest app version'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('maintenance_message', 'We are performing scheduled maintenance.', 'Maintenance message'),
  ('feature_social', 'true', 'Enable social features'),
  ('feature_premium', 'true', 'Enable premium features'),
  ('terms_url', 'https://yourapp.com/terms', 'Terms URL'),
  ('privacy_url', 'https://yourapp.com/privacy', 'Privacy URL'),
  ('support_email', 'support@yourapp.com', 'Support email')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 3. WAITLIST
-- ============================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website',
  referral_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS waitlist_email_idx ON public.waitlist(email);

-- ============================================
-- 4. INVITE CODES
-- ============================================

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  reward_type TEXT DEFAULT 'none',
  reward_value INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invite_code_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code_id, user_id)
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active invite codes" ON public.invite_codes FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));
CREATE POLICY "Users can create invite codes" ON public.invite_codes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can see their own code uses" ON public.invite_code_uses FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can use codes" ON public.invite_code_uses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS invite_codes_code_idx ON public.invite_codes(code);

-- ============================================
-- 5. PUSH TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens" ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push tokens" ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own push tokens" ON public.push_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own push tokens" ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens(user_id);

-- ============================================
-- 6. USER CONTENT
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  media_urls TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'friends')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content" ON public.user_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public content" ON public.user_content FOR SELECT
  USING (visibility = 'public' AND status = 'active');
CREATE POLICY "Users can insert own content" ON public.user_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content" ON public.user_content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content" ON public.user_content FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_content_updated_at ON public.user_content;
CREATE TRIGGER user_content_updated_at BEFORE UPDATE ON public.user_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS user_content_user_idx ON public.user_content(user_id);
CREATE INDEX IF NOT EXISTS user_content_type_idx ON public.user_content(content_type);

-- Storage bucket (may fail if bucket exists - that's ok)
INSERT INTO storage.buckets (id, name, public) VALUES ('user-media', 'user-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  revenuecat_id TEXT,
  entitlements TEXT[] DEFAULT '{}',
  product_id TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  is_trial BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  platform TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.user_has_premium(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_active FROM public.subscriptions WHERE user_id = p_user_id), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS subscriptions_active_idx ON public.subscriptions(is_active) WHERE is_active = TRUE;

-- ============================================
-- DONE!
-- ============================================
-- All tables created with RLS enabled.
-- Next steps:
-- 1. Copy your Supabase URL and anon key
-- 2. Add to .env files in both app and website
-- 3. Enable authentication providers in Supabase dashboard
