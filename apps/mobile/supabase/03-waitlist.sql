-- ============================================
-- Waitlist
-- Collect emails before app launch
-- ============================================

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website', -- website, app, social, etc.
  referral_code TEXT, -- who referred them
  metadata JSONB DEFAULT '{}'::jsonb, -- extra data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (signup)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Policy: No one can read (protect emails)
-- Use service role or dashboard to export

-- Index for duplicate checking
CREATE INDEX IF NOT EXISTS waitlist_email_idx ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS waitlist_referral_idx ON public.waitlist(referral_code);

-- Function to join waitlist (handles duplicates gracefully)
CREATE OR REPLACE FUNCTION public.join_waitlist(
  p_email TEXT,
  p_source TEXT DEFAULT 'website',
  p_referral_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO public.waitlist (email, source, referral_code)
  VALUES (lower(trim(p_email)), p_source, p_referral_code)
  ON CONFLICT (email) DO NOTHING;

  IF FOUND THEN
    v_result := jsonb_build_object('success', true, 'message', 'Successfully joined waitlist');
  ELSE
    v_result := jsonb_build_object('success', false, 'message', 'Email already on waitlist');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
