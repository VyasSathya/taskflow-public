-- ============================================
-- Invite Codes
-- Referral system with usage tracking
-- ============================================

-- Create invite_codes table
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Usage limits
  max_uses INTEGER DEFAULT NULL, -- null = unlimited
  current_uses INTEGER DEFAULT 0,

  -- Rewards
  reward_type TEXT DEFAULT 'none', -- none, premium_days, credits, etc.
  reward_value INTEGER DEFAULT 0,

  -- Status
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track who used which code
CREATE TABLE IF NOT EXISTS public.invite_code_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(code_id, user_id) -- Each user can only use a code once
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;

-- Policies for invite_codes
CREATE POLICY "Anyone can view active invite codes"
  ON public.invite_codes FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Users can create invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own invite codes"
  ON public.invite_codes FOR UPDATE
  USING (auth.uid() = creator_id);

-- Policies for invite_code_uses
CREATE POLICY "Users can see their own code uses"
  ON public.invite_code_uses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can use codes"
  ON public.invite_code_uses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to validate and use an invite code
CREATE OR REPLACE FUNCTION public.use_invite_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_code_record RECORD;
  v_result JSONB;
BEGIN
  -- Find the code
  SELECT * INTO v_code_record
  FROM public.invite_codes
  WHERE code = upper(trim(p_code))
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- Check if user already used this code
  IF EXISTS (
    SELECT 1 FROM public.invite_code_uses
    WHERE code_id = v_code_record.id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already used this code');
  END IF;

  -- Record the use
  INSERT INTO public.invite_code_uses (code_id, user_id)
  VALUES (v_code_record.id, auth.uid());

  -- Increment usage count
  UPDATE public.invite_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Code applied successfully',
    'reward_type', v_code_record.reward_type,
    'reward_value', v_code_record.reward_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a unique code for a user
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    v_code := upper(substr(md5(random()::text), 1, 6));

    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.invite_codes WHERE code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  -- Create the code
  INSERT INTO public.invite_codes (code, creator_id)
  VALUES (v_code, auth.uid());

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX IF NOT EXISTS invite_codes_code_idx ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS invite_codes_creator_idx ON public.invite_codes(creator_id);
