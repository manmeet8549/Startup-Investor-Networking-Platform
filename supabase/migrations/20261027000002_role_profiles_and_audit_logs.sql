-- Founders Den MVP - Migration 0002
-- Iteration 3: Role Profiles (Investor, Mentor, Incubator) and Audit Logs

-- Investor Profiles
CREATE TABLE IF NOT EXISTS public.investor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    investment_thesis TEXT,
    ticket_size_min NUMERIC DEFAULT 0,
    ticket_size_max NUMERIC DEFAULT 0,
    preferred_sectors TEXT[] DEFAULT '{}',
    preferred_stages TEXT[] DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Mentor Profiles
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    expertise_areas TEXT[] DEFAULT '{}',
    years_of_experience INTEGER DEFAULT 0,
    mentoring_topics TEXT[] DEFAULT '{}',
    linkedin_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Incubator Profiles
CREATE TABLE IF NOT EXISTS public.incubator_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_name TEXT,
    website TEXT,
    program_types TEXT[] DEFAULT '{}',
    cohort_size INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_type, target_id);

-- Updated_at triggers
CREATE TRIGGER on_investor_profiles_updated
    BEFORE UPDATE ON public.investor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_mentor_profiles_updated
    BEFORE UPDATE ON public.mentor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_incubator_profiles_updated
    BEFORE UPDATE ON public.incubator_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Investor Profiles
CREATE POLICY "Public read verified investor profiles"
    ON public.investor_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = investor_profiles.user_id AND p.status = 'active'
        )
    );

CREATE POLICY "Investors manage own profile"
    ON public.investor_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Mentor Profiles
CREATE POLICY "Public read verified mentor profiles"
    ON public.mentor_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = mentor_profiles.user_id AND p.status = 'active'
        )
    );

CREATE POLICY "Mentors manage own profile"
    ON public.mentor_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Incubator Profiles
CREATE POLICY "Public read incubator profiles"
    ON public.incubator_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = incubator_profiles.user_id AND p.status = 'active'
        )
    );

CREATE POLICY "Incubators manage own profile"
    ON public.incubator_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Audit Logs
CREATE POLICY "Admins read all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "System insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
