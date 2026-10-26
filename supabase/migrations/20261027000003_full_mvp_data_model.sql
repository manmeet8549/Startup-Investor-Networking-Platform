-- Founders Den MVP - Migration 0003
-- Iteration 2: Full MVP Database Schema, Enums, Constraints, Full-Text Search, and Row Level Security (RLS)

-- 1. ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('founder', 'investor', 'mentor', 'incubator', 'admin');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('active', 'suspended');
    END IF;
END $$;

-- Update or create verification_status to support pending, approved, verified, rejected, suspended
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'verified', 'rejected', 'suspended');
    ELSE
        BEGIN
            ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'approved';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'suspended';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'startup_stage') THEN
        CREATE TYPE public.startup_stage AS ENUM ('idea', 'validation', 'mvp', 'early_traction', 'growth');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility') THEN
        CREATE TYPE public.visibility AS ENUM ('public', 'access_controlled', 'private');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_status') THEN
        CREATE TYPE public.pipeline_status AS ENUM ('interested', 'meeting_requested', 'in_discussion', 'passed', 'follow_up');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE public.application_status AS ENUM ('submitted', 'under_review', 'shortlisted', 'accepted', 'rejected');
    END IF;
END $$;

-- 2. CORE PROFILES (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
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

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. FOUNDER PROFILES
CREATE TABLE IF NOT EXISTS public.founder_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    headline TEXT,
    linkedin_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. INVESTOR PROFILES
CREATE TABLE IF NOT EXISTS public.investor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    stages TEXT[] NOT NULL DEFAULT '{}',
    ticket_min NUMERIC(15,2) NOT NULL DEFAULT 0,
    ticket_max NUMERIC(15,2) NOT NULL DEFAULT 0,
    regions TEXT[] NOT NULL DEFAULT '{}',
    business_models TEXT[] NOT NULL DEFAULT '{}',
    thesis TEXT,
    firm_name TEXT,
    accredited BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_ticket_range CHECK (ticket_min <= ticket_max)
);

-- 5. MENTOR PROFILES
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    expertise TEXT[] NOT NULL DEFAULT '{}',
    experience INTEGER NOT NULL DEFAULT 0,
    linkedin_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. INCUBATOR PROFILES
CREATE TABLE IF NOT EXISTS public.incubator_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_name TEXT,
    website TEXT,
    focus_sectors TEXT[] NOT NULL DEFAULT '{}',
    cohort_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. STARTUPS
CREATE TABLE IF NOT EXISTS public.startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    sector TEXT NOT NULL,
    stage public.startup_stage NOT NULL DEFAULT 'idea',
    location TEXT NOT NULL,
    funding_ask NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    visibility public.visibility NOT NULL DEFAULT 'access_controlled',
    pitch_deck_url TEXT,
    website TEXT,
    tsv TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TSVector generation trigger for startups search
CREATE OR REPLACE FUNCTION public.startups_generate_tsv()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tsv = setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
              setweight(to_tsvector('english', coalesce(NEW.tagline, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(NEW.sector, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(NEW.location, '')), 'C') ||
              setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_startups_tsv ON public.startups;
CREATE TRIGGER trg_startups_tsv
    BEFORE INSERT OR UPDATE ON public.startups
    FOR EACH ROW
    EXECUTE FUNCTION public.startups_generate_tsv();

-- 8. STARTUP TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.startup_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    email TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_startup_team_member UNIQUE (startup_id, name)
);

-- 9. DOCUMENTS (versioned)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    visibility public.visibility NOT NULL DEFAULT 'access_controlled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. DOCUMENT ACCESS REQUESTS
CREATE TABLE IF NOT EXISTS public.document_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    status public.request_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_document_access_request UNIQUE (document_id, requester_id)
);

-- 11. WATCHLIST
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_watchlist_entry UNIQUE (investor_id, startup_id)
);

-- 12. INVESTOR NOTES
CREATE TABLE IF NOT EXISTS public.investor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_investor_startup_note UNIQUE (investor_id, startup_id)
);

-- 13. INVESTOR STARTUP STATUS (Pipeline tracker)
CREATE TABLE IF NOT EXISTS public.investor_startup_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    status public.pipeline_status NOT NULL DEFAULT 'interested',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_investor_startup_status UNIQUE (investor_id, startup_id)
);

-- 14. PITCH REQUESTS
CREATE TABLE IF NOT EXISTS public.pitch_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.request_status NOT NULL DEFAULT 'pending',
    pitch_deck_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_pitch_request UNIQUE (startup_id, investor_id)
);

-- 15. CONNECTIONS
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_connections_distinct_users CHECK (user_a_id != user_b_id),
    CONSTRAINT unique_connection_pair UNIQUE (user_a_id, user_b_id)
);

-- 16. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_messages_distinct_users CHECK (sender_id != recipient_id)
);

-- 17. MENTORSHIP REQUESTS
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    status public.request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 18. MENTOR FEEDBACK
CREATE TABLE IF NOT EXISTS public.mentor_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorship_request_id UUID NOT NULL REFERENCES public.mentorship_requests(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    feedback TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 19. INCUBATOR PROGRAMS
CREATE TABLE IF NOT EXISTS public.incubator_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incubator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    benefits TEXT NOT NULL,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    stages TEXT[] NOT NULL DEFAULT '{}',
    deadline TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 20. APPLICATIONS (One application per startup per program)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.incubator_programs(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    founder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pitch_summary TEXT,
    status public.application_status NOT NULL DEFAULT 'submitted',
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_program_startup_application UNIQUE (program_id, startup_id)
);

-- 21. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 22. MATCH SCORES
CREATE TABLE IF NOT EXISTS public.match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    sector_score INTEGER NOT NULL DEFAULT 0,
    stage_score INTEGER NOT NULL DEFAULT 0,
    funding_score INTEGER NOT NULL DEFAULT 0,
    location_score INTEGER NOT NULL DEFAULT 0,
    model_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_investor_startup_match UNIQUE (investor_id, startup_id)
);

-- 23. REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status public.request_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 24. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 25. INDEXES (GIN and B-Tree)
CREATE INDEX IF NOT EXISTS idx_investor_sectors ON public.investor_profiles USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_investor_stages ON public.investor_profiles USING GIN (stages);
CREATE INDEX IF NOT EXISTS idx_investor_regions ON public.investor_profiles USING GIN (regions);
CREATE INDEX IF NOT EXISTS idx_mentor_expertise ON public.mentor_profiles USING GIN (expertise);
CREATE INDEX IF NOT EXISTS idx_incubator_programs_sectors ON public.incubator_programs USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_incubator_programs_stages ON public.incubator_programs USING GIN (stages);
CREATE INDEX IF NOT EXISTS idx_startups_tsv ON public.startups USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_startups_sector ON public.startups (sector);
CREATE INDEX IF NOT EXISTS idx_startups_stage ON public.startups (stage);
CREATE INDEX IF NOT EXISTS idx_startups_visibility ON public.startups (visibility);
CREATE INDEX IF NOT EXISTS idx_startups_founder ON public.startups (founder_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_investor ON public.watchlist (investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_notes_investor ON public.investor_notes (investor_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages (sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_applications_program ON public.applications (program_id);
CREATE INDEX IF NOT EXISTS idx_applications_startup ON public.applications (startup_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);

-- 26. UPDATED_AT TRIGGERS
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'profiles', 'founder_profiles', 'investor_profiles', 'mentor_profiles',
            'incubator_profiles', 'startups', 'startup_team_members', 'documents',
            'document_access_requests', 'investor_notes', 'investor_startup_status',
            'pitch_requests', 'connections', 'mentorship_requests', 'mentor_feedback',
            'incubator_programs', 'applications', 'match_scores', 'reports'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t, t);
    END LOOP;
END $$;

-- 27. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on every single table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_startup_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubator_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT TO authenticated
    USING (status = 'active' OR auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Startups Policies
-- Public can view public startups; authenticated can view public and access_controlled; owner and admin can view all
DROP POLICY IF EXISTS "Startups read policy" ON public.startups;
CREATE POLICY "Startups read policy" ON public.startups FOR SELECT TO authenticated
    USING (visibility IN ('public', 'access_controlled') OR founder_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Startups manage own" ON public.startups;
CREATE POLICY "Startups manage own" ON public.startups FOR ALL TO authenticated
    USING (founder_id = auth.uid() OR public.is_admin())
    WITH CHECK (founder_id = auth.uid() OR public.is_admin());

-- Documents Policies
DROP POLICY IF EXISTS "Documents read policy" ON public.documents;
CREATE POLICY "Documents read policy" ON public.documents FOR SELECT TO authenticated
    USING (
        visibility = 'public' 
        OR uploader_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.startups s WHERE s.id = documents.startup_id AND s.founder_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.document_access_requests r WHERE r.document_id = documents.id AND r.requester_id = auth.uid() AND r.status = 'approved')
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Documents manage own" ON public.documents;
CREATE POLICY "Documents manage own" ON public.documents FOR ALL TO authenticated
    USING (uploader_id = auth.uid() OR public.is_admin())
    WITH CHECK (uploader_id = auth.uid() OR public.is_admin());

-- Investor Notes: Visible and manageable ONLY by the owner
DROP POLICY IF EXISTS "Investor notes private to owner" ON public.investor_notes;
CREATE POLICY "Investor notes private to owner" ON public.investor_notes FOR ALL TO authenticated
    USING (investor_id = auth.uid() OR public.is_admin())
    WITH CHECK (investor_id = auth.uid() OR public.is_admin());

-- Watchlist: Visible and manageable ONLY by the owner
DROP POLICY IF EXISTS "Watchlist private to owner" ON public.watchlist;
CREATE POLICY "Watchlist private to owner" ON public.watchlist FOR ALL TO authenticated
    USING (investor_id = auth.uid() OR public.is_admin())
    WITH CHECK (investor_id = auth.uid() OR public.is_admin());

-- Messages: Visible only to participants (sender or recipient)
DROP POLICY IF EXISTS "Messages participant access" ON public.messages;
CREATE POLICY "Messages participant access" ON public.messages FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Messages sender insert" ON public.messages;
CREATE POLICY "Messages sender insert" ON public.messages FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid() OR public.is_admin());

-- Document Access Requests
DROP POLICY IF EXISTS "Document access requests view" ON public.document_access_requests;
CREATE POLICY "Document access requests view" ON public.document_access_requests FOR SELECT TO authenticated
    USING (
        requester_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.startups s WHERE s.id = document_access_requests.startup_id AND s.founder_id = auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Document access requests insert" ON public.document_access_requests;
CREATE POLICY "Document access requests insert" ON public.document_access_requests FOR INSERT TO authenticated
    WITH CHECK (requester_id = auth.uid() OR public.is_admin());

-- Incubator Programs
DROP POLICY IF EXISTS "Programs viewable" ON public.incubator_programs;
CREATE POLICY "Programs viewable" ON public.incubator_programs FOR SELECT TO authenticated
    USING (is_active = true OR incubator_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Programs manage own" ON public.incubator_programs;
CREATE POLICY "Programs manage own" ON public.incubator_programs FOR ALL TO authenticated
    USING (incubator_id = auth.uid() OR public.is_admin())
    WITH CHECK (incubator_id = auth.uid() OR public.is_admin());

-- Applications
DROP POLICY IF EXISTS "Applications viewable by applicant or incubator" ON public.applications;
CREATE POLICY "Applications viewable by applicant or incubator" ON public.applications FOR SELECT TO authenticated
    USING (
        founder_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.incubator_programs p WHERE p.id = applications.program_id AND p.incubator_id = auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Applications insert own" ON public.applications;
CREATE POLICY "Applications insert own" ON public.applications FOR INSERT TO authenticated
    WITH CHECK (founder_id = auth.uid() OR public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "Notifications private to user" ON public.notifications;
CREATE POLICY "Notifications private to user" ON public.notifications FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Audit Logs
DROP POLICY IF EXISTS "Audit logs admin access" ON public.audit_logs;
CREATE POLICY "Audit logs admin access" ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs insert" ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (true);
