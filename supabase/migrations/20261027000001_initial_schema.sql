-- Founders Den MVP - Initial Migration
-- Iteration 1: Authentication, Profiles, Roles, Verification Queue


-- Enums (Idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'founder',
            'investor',
            'mentor',
            'incubator',
            'admin'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM (
            'active',
            'suspended'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE public.verification_status AS ENUM (
            'pending',
            'verified',
            'rejected'
        );
    END IF;
END $$;

-- Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
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
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Verification Logs / History
CREATE TABLE IF NOT EXISTS public.verification_requests (
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

CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON public.verification_requests(user_id);

DROP TRIGGER IF EXISTS on_verification_requests_updated ON public.verification_requests;
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
DROP POLICY IF EXISTS "Public read active profiles" ON public.profiles;
CREATE POLICY "Public read active profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (status = 'active');

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
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

DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
CREATE POLICY "Admins full access to profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RLS Policies for Verification Requests
DROP POLICY IF EXISTS "Users read own verification requests" ON public.verification_requests;
CREATE POLICY "Users read own verification requests"
    ON public.verification_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own verification request" ON public.verification_requests;
CREATE POLICY "Users insert own verification request"
    ON public.verification_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins full access to verification requests" ON public.verification_requests;
CREATE POLICY "Admins full access to verification requests"
    ON public.verification_requests
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Auto-confirm newly created auth users so sign up sessions are immediately available
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email_confirmed_at IS NULL THEN
        NEW.email_confirmed_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
        CREATE TRIGGER on_auth_user_created_auto_confirm
            BEFORE INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_auto_confirm_user();
    END IF;
END $$;
