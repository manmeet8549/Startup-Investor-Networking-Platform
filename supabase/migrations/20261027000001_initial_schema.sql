-- Founders Den MVP - Initial Migration
-- Iteration 1: Authentication, Profiles, Roles, Verification Queue

-- Enums
CREATE TYPE public.user_role AS ENUM (
    'founder',
    'investor',
    'mentor',
    'incubator',
    'admin'
);

CREATE TYPE public.user_status AS ENUM (
    'active',
    'suspended'
);

CREATE TYPE public.verification_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);

-- Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'founder',
    is_student BOOLEAN NOT NULL DEFAULT false,
    organization TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    status public.user_status NOT NULL DEFAULT 'active',
    verification_status public.verification_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for fast lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_verification ON public.profiles(verification_status);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Verification Logs / History
CREATE TABLE public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_requested public.user_role NOT NULL,
    organization TEXT,
    supporting_notes TEXT,
    status public.verification_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX idx_verification_requests_user ON public.verification_requests(user_id);

CREATE TRIGGER on_verification_requests_updated
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Security: Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies for Profiles
-- 1. Anyone authenticated can read active profiles
CREATE POLICY "Public read active profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (status = 'active');

-- 2. Users can read their own profile even if pending/suspended
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- 3. Users can update their own editable profile details
-- (Role and verification_status cannot be escalated by users)
CREATE POLICY "Users can update own profile fields"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        verification_status = (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
    );

-- 4. Admins have full access to profiles
CREATE POLICY "Admins full access to profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RLS Policies for Verification Requests
-- 1. Users can view their own verification requests
CREATE POLICY "Users read own verification requests"
    ON public.verification_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. Users can insert their own verification request
CREATE POLICY "Users insert own verification request"
    ON public.verification_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Admins full access to verification requests
CREATE POLICY "Admins full access to verification requests"
    ON public.verification_requests
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
