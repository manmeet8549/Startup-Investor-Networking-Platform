-- Migration: Discovery, search and indexing for startups
-- Iteration 5: Discovery, search and filters

-- 1. Ensure is_hidden column exists for moderation
ALTER TABLE public.startups
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- 2. Indexes for fast discovery filtering, range queries, and full-text search
CREATE INDEX IF NOT EXISTS idx_startups_sectors ON public.startups USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_startups_stage ON public.startups (stage);
CREATE INDEX IF NOT EXISTS idx_startups_location ON public.startups (location);
CREATE INDEX IF NOT EXISTS idx_startups_funding_ask ON public.startups (funding_ask);
CREATE INDEX IF NOT EXISTS idx_startups_visibility ON public.startups (visibility);
CREATE INDEX IF NOT EXISTS idx_startups_is_hidden ON public.startups (is_hidden);
CREATE INDEX IF NOT EXISTS idx_startups_created_at ON public.startups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startups_tsv ON public.startups USING GIN (tsv);

-- Composite index optimized for the common discovery query filter: listed, visible, newest
CREATE INDEX IF NOT EXISTS idx_startups_discovery_listing 
    ON public.startups (is_hidden, visibility, created_at DESC);

-- 3. Comprehensive TSVector generation trigger covering all searchable startup fields
CREATE OR REPLACE FUNCTION public.startups_generate_tsv()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tsv = setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
              setweight(to_tsvector('english', coalesce(NEW.tagline, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(array_to_string(NEW.sectors, ' '), NEW.sector, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(NEW.location, '')), 'C') ||
              setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D') ||
              setweight(to_tsvector('english', coalesce(NEW.problem, '')), 'D') ||
              setweight(to_tsvector('english', coalesce(NEW.solution, '')), 'D') ||
              setweight(to_tsvector('english', coalesce(NEW.business_model, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_startups_tsv ON public.startups;
CREATE TRIGGER trg_startups_tsv
    BEFORE INSERT OR UPDATE ON public.startups
    FOR EACH ROW
    EXECUTE FUNCTION public.startups_generate_tsv();
