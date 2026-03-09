-- ============================================================================
-- ClipMint — Razorpay Integration Migration
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER the existing schema.sql.
-- Adds subscription/payment fields to profiles and creates payments table.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADD SUBSCRIPTION COLUMNS TO PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
        CHECK (subscription_status IN ('none', 'created', 'authenticated', 'active', 'paused', 'halted', 'cancelled', 'completed', 'expired')),
    ADD COLUMN IF NOT EXISTS plan_period TEXT DEFAULT 'monthly'
        CHECK (plan_period IN ('monthly', 'annual', 'one_time')),
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PAYMENTS TABLE — logs all payment events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_subscription_id TEXT,
    razorpay_signature TEXT,
    amount INTEGER NOT NULL, -- amount in paise (e.g., 49900 = ₹499)
    currency TEXT NOT NULL DEFAULT 'INR',
    plan TEXT NOT NULL CHECK (plan IN ('free', 'creator', 'pro', 'agency')),
    plan_period TEXT NOT NULL CHECK (plan_period IN ('monthly', 'annual', 'one_time')),
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS FOR PAYMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

-- Only server (service role) can insert payments — no client insert policy needed.
