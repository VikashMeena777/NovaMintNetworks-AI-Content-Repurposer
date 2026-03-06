-- ============================================================================
-- ClipMint — Phase 4 Migration: Add increment_videos_used RPC function
-- ============================================================================
-- Run this in Supabase SQL Editor.
-- This function is called by the API Gateway when a new job is created.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_videos_used(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET videos_used = videos_used + 1,
        updated_at = now()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
