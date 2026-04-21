# Project State — AdmitEdge

## Current Position
- **Milestone:** v1.1 — Fix, Polish, Resume Builder
- **Active Phase:** Phases 7–14 shipped on feature/qol-batch-07-14 (localhost only, not pushed)
- **Next Action:** Run supabase-migration-strategy-shares.sql + add SUPABASE_SERVICE_ROLE_KEY to .env.local before testing the share flow. Manual UAT each phase in browser.

## Session Log
- 2026-04-08: Project initialized with GSD. Codebase mapped (7 docs). Research completed (4 agents: UX patterns, resume builder, testing+security, scroll animations). Requirements and roadmap created.
- 2026-04-08: Phase 1 Plan 01 executed. Rewrote landing page from GSAP to framer-motion scroll animation. All 4 requirements (REQ-01 through REQ-04) completed. Duration: 3 min.
- 2026-04-21: Batch shipped Phases 7–14 on branch feature/qol-batch-07-14 (8 commits, no push):
  - 07: College list free-text search
  - 08: Keyboard navigation on /colleges
  - 09: Autosave indicator pill
  - 10: Ranked missing-data banner
  - 11: See-all-pins-ranked transparency disclosure
  - 12: Upcoming deadlines card (with ≤7d hoist)
  - 13: Shareable strategy report (Supabase table + 3 routes + public Server Component view + popover UI)
  - 14: Explicit Restore action on essay-history sidebar
  Each phase has a PLAN.md in .planning/phases/<n>-<slug>/. tsc clean throughout.

## Key Decisions
- Replace GSAP ScrollTrigger with framer-motion useScroll for landing page (research confirmed this fixes the black screen)
- Use sticky container pattern (700vh outer div) instead of GSAP pinning
- Animate card with `scale` not `width`/`height` for compositor performance
- Resume builder follows Common App format exactly (10 activities, 150-char descriptions)
- Vitest for unit tests, Playwright for E2E
- Rate limiting via in-memory sliding window (swap to Upstash Redis on Vercel later)

## Open Issues
- Landing page currently shows text but GSAP scroll may still have timing issues on Vercel
- Supabase credentials hardcoded in source
- Zero test coverage

## Accumulated Context

### Roadmap Evolution
- Phase 6 added: Background picker with light/dark theme (localhost-only)
