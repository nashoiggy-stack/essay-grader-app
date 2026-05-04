# AdmitEdge AUDIT-2 — fresh per-page audit

**Branch:** `redesign/linear`
**Baseline commit at audit start:** `88f0d76`
**Methodology:** For every finding in `CRITIQUE.md`, statused as one of:

- `[RESOLVED in <commit>]` — verified in the current code.
- `[OPEN]` — finding still applies (with a current code citation).
- `[WONT-FIX]` — deliberate user direction, with reason.

Then `[NEW]` findings discovered while sweeping the surface as of `88f0d76`.

Severity buckets follow `CRITIQUE.md`:

- **BLOCK** — directly violates `MASTER.md` anti-patterns or fails WCAG.
- **WARN** — real UX or a11y issue, not a contract violation.
- **INFO** — polish / drift / nit.

Out-of-scope dark surfaces (intentionally dark, contrast checks skipped):

- The cinematic landing hero.
- `/strategy/share/[token]` view.
- EC chat bubbles inside `ECConversation`.
- Cosmic landing middle/footer shader sections.

---

## Surfaces audited

- [x] `/` (landing)
- [ ] `/list`
- [ ] `/chances`
- [ ] `/colleges`
- [ ] `/profile`
- [ ] `/dashboard`
- [ ] `/strategy`
- [ ] `/compare`
- [ ] `/essay`
- [ ] `/resume`
- [ ] `/gpa`
- [ ] `/extracurriculars`
- [ ] `/methodology`
- [ ] `/strategy/share/[token]`

---

## `/` (landing)

Files swept: `src/app/page.tsx`, `src/components/landing/LandingExtras.tsx`,
`src/components/landing/landing-extras.css`, `src/app/layout.tsx`.

Note: cinematic hero choreography (sticky/fade/blur) is **out of scope** per
the user's "intentionally dark" carve-out. Findings against the hero are
limited to a11y, semantics, and SEO — not contrast or motion taste.

### BLOCK

- [RESOLVED in 365bb29 / current `src/app/page.tsx:147-151`] CRITIQUE
  said the hero never names what the product does. A standfirst paragraph
  is now in place: "Nine connected tools — essay grading, GPA,
  extracurriculars, resume, list, chances, comparison, strategy — sourced
  from CDS data. One profile feeds them all."
- [RESOLVED in current `src/app/page.tsx:16-23`] CRITIQUE flagged
  `LandingMiddle` and `LandingFooter` using `dynamic(..., { ssr: false })`
  as a SEO disaster. Both now use `dynamic()` with SSR left **on** and a
  loading skeleton — verified at `page.tsx:16-19` and `:20-23`. Only
  `ShaderLines` keeps `ssr: false` (correct — WebGL primitive, no SEO
  value).

### WARN

- [OPEN] No social proof anywhere on the landing. `LandingMiddle` =
  `<HowItWorks /> <Tools /> <FAQ />` (`LandingExtras.tsx:108-112`); the
  footer (`Foot` at `:252`) is column links + copyright. No school count,
  user count, testimonials, press logos, or "X students used this last
  cycle" line. For a "serious decision tool" this still reads
  pre-launch.
- [OPEN] Brand expression is still generic SaaS. `HowItWorks` (`:128`),
  `Tools` (`:155`), and `FAQ` (`:213`) describe the toolkit but show no
  admissions-specific editorial moment — no sample admit-rate readout,
  no tier-color legend, no essay snippet, no chances histogram. Could
  swap project-management for college-admissions and the page would
  read identically. CRITIQUE wanted "one editorial moment that's
  admissions-specific"; that hasn't been added.

### INFO

- [OPEN] Tools grid still has the orphan-9th-tile problem.
  `landing-extras.css:142` declares `.lpx-tools-grid {
  grid-template-columns: repeat(4, 1fr); }` at `min-width: 1000px`, and
  `LandingExtras.tsx:35-45` still maps **9** tools. At ≥1000px the third
  row has one item with three empty cells. Either drop to `repeat(3,
  1fr)` for a balanced 3×3 or feature one tool as a 2-col bento break.

### NEW

- [NEW BLOCK] **Display serif loaded and used despite MASTER.md "no
  display serif" rule.** `layout.tsx:18-22` imports `Young_Serif` and
  exposes it as `--font-display`. Hero H1 at `page.tsx:138`, hero H2 at
  `:226`, and `not-found.tsx:11` all reference
  `font-[family-name:var(--font-display)]`. MASTER.md §Typography
  explicitly says "There is no display serif in this system. Headlines
  are heavy weights of Geist Sans with tight tracking, not a different
  family." The hero italic line ("college admissions." / "your
  profile.") visibly renders Young Serif italic. Either delete the
  font import + variable + override the hero to Geist Sans heavy /
  italic, or document an explicit page-level override in
  `design-system/pages/landing.md` that says "marketing landing is
  exempt from the no-serif rule for the cinematic hero italic." Right
  now there is no documented override — the rule is being silently
  violated. (`/resume` also touches `--font-display`; logged
  separately on the /resume page.)
- [NEW INFO] Hero animates `filter: blur(...)` on scroll
  (`page.tsx:60`, `:83`). MASTER.md §Motion says "Animate `transform`
  and `opacity` only. Never `width`, `height`, `padding`, `margin`,
  `top`, or `left`." `filter` is not in the prohibited list, but it
  is **also not** on the compositor-friendly list and is the most
  expensive of the three filter ops on lower-end mobile. This is
  cinematic-hero territory so I'm calling INFO not BLOCK; flag here
  if perf-on-mobile becomes a complaint.
- [NEW INFO] `themeColor: "#000000"` in `layout.tsx:55` is hard-coded
  for the entire app, not just the landing. Light-mode users get a
  black status-bar. MASTER.md is mode-symmetric — light is the
  default app theme. Either set `themeColor: { color, media }` pairs
  for `prefers-color-scheme`, or move the lock to the landing page
  only via `metadata` segment override.
- [NEW BLOCK] **Skip-link target is a `<div>`, not `<main>`.**
  `layout.tsx:70` ships a "Skip to content" link to `#main-content`,
  but `AppShell.tsx:61` renders that id on a plain `<div>`:
  `<div id="main-content">{children}</div>`. There is **no `<main>`
  landmark anywhere** on the landing route — `page.tsx` returns a
  fragment with three `<div>` children. Screen reader users get a
  skip link that "works" (focus moves) but lands them in nothing
  semantically distinct, and the page has no main landmark at all.
  Promote `AppShell.tsx:61` to `<main id="main-content">`. (Affects
  every page in the app, not just `/` — flagged here because this is
  the first surface I checked, will reference back from every other
  page.)

