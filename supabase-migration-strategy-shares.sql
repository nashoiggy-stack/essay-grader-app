-- Phase 13 — Shareable strategy reports
--
-- Creates strategy_shares table. Owner can read/write their own rows via
-- RLS; anonymous public reads happen through the API route using the
-- service role key (no public SELECT policy).
--
-- Append-only and idempotent.

CREATE TABLE IF NOT EXISTS strategy_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS strategy_shares_token_idx ON strategy_shares(token);
CREATE INDEX IF NOT EXISTS strategy_shares_user_idx ON strategy_shares(user_id);

ALTER TABLE strategy_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own shares (read, insert, update for revoke, delete).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'strategy_shares'
      AND policyname = 'Users manage own shares'
  ) THEN
    CREATE POLICY "Users manage own shares"
      ON strategy_shares FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Note: NO public SELECT policy. Anonymous reads of share tokens are
-- handled exclusively by the /api/strategy/share/[token] GET route using
-- the service role key. This keeps tokens unguessable and lets us cleanly
-- enforce the not-revoked + not-expired window in application code.
