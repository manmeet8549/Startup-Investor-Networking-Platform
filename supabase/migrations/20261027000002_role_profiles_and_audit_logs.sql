-- Founders Den MVP - Migration 0002
-- Iteration 3: Role Profiles (Founder, Investor, Mentor, Incubator) and Audit Logs

-- 1. Founder Profiles
CREATE TABLE IF NOT EXISTS public.founder_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    headline TEXT,
    linkedin_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Investor Profiles
CREATE TABLE IF NOT EXISTS public.investor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    firm_name TEXT,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    stages TEXT[] NOT NULL DEFAULT '{}',
    ticket_min NUMERIC(15,2) NOT NULL DEFAULT 0,
    ticket_max NUMERIC(15,2) NOT NULL DEFAULT 0,
    regions TEXT[] NOT NULL DEFAULT '{}',
    business_models TEXT[] NOT NULL DEFAULT '{}',
    thesis TEXT,
    accredited BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_ticket_range CHECK (ticket_min <= ticket_max)
);

-- 3. Mentor Profiles
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    expertise TEXT[] NOT NULL DEFAULT '{}',
    experience INTEGER NOT NULL DEFAULT 0,
    linkedin_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Incubator Profiles
CREATE TABLE IF NOT EXISTS public.incubator_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_name TEXT,
    website TEXT,
    focus_sectors TEXT[] NOT NULL DEFAULT '{}',
    cohort_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_sectors ON public.investor_profiles USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_investor_stages ON public.investor_profiles USING GIN (stages);
CREATE INDEX IF NOT EXISTS idx_investor_regions ON public.investor_profiles USING GIN (regions);
CREATE INDEX IF NOT EXISTS idx_mentor_expertise ON public.mentor_profiles USING GIN (expertise);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);

-- Updated_at triggers (Idempotent)
DROP TRIGGER IF EXISTS on_founder_profiles_updated ON public.founder_profiles;
CREATE TRIGGER on_founder_profiles_updated
    BEFORE UPDATE ON public.founder_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_investor_profiles_updated ON public.investor_profiles;
CREATE TRIGGER on_investor_profiles_updated
    BEFORE UPDATE ON public.investor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_mentor_profiles_updated ON public.mentor_profiles;
CREATE TRIGGER on_mentor_profiles_updated
    BEFORE UPDATE ON public.mentor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_incubator_profiles_updated ON public.incubator_profiles;
CREATE TRIGGER on_incubator_profiles_updated
    BEFORE UPDATE ON public.incubator_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on all 5 tables
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Founder Profiles
DROP POLICY IF EXISTS "Public read founder profiles" ON public.founder_profiles;
CREATE POLICY "Public read founder profiles"
    ON public.founder_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = founder_profiles.user_id AND p.status = 'active'
        ) OR public.is_admin()
    );

DROP POLICY IF EXISTS "Founders manage own profile" ON public.founder_profiles;
CREATE POLICY "Founders manage own profile"
    ON public.founder_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS Policies for Investor Profiles
DROP POLICY IF EXISTS "Public read verified investor profiles" ON public.investor_profiles;
CREATE POLICY "Public read verified investor profiles"
    ON public.investor_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = investor_profiles.user_id AND p.status = 'active'
        ) OR public.is_admin()
    );

DROP POLICY IF EXISTS "Investors manage own profile" ON public.investor_profiles;
CREATE POLICY "Investors manage own profile"
    ON public.investor_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS Policies for Mentor Profiles
DROP POLICY IF EXISTS "Public read verified mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Public read verified mentor profiles"
    ON public.mentor_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = mentor_profiles.user_id AND p.status = 'active'
        ) OR public.is_admin()
    );

DROP POLICY IF EXISTS "Mentors manage own profile" ON public.mentor_profiles;
CREATE POLICY "Mentors manage own profile"
    ON public.mentor_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS Policies for Incubator Profiles
DROP POLICY IF EXISTS "Public read incubator profiles" ON public.incubator_profiles;
CREATE POLICY "Public read incubator profiles"
    ON public.incubator_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = incubator_profiles.user_id AND p.status = 'active'
        ) OR public.is_admin()
    );

DROP POLICY IF EXISTS "Incubators manage own profile" ON public.incubator_profiles;
CREATE POLICY "Incubators manage own profile"
    ON public.incubator_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS Policies for Audit Logs
DROP POLICY IF EXISTS "Admins read all audit logs" ON public.audit_logs;
CREATE POLICY "Admins read all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;
CREATE POLICY "System insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
