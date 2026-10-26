-- Migration: Matching Engine Cache Enhancements
-- Adds reasons and breakdown JSONB to match_scores for fast transparent matching queries

ALTER TABLE public.match_scores
  ADD COLUMN IF NOT EXISTS reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_match_scores_lookup ON public.match_scores (investor_id, startup_id);
