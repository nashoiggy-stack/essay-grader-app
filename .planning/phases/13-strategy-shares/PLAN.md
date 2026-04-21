# Phase 13 — Shareable strategy report

**Goal:** Owner can generate a 30-day share link to their cached strategy snapshot. Public viewers see a read-only briefing using existing StrategyCard components. Localhost dev build only.

## Files

### Migration
- Create: `supabase-migration-strategy-shares.sql`

### Server
- Create: `src/lib/supabase-admin.ts` — server-side admin client using `SUPABASE_SERVICE_ROLE_KEY` env var.
- Create: `src/app/api/strategy/share/route.ts` — POST (generate)
- Create: `src/app/api/strategy/share/[token]/route.ts` — GET (public) + DELETE (revoke)

### Public view
- Create: `src/app/strategy/share/[token]/page.tsx` — Server Component fetches snapshot from GET endpoint and renders `<StrategyShareView />`.
- Create: `src/components/StrategyShareView.tsx` — client component that mirrors the cards in /strategy but strips action checklist, re-run button, dream picker, and missing-data CTAs. Reuses existing StrategyCard.

### UI on /strategy
- Modify: `src/app/strategy/page.tsx` — add Share button next to Generate; popover with copy + revoke.
- Create: `src/hooks/useStrategyShare.ts` — encapsulates POST/GET-active/DELETE.

## Migration

```sql
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
CREATE POLICY "Users manage own shares"
  ON strategy_shares FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- No public SELECT policy. Public reads go through the API route using the
-- service role key.
```

## Snapshot shape

```ts
interface StrategyShareSnapshot {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
  readonly profileMeta: { graduationYear: string | null; intendedMajor: string | null };
  readonly capturedAt: number;
}
```

## Auth flow

- POST/DELETE: client passes `Authorization: Bearer <session.access_token>` from supabase-js. Route validates with `supabase.auth.getUser(token)` (using publishable key). Then performs writes via the admin client (service role).
- GET (public): no auth, admin client reads row; returns 404 if missing/revoked/expired.

## Token generation

```ts
function generateToken(): string {
  // 24 chars URL-safe base64
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url"); // 24 chars
}
```

## Active-share semantics

`useStrategyShare`'s `getActive` calls a tiny server route... actually simpler: POST is idempotent — if user has an active (non-revoked, non-expired) share, POST returns it instead of generating a new one. Spec allows this.

## Public view UI

- Top banner: "Shared strategy briefing — snapshot from {date}. Not live."
- Reuse all StrategyCard renders from /strategy: Snapshot, Spike, Gaps, Recommended for Your Major, School List, Application Strategy, Upcoming Deadlines (if computable).
- Strip: ActionPlanCard, GenerateBar, FooterBar, DreamSchoolSelector, MissingDataBanner, MajorPicker (the change-major button).
- Dream School card: render if `result.dreamSchool` was captured; just hide the "pending re-run" empty state.

## .env.local

User adds `SUPABASE_SERVICE_ROLE_KEY=<service key from Supabase dashboard>`. Document in PLAN.

## Acceptance

- Click Share → popover → Generate Link → URL appears.
- Copy URL, open in incognito → snapshot renders.
- Click Revoke → URL returns 404.
- Re-clicking Generate before revoke returns the same URL.
