-- Migration: 20261027000007_pipeline_engagement_and_messaging.sql
-- Description: Iteration 7 - Pipeline tracking with history, enhanced pitch requests, connections and messaging

-- 1. Enhance pitch_requests with meeting negotiation fields if not already present
ALTER TABLE public.pitch_requests
    ADD COLUMN IF NOT EXISTS proposed_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS counter_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS response_message TEXT;

-- 2. Pipeline history table to track status transitions
CREATE TABLE IF NOT EXISTS public.pipeline_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    from_status public.pipeline_status,
    to_status public.pipeline_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for pipeline lookup
CREATE INDEX IF NOT EXISTS idx_pipeline_history_investor_startup
    ON public.pipeline_history (investor_id, startup_id, created_at DESC);

-- 3. Pitch request typed messages for information exchange
CREATE TABLE IF NOT EXISTS public.pitch_request_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pitch_request_id UUID NOT NULL REFERENCES public.pitch_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'info_request', -- 'info_request', 'info_response', 'general'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pitch_request_messages_request
    ON public.pitch_request_messages (pitch_request_id, created_at ASC);

-- 4. Enable RLS on new tables
ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_request_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Pipeline history: visible only to the investor who owns it or admin
DROP POLICY IF EXISTS pipeline_history_owner_select ON public.pipeline_history;
CREATE POLICY pipeline_history_owner_select ON public.pipeline_history
    FOR SELECT TO authenticated
    USING (investor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS pipeline_history_owner_insert ON public.pipeline_history;
CREATE POLICY pipeline_history_owner_insert ON public.pipeline_history
    FOR INSERT TO authenticated
    WITH CHECK (investor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Pitch request messages: visible to participants of the pitch request
DROP POLICY IF EXISTS pitch_request_messages_participants_select ON public.pitch_request_messages;
CREATE POLICY pitch_request_messages_participants_select ON public.pitch_request_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pitch_requests pr
            JOIN public.startups s ON s.id = pr.startup_id
            WHERE pr.id = pitch_request_id
            AND (pr.investor_id = auth.uid() OR s.founder_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS pitch_request_messages_participants_insert ON public.pitch_request_messages;
CREATE POLICY pitch_request_messages_participants_insert ON public.pitch_request_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM public.pitch_requests pr
                JOIN public.startups s ON s.id = pr.startup_id
                WHERE pr.id = pitch_request_id
                AND (pr.investor_id = auth.uid() OR s.founder_id = auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );
