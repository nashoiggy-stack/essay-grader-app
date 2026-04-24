# FIX_NOTES — dev-batch-v1 bug fixes

## Out-of-scope finding during Bug 2 review

**Context:** While implementing the public-share auth fix, I audited the
snapshot payload for PII per the spec's security check. The obvious
raw-value fields on `StrategyAnalysis` (`academic.signals`, `ec.signals`,
`spike.signals`, `weaknesses[].detail`) are now stripped on POST — see
`sanitizeSnapshot` in `src/app/api/strategy/share/route.ts`.

**What I didn't fix:** The LLM-generated narrative body strings in
`StrategyResult.*.body` may ALSO embed raw GPA / test-score values. The
strategy prompt (`src/lib/strategy-prompt.ts`) instructs the model to be
specific with numbers, and the prompt feeds it the raw profile block.
Example body content I'd expect to see:

- `profileSummary.body`: "Your 3.78 UW GPA and 1510 SAT place you..."
- `weaknessDiagnosis.body`: "Raising your SAT from 1510 toward 1550..."
- `competitiveness.body`: "With a 3.78/1510 profile..."

These bodies are rendered verbatim in the public view, so a parent or
counselor who opens a share link sees the numbers.

**Why not fixed:** Stripping body text wholesale would gut the briefing
— the narrative IS the point. The correct fix is one of:

1. **Prompt-level:** Modify the strategy system prompt to refer to
   values in tier language only ("your GPA sits in the strong band")
   rather than raw numbers. Requires regenerating any cached
   strategy results so existing shares don't keep leaking.
2. **Post-processing regex:** On POST, scan the body strings for
   number-like tokens in GPA / SAT / ACT patterns and redact to
   `[GPA]` / `[SAT]` / `[ACT]`. Fragile but localized.
3. **Dual-output prompt:** Ask the LLM to emit two versions per
   section — detailed (for owner) and general (for share). Cleanest
   but doubles token cost.

Any of these is a deliberate change that affects UX and/or cost, so
it's outside the scope of a bug-fix PR.

**Recommended next step:** Pick option (1) — it's a one-file prompt
change. Do it as a follow-up PR with a migration to invalidate cached
results and a regen of any existing active share snapshots.

---

## Token opacity + revocation audit (no action needed)

Verified while in the share code per the spec:

- Token generation: 18 random bytes → 24-char base64url (URL-safe, no
  padding). Unguessable, well above the 16-char floor.
- GET handler filters: `revoked_at IS NULL` and `expires_at > now()`.
  Either condition failing → 404. Correct.
- Ownership on revoke: admin update matches on both `token` AND
  `user_id`, so a caller can't revoke someone else's share.
