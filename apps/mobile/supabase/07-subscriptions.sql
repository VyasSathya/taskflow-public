-- ============================================
-- Subscriptions
-- Track RevenueCat subscription status
-- Updated via webhook from RevenueCat
-- ============================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- RevenueCat data
  revenuecat_id TEXT, -- RevenueCat app user ID
  entitlements TEXT[] DEFAULT '{}', -- Active entitlement identifiers

  -- Subscription details
  product_id TEXT, -- e.g., 'premium_monthly', 'premium_yearly'
  is_active BOOLEAN DEFAULT FALSE,
  is_trial BOOLEAN DEFAULT FALSE,

  -- Dates
  purchased_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  platform TEXT, -- 'ios', 'android', 'stripe'
  raw_data JSONB DEFAULT '{}'::jsonb, -- Full webhook payload
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies (users can only read their own subscription)
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for users - only service role via webhook

-- Function to check if user has premium (use in RLS policies)
CREATE OR REPLACE FUNCTION public.user_has_premium(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.subscriptions WHERE user_id = p_user_id),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user has specific entitlement
CREATE OR REPLACE FUNCTION public.user_has_entitlement(
  p_entitlement TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT p_entitlement = ANY(entitlements) FROM public.subscriptions WHERE user_id = p_user_id),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Auto-update updated_at
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS subscriptions_active_idx ON public.subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS subscriptions_revenuecat_idx ON public.subscriptions(revenuecat_id);

-- ============================================
-- RevenueCat Webhook Handler
-- Call this from your webhook endpoint (Edge Function or API route)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_revenuecat_webhook(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_event_type TEXT;
  v_user_id UUID;
  v_subscriber JSONB;
  v_entitlements TEXT[];
  v_is_active BOOLEAN;
BEGIN
  v_event_type := payload->>'event';
  v_subscriber := payload->'event'->'subscriber';

  -- Get user ID from RevenueCat attributes or app_user_id
  v_user_id := (v_subscriber->'subscriber_attributes'->>'$firebaseId')::UUID;

  IF v_user_id IS NULL THEN
    -- Try to use app_user_id if it's a UUID
    BEGIN
      v_user_id := (payload->'event'->>'app_user_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Could not determine user ID');
  END IF;

  -- Extract active entitlements
  SELECT array_agg(key)
  INTO v_entitlements
  FROM jsonb_each(v_subscriber->'entitlements')
  WHERE (value->>'expires_date')::timestamp > NOW()
     OR value->>'expires_date' IS NULL;

  v_is_active := array_length(v_entitlements, 1) > 0;

  -- Upsert subscription
  INSERT INTO public.subscriptions (
    user_id,
    revenuecat_id,
    entitlements,
    is_active,
    product_id,
    raw_data,
    updated_at
  ) VALUES (
    v_user_id,
    payload->'event'->>'app_user_id',
    COALESCE(v_entitlements, '{}'),
    v_is_active,
    payload->'event'->>'product_id',
    payload,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    entitlements = COALESCE(v_entitlements, '{}'),
    is_active = v_is_active,
    product_id = EXCLUDED.product_id,
    raw_data = EXCLUDED.raw_data,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'is_active', v_is_active);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
