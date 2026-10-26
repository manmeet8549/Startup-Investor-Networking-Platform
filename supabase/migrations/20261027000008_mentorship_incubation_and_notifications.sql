-- ============================================================================
-- Migration: 20261027000008_mentorship_incubation_and_notifications.sql
-- Description: Mentorship requests, feedback, incubator programs, applications & notifications
-- ============================================================================

-- 1. Extend incubator_programs with title and eligibility
ALTER TABLE public.incubator_programs 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS eligibility TEXT;

-- Sync name and title if title is populated
UPDATE public.incubator_programs 
SET title = name 
WHERE title IS NULL;

-- 2. Extend mentorship_requests with response_note
ALTER TABLE public.mentorship_requests
  ADD COLUMN IF NOT EXISTS response_note TEXT;

-- 3. Row Level Security (RLS) on Mentorship Requests
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentorship_requests_select_policy" ON public.mentorship_requests;
CREATE POLICY "mentorship_requests_select_policy" ON public.mentorship_requests
  FOR SELECT
  USING (
    founder_id = auth.uid() OR
    mentor_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "mentorship_requests_insert_policy" ON public.mentorship_requests;
CREATE POLICY "mentorship_requests_insert_policy" ON public.mentorship_requests
  FOR INSERT
  WITH CHECK (
    founder_id = auth.uid()
  );

DROP POLICY IF EXISTS "mentorship_requests_update_policy" ON public.mentorship_requests;
CREATE POLICY "mentorship_requests_update_policy" ON public.mentorship_requests
  FOR UPDATE
  USING (
    mentor_id = auth.uid() OR
    public.is_admin()
  );

-- 4. Row Level Security (RLS) on Mentor Feedback
ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_feedback_select_policy" ON public.mentor_feedback;
CREATE POLICY "mentor_feedback_select_policy" ON public.mentor_feedback
  FOR SELECT
  USING (
    mentor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.startups s 
      WHERE s.id = mentor_feedback.startup_id AND s.founder_id = auth.uid()
    ) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "mentor_feedback_insert_policy" ON public.mentor_feedback;
CREATE POLICY "mentor_feedback_insert_policy" ON public.mentor_feedback
  FOR INSERT
  WITH CHECK (
    mentor_id = auth.uid()
  );

-- 5. Row Level Security (RLS) on Incubator Programs
ALTER TABLE public.incubator_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incubator_programs_select_policy" ON public.incubator_programs;
CREATE POLICY "incubator_programs_select_policy" ON public.incubator_programs
  FOR SELECT
  USING (
    is_active = true OR
    incubator_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "incubator_programs_insert_policy" ON public.incubator_programs;
CREATE POLICY "incubator_programs_insert_policy" ON public.incubator_programs
  FOR INSERT
  WITH CHECK (
    incubator_id = auth.uid()
  );

DROP POLICY IF EXISTS "incubator_programs_update_policy" ON public.incubator_programs;
CREATE POLICY "incubator_programs_update_policy" ON public.incubator_programs
  FOR UPDATE
  USING (
    incubator_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "incubator_programs_delete_policy" ON public.incubator_programs;
CREATE POLICY "incubator_programs_delete_policy" ON public.incubator_programs
  FOR DELETE
  USING (
    incubator_id = auth.uid() OR
    public.is_admin()
  );

-- 6. Row Level Security (RLS) on Applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_policy" ON public.applications;
CREATE POLICY "applications_select_policy" ON public.applications
  FOR SELECT
  USING (
    founder_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.incubator_programs p
      WHERE p.id = applications.program_id AND p.incubator_id = auth.uid()
    ) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "applications_insert_policy" ON public.applications;
CREATE POLICY "applications_insert_policy" ON public.applications
  FOR INSERT
  WITH CHECK (
    founder_id = auth.uid()
  );

DROP POLICY IF EXISTS "applications_update_policy" ON public.applications;
CREATE POLICY "applications_update_policy" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.incubator_programs p
      WHERE p.id = applications.program_id AND p.incubator_id = auth.uid()
    ) OR
    public.is_admin()
  );

-- 7. Row Level Security (RLS) on Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );
