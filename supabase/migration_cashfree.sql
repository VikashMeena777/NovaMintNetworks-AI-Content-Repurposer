-- ============================================================================
-- ClipMint — Cashfree Migration (from Razorpay)
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER the existing schema.sql + migration_razorpay.sql.
-- Renames Razorpay columns to Cashfree equivalents.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RENAME PROFILE COLUMNS: Razorpay → Cashfree
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    RENAME COLUMN razorpay_customer_id TO cashfree_customer_id;

ALTER TABLE public.profiles
    RENAME COLUMN razorpay_subscription_id TO cashfree_subscription_id;

ALTER TABLE public.profiles
    RENAME COLUMN razorpay_payment_id TO cashfree_order_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RENAME PAYMENTS TABLE COLUMNS: Razorpay → Cashfree
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.payments
    RENAME COLUMN razorpay_payment_id TO cashfree_order_id;

ALTER TABLE public.payments
    RENAME COLUMN razorpay_order_id TO cashfree_payment_id;

ALTER TABLE public.payments
    RENAME COLUMN razorpay_subscription_id TO cf_payment_id;

-- Drop the razorpay_signature column (Cashfree uses webhook signature verification instead)
ALTER TABLE public.payments
    DROP COLUMN IF EXISTS razorpay_signature;
