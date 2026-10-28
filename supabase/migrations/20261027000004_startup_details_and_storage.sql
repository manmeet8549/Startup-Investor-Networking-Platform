-- Migration: Add startup profile detail fields and storage bucket configuration
-- Iteration 4: Startup profiles, pitch decks and access control

-- 1. Extend startups table with fields required for profile completeness and iteration 4
ALTER TABLE public.startups
    ADD COLUMN IF NOT EXISTS logo TEXT,
    ADD COLUMN IF NOT EXISTS sectors TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS problem TEXT,
    ADD COLUMN IF NOT EXISTS solution TEXT,
    ADD COLUMN IF NOT EXISTS target_market TEXT,
    ADD COLUMN IF NOT EXISTS business_model TEXT;

-- 2. Extend notifications table with payload jsonb
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Supabase storage bucket for startup documents (private) and storage policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'startup-documents',
            'startup-documents',
            false,
            10485760, -- 10MB limit in bytes
            ARRAY['application/pdf']::text[]
        )
        ON CONFLICT (id) DO UPDATE SET
            public = false,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['application/pdf']::text[];
    END IF;
END $$;

-- 4. Storage Policies for startup-documents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        -- Allow authenticated users to upload documents to startup-documents
        DROP POLICY IF EXISTS "Authenticated users upload startup documents" ON storage.objects;
        CREATE POLICY "Authenticated users upload startup documents" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'startup-documents');

        -- Allow authenticated users to read documents from startup-documents
        DROP POLICY IF EXISTS "Authenticated users read startup documents" ON storage.objects;
        CREATE POLICY "Authenticated users read startup documents" ON storage.objects
            FOR SELECT TO authenticated
            USING (bucket_id = 'startup-documents');

        -- Allow users to update their own documents in startup-documents
        DROP POLICY IF EXISTS "Users update own startup documents" ON storage.objects;
        CREATE POLICY "Users update own startup documents" ON storage.objects
            FOR UPDATE TO authenticated
            USING (bucket_id = 'startup-documents' AND (owner = auth.uid() OR public.is_admin()));

        -- Allow users to delete their own documents in startup-documents
        DROP POLICY IF EXISTS "Users delete own startup documents" ON storage.objects;
        CREATE POLICY "Users delete own startup documents" ON storage.objects
            FOR DELETE TO authenticated
            USING (bucket_id = 'startup-documents' AND (owner = auth.uid() OR public.is_admin()));
    END IF;
END $$;
