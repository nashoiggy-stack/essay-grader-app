# Roadmap — AdmitEdge v1.1

## Milestone: v1.1 — Fix, Polish, Resume Builder

### Phase 1: Landing Page Fix ✦ CRITICAL
**Goal:** Reliable landing page with scroll animation that never shows a black screen.
**Requirements:** REQ-01, REQ-02, REQ-03, REQ-04
**Approach:** Replace GSAP ScrollTrigger with framer-motion useScroll + useTransform. Sticky container pattern (700vh outer, 100vh sticky inner). Card uses scale animation not width/height. No visibility:hidden anywhere.
**Success:** Hero text visible on first paint. Scroll animation plays smoothly. All 5 tools still work.
**Plans:** 1 plan
Plans:
- [x] 01-01-PLAN.md — Rewrite landing page from GSAP to framer-motion scroll animation
**Status:** Complete

### Phase 2: Security + Cleanup
**Goal:** Fix security issues and remove dead code.
**Requirements:** REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-15
**Approach:** Move Supabase creds to env vars. Add sliding-window rate limiter to API routes. Delete unused components. Extract shared GPA utility. Add Profile to NavBar. Fix RLS policies.
**Success:** No hardcoded credentials. API routes rate-limited. No dead component files. Profile accessible from nav.
**Status:** Not started

### Phase 3: Testing Foundation
**Goal:** Unit tests for scoring logic + E2E for critical flow.
**Requirements:** REQ-10, REQ-14
**Approach:** Add Vitest for unit tests on admissions.ts pure functions. Add Playwright for sign-in → grade essay E2E flow.
**Success:** 80%+ coverage on admissions.ts. E2E test passes in CI.
**Status:** Not started

### Phase 4: Resume/Activities Builder
**Goal:** Common App-format activities section builder with EC evaluator integration.
**Requirements:** REQ-11, REQ-12, REQ-13
**Approach:** New /resume route. 10 activity slots matching Common App fields (type, position, org, description 150-char, hours, weeks, grades). Pre-fill from EC evaluator. Print CSS + @react-pdf/renderer for PDF.
**Success:** User can build, edit, reorder 10 activities. PDF exports correctly. EC evaluator data pre-fills.
**Status:** Not started

### Phase 5: UX Polish
**Goal:** Production-quality UX across all tools.
**Requirements:** REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21
**Approach:** Error boundaries. Mobile bottom tab nav. Auto-save with debounce. CSP headers. Cross-tool handoff CTAs. Return-visit banner.
**Success:** No full-page crashes. Mobile nav works. Auto-save on essay/EC. CSP configured.
**Status:** Not started

## Phase Dependencies
```
Phase 1 (Landing) → no deps, do first
Phase 2 (Security) → can run parallel with Phase 1
Phase 3 (Testing) → after Phase 2 (needs clean code to test)
Phase 4 (Resume) → after Phase 1 (needs working landing page with link)
Phase 5 (Polish) → after Phase 3 (needs stable foundation)
```

### Phase 6: Background picker with light/dark theme (localhost-only)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 6 to break down)

### Phase 7: College list free-text search ✦ shipped 2026-04-21

**Goal:** Substring search by name/aliases above /colleges filters.
**Approach:** New CollegeSearchInput component, debounced 150ms, layered on top of useCollegeFilter results — no filter logic changes.
**Status:** Complete (commit e5e4254)

### Phase 8: Keyboard navigation on /colleges ✦ shipped 2026-04-21

**Goal:** Arrow-key focus + P (pin) + / (focus search) + Esc on the college list.
**Approach:** New useCollegeListKeyboard hook + flatIndex data attribute on cards. Skips when typing in input/textarea/select.
**Status:** Complete (commit 27015b3)

### Phase 9: Autosave indicator ✦ shipped 2026-04-21

**Goal:** Bottom-right pill showing Saving… → Saved during cloud sync.
**Approach:** profile-sync emits cloud-sync-saving / cloud-sync-saved / cloud-sync-error around each upsert; SaveIndicator listens via window events. Mounted globally in AppShell.
**Status:** Complete (commit f85f4d4)

### Phase 10: Ranked missing-data banner ✦ shipped 2026-04-21

**Goal:** Replace plain string array with structured impact-ranked items + per-row CTA.
**Approach:** Additive MissingDataItem type + missingDataRanked field on StrategyAnalysis. Banner now renders impact-dot rows with unlock description + Open link. Legacy missingData kept.
**Status:** Complete (commit 81318c4)

### Phase 11: See all pins ranked transparency view ✦ shipped 2026-04-21

**Goal:** Inline disclosure on Recommended-for-Your-Major card showing every pinned school sorted by major fit.
**Approach:** Additive rankedPinned field on MajorAwareRecommendations; collapsible table reusing existing classification colors.
**Status:** Complete (commit ec4c255)

### Phase 12: Upcoming deadlines card ✦ shipped 2026-04-21

**Goal:** New StrategyCard computing deadlines from pinned schools' applicationOptions.
**Approach:** New src/lib/deadlines.ts (DEADLINE_DATES + computeDeadlines). Card hoists above Recommended when any deadline ≤7 days; rolling rows sorted last.
**Status:** Complete (commit bb9eaa5)

### Phase 13: Shareable strategy report ✦ shipped 2026-04-21

**Goal:** 30-day public share link for the strategy briefing.
**Approach:** New strategy_shares Supabase table (RLS owner-only; anonymous reads via service-role API). 3 routes (POST/GET list + GET/DELETE by token). Public Server Component at /strategy/share/[token] renders StrategyShareView (reuses StrategyCard). Share popover + useStrategyShare hook on /strategy.
**Requires:** SUPABASE_SECRET_KEY in .env.local + run supabase-migration-strategy-shares.sql.
**Status:** Complete (commit 1246d5e)

### Phase 14: Essay versioning (minimal) ✦ shipped 2026-04-21

**Goal:** Make existing essay history's restore-this-version action explicit.
**Approach:** useEssayHistory was already versioned; added explicit Restore button per row with Replace? confirm guard when current editor differs. No schema or storage changes.
**Status:** Complete (commit d6a3c3d)
