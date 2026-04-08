# Project State — AdmitEdge

## Current Position
- **Milestone:** v1.1 — Fix, Polish, Resume Builder
- **Active Phase:** None (ready to start Phase 1)
- **Next Action:** `/gsd-plan-phase 1` — Plan landing page fix

## Session Log
- 2026-04-08: Project initialized with GSD. Codebase mapped (7 docs). Research completed (4 agents: UX patterns, resume builder, testing+security, scroll animations). Requirements and roadmap created.

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
