-- Phase 7 — LLM interest mapping cache
--
-- Adds an `interest_map` JSONB column to user_profiles so the output of the
-- /api/interest-map route (relatedMajors, keywords, confidence, and the
-- interest string it was generated for) can be cached across devices. This
-- avoids re-prompting Haiku on every keystroke when the user already has
-- a recent mapping for the same interest.
--
-- Additive + idempotent: existing rows get NULL; the matcher degrades
-- cleanly without it (base three-signal match still works). main can
-- ignore the column safely until this migration is applied.

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS interest_map JSONB DEFAULT NULL;

-- Expected shape (enforced client-side, not at the DB layer — the matcher
-- validates everything it reads):
--   {
--     "interest":       string,        -- the free-text input that produced this map
--     "relatedMajors":  string[],      -- up to 4, each from the canonical MAJORS list
--     "keywords":       string[],      -- up to 8 program-catalog-style terms
--     "confidence":     number,        -- 0.0-1.0
--     "generatedAt":    number         -- epoch ms; lets the client expire stale maps
--   }
