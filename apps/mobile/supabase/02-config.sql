-- ============================================
-- App Configuration
-- Key-value store for app settings, feature flags, URLs
-- ============================================

-- Create config table
CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read config
CREATE POLICY "Config is publicly readable"
  ON public.config FOR SELECT
  USING (true);

-- Policy: Only service role can modify (use Supabase dashboard or server-side)
-- No INSERT/UPDATE/DELETE policies = only service_role can modify

-- Insert default config values
INSERT INTO public.config (key, value, description) VALUES
  ('app_version_min', '1.0.0', 'Minimum supported app version'),
  ('app_version_latest', '1.0.0', 'Latest app version'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('maintenance_message', 'We are performing scheduled maintenance. Please try again later.', 'Message shown during maintenance'),
  ('feature_social', 'true', 'Enable social features'),
  ('feature_premium', 'true', 'Enable premium features'),
  ('terms_url', 'https://yourapp.com/terms', 'Terms of service URL'),
  ('privacy_url', 'https://yourapp.com/privacy', 'Privacy policy URL'),
  ('support_email', 'support@yourapp.com', 'Support email address')
ON CONFLICT (key) DO NOTHING;

-- Helper function to get config value
CREATE OR REPLACE FUNCTION public.get_config(config_key TEXT)
RETURNS TEXT AS $$
  SELECT value FROM public.config WHERE key = config_key;
$$ LANGUAGE sql STABLE;
