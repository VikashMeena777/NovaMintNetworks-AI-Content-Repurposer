-- ============================================================================
-- ClipMint — Supabase Database Schema
-- ============================================================================
-- Run this in Supabase SQL Editor to create all required tables.
-- Requires Supabase Auth to be enabled.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES — extends Supabase Auth users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'pro', 'agency')),
    clips_used INTEGER NOT NULL DEFAULT 0,
    clips_limit INTEGER NOT NULL DEFAULT 5,
    videos_used INTEGER NOT NULL DEFAULT 0,
    videos_limit INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. API_KEYS — developer API access
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the key (never store raw)
    key_prefix TEXT NOT NULL,      -- First 8 chars for identification (e.g., "cm_live_a1b2")
    name TEXT NOT NULL DEFAULT 'Default',
    last_used_at TIMESTAMPTZ,
    requests_today INTEGER NOT NULL DEFAULT 0,
    requests_limit INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. JOBS — video processing jobs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Input
    video_url TEXT,
    video_filename TEXT,
    video_duration_seconds REAL,
    source_type TEXT NOT NULL DEFAULT 'url' CHECK (source_type IN ('url', 'upload', 'drive')),
    
    -- Processing config
    caption_style TEXT NOT NULL DEFAULT 'hormozi' CHECK (caption_style IN (
        'hormozi', 'bounce', 'fade', 'glow', 'typewriter',
        'glitch', 'neon', 'colorful', 'minimal'
    )),
    max_clips INTEGER NOT NULL DEFAULT 10,
    target_platforms TEXT[] DEFAULT ARRAY['reels'], -- reels, shorts, feed, twitter
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued', 'downloading', 'transcribing', 'analyzing',
        'clipping', 'captioning', 'uploading', 'done', 'failed', 'cancelled'
    )),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    error_message TEXT,
    
    -- Results
    clips_count INTEGER DEFAULT 0,
    drive_folder_id TEXT,
    transcript_srt TEXT,
    viral_moments JSONB, -- AI-detected viral moments with scores
    
    -- GitHub Actions
    github_run_id TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_user ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created ON public.jobs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CLIPS — individual clips from a job
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Clip metadata
    clip_index INTEGER NOT NULL,
    filename TEXT NOT NULL,
    duration_seconds REAL,
    start_time REAL,
    end_time REAL,
    
    -- AI-generated content
    title TEXT,
    description TEXT,
    hashtags TEXT[],
    hook_caption TEXT,
    viral_score INTEGER CHECK (viral_score BETWEEN 0 AND 100),
    
    -- Storage
    drive_file_id TEXT,
    drive_url TEXT,
    thumbnail_url TEXT,
    
    -- Publishing
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN (
        'ready', 'scheduled', 'published', 'failed'
    )),
    published_platforms TEXT[],
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clips_job ON public.clips(job_id);
CREATE INDEX idx_clips_user ON public.clips(user_id);
CREATE INDEX idx_clips_score ON public.clips(viral_score DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- API Keys: users can manage their own keys
CREATE POLICY "Users can view own API keys"
    ON public.api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
    ON public.api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
    ON public.api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON public.api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Jobs: users can manage their own jobs
CREATE POLICY "Users can view own jobs"
    ON public.jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
    ON public.jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
    ON public.jobs FOR UPDATE
    USING (auth.uid() = user_id);

-- Clips: users can view their own clips
CREATE POLICY "Users can view own clips"
    ON public.clips FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own clips"
    ON public.clips FOR UPDATE
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PLAN LIMITS
-- ─────────────────────────────────────────────────────────────────────────────
-- Use this function to check if user can create a new job
CREATE OR REPLACE FUNCTION public.can_create_job(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_videos_used INTEGER;
    v_videos_limit INTEGER;
BEGIN
    SELECT plan, videos_used, videos_limit
    INTO v_plan, v_videos_used, v_videos_limit
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN v_videos_used < v_videos_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
