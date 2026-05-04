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
  page.) Note: tool pages do declare their own `<main>` element
  inside `children` (e.g. `list/page.tsx:188`), so the App-Shell
  wrapper would create a duplicate `<main>` if simply renamed. Fix
  is to drop the AppShell wrapper to a `<div role="presentation">`
  (or remove the wrapper entirely) and let route pages own the
  landmark, then update the skip-link target to `#main-content` on
  each page's `<main>`. Currently `/` is the only page without its
  own `<main>` — every tool page has one.

---

## `/list`

Files swept: `src/app/list/page.tsx`, `src/components/CollegeCard.tsx`,
`src/components/BreakdownPanel.tsx`, `src/components/ScrollReveal.tsx`.

### BLOCK

- [RESOLVED in current `src/app/list/page.tsx:188`] Page declares its
  own `<main>` landmark — the global skip-link concern from `/`
  doesn't compound here.
- [RESOLVED in current `src/components/CollegeCard.tsx:100`]
  CRITIQUE flagged `CollegeCard` hardcoded `bg-[#0f0f1c]`,
  `rounded-2xl`, `hover:shadow-*`. Card chrome is now `rounded-md
  bg-bg-surface border border-border-hair … hover:bg-bg-elevated
  hover:border-border-strong` — tokens, hairline border, no shadow.
  (Vestigial `transition-[box-shadow]` still present at `:100`; no
  `box-shadow` is ever set, so the transition is dead weight but
  harmless.)
- [NEW BLOCK] **Tier color ramps in `CollegeCard.tsx:12-20` are still
  raw Tailwind, not OKLCH tier tokens.** `CLASS_COLORS` defines
  `unlikely: bg-red-600/10 / text-red-500`, `reach: bg-orange-500/10
  / text-orange-400`, `target: bg-amber-500/10 / text-amber-400`,
  `safety: bg-emerald-500/10 / text-emerald-400`. CRITIQUE systemic
  #2 said all tier signals must use `--tier-*-fg / --tier-*-soft`
  tokens. `/list` uses these tokens at the page level (`TIER_DOT` at
  `list/page.tsx:66-73` is correct: `bg-tier-safety-fg` etc.) but
  the **per-card** signaling — which is what users actually see on
  every pinned-school card — never migrated. Same fix: remap
  `CLASS_COLORS` to `bg-tier-<name>-soft` / `text-tier-<name>-fg` /
  `ring-tier-<name>-line`. (Note: `likely` already uses
  `bg-accent-soft` / `text-accent-text` — but that's wrong too,
  because `--accent` is the brand indigo, not the `--tier-likely-*`
  blue. Two different tokens, accidentally aliased.)
- [NEW BLOCK] **`BreakdownPanel.tsx:45` and `:99` use hard-coded hex
  `bg-[#0a0a14]/70`.** This is the panel that opens when a user
  clicks "See the breakdown" on a college card. Dark-only literal
  on a panel that has to render in light mode too — in light mode
  it shows a near-black 70%-alpha block over the card's
  `--bg-surface`, which is wildly off-system and breaks the
  same-page contrast contract. Replace both with `bg-bg-inset` (or
  `bg-bg-surface-2`).
- [NEW BLOCK] **Confidence/caveat badges in `CollegeCard.tsx:206-228`
  use dark-only Tailwind ramps.** `text-emerald-300` on
  `bg-emerald-500/10` for "Recruited athlete pathway" (`:206`), and
  `text-text-secondary` on `ring-zinc-500/20` for the others. The
  emerald-300 text on the emerald-500/10 background fails 4.5:1 in
  light mode (light emerald text on near-white bg). Remap to tier
  tokens or accent tokens.

### WARN

- [RESOLVED in current `src/components/CollegeCard.tsx:127-148`]
  CRITIQUE systemic #5 flagged `opacity-0 group-hover:opacity-100`
  on `/list` pin/unpin. The pin button is now always-visible
  (`mt-0.5 w-8 h-8 rounded-full flex…`). Touch users can see and
  use it.
- [OPEN] **Breakdown columns visually lopsided.** CRITIQUE flagged
  Balance has 5 rows × ~80px while Major fit has 2 rows. Still
  true at `list/page.tsx:354-364`: 5 balance rows
  (`tierDistribution`, `count`, `edLeverage`, `financialFit`,
  `geoDiversity`) versus 2 major-fit rows (`avgFit`,
  `programStrong`). Visual rhythm is unchanged. Either pad the
  major column with the per-major bar list (already computed in
  `MajorFitFlag`) or compress balance into 3 rows by combining
  `financialFit` + `geoDiversity` into a single "Diversification"
  row.
- [NEW WARN] **`PILL_TONE` for major-fit pills uses raw ramps**
  (`CollegeCard.tsx:290-294`). `bg-emerald-500/10 / text-emerald-400`
  for strong, `bg-amber-500/10 / text-amber-400` for decent. This
  isn't a tier-classification signal so it doesn't strictly need a
  `--tier-*` token, but it's the same family of "raw Tailwind ramps
  used decoratively" that CRITIQUE #2 + #9 are about. Define
  `--fit-strong-*` / `--fit-decent-*` tokens, or reuse `--tier-safety-*`
  for strong and `--tier-target-*` for decent.
- [NEW WARN] **`LETTER_TONE` in `list/page.tsx:85-97` uses raw ramps.**
  A+/A/A- → `text-emerald-600 dark:text-emerald-300`, C+/C/C- →
  `text-amber-...`, D → `text-orange-...`, F → `text-red-...`. Same
  systemic-#2 pattern. Less load-bearing because the letter itself
  is the signal, but still off-system.
- [NEW WARN] **Pin button is `w-8 h-8` (32×32 px)** at
  `CollegeCard.tsx:136`. MASTER.md §Accessibility floor says "Min
  touch target 44×44 on mobile." 32 is below the threshold even
  with a generous tap-area extension (none is set). Promote to
  `w-11 h-11` on mobile or add explicit padding to inflate the tap
  region.
- [NEW WARN] **Animated `filter: blur(4px)` per card on mount**
  (`CollegeCard.tsx:95-97`). Each card animates from `blur(4px)`
  to `blur(0px)` on entry; with N pinned schools you get N blur
  filters running concurrently. Filter blur is GPU-expensive and
  not on the compositor-friendly list. MASTER.md §Motion says
  animate `transform` + `opacity` only. Drop the `filter` term;
  keep the `y` translate + opacity.

### INFO

- [OPEN] **Numeric score on grade masthead has no aria-label.**
  CRITIQUE flagged `aria-label="Grade: ${letter}"` on the letter
  but no label on the numeric score. Still true at
  `list/page.tsx:287-300`: the `{grade.letter}` span has
  `aria-label`, the `{grade.officialScore.toFixed(1)} / 100` block
  next to it doesn't. Add `aria-label={`Score: ${score} of 100`}`.
- [NEW INFO] `recruitedAthletePathway` toggles a green "Recruited
  athlete pathway" badge at `CollegeCard.tsx:206-208` but never
  surfaces what it means or how the user opted into it. If
  pathway-eligible, also explain (tooltip or short caption: "We
  detected athletic recruiting on your profile").
- [NEW INFO] `void Bookmark;` at `list/page.tsx:678` — dead-code
  shim. The named import is unused now; just drop it from the
  import statement at `:6` (`import { Plus, ArrowRight, Bookmark,
  RefreshCw, X }`).
- [NEW INFO] Empty-state CTA bg uses `var(--accent-fg)` for text
  color (`list/page.tsx:261`). Verified — `--accent-fg` is defined
  in `globals.css:43` (light) and `:117` (dark) as `oklch(99% 0
  0)`. Not a real bug; leave as-is.

---

## `/chances`

Files swept: `src/app/chances/page.tsx`, `src/components/ChanceForm.tsx`,
`src/components/ChanceResult.tsx`, `src/components/BreakdownPanel.tsx`,
`src/components/MajorSelect.tsx`.

### BLOCK

- [PARTIALLY-RESOLVED] CRITIQUE flagged tier colors as raw Tailwind
  ramps. Verified at `ChanceResult.tsx:10-17`:
  `safety/target/reach/unlikely/insufficient` are now on
  `bg-tier-*-soft` / `text-tier-*-fg` / `bar: bg-tier-*-fg`
  tokens. **However `likely` was not migrated** (`:12`):
  `{ bg: "bg-accent-soft", text: "text-accent-text", bar:
  "bg-blue-500", glow: "shadow-blue-500/20" }`. Two distinct
  problems: (1) `--accent` is the brand indigo, not the
  `--tier-likely-*` family (different token, different hue);
  (2) `bar: bg-blue-500` and `glow: shadow-blue-500/20` are still
  raw Tailwind ramps, the only `glow` value in the whole map. Pick
  `bg-tier-likely-soft / text-tier-likely-fg / bg-tier-likely-fg`
  to match the other five rows; drop the `glow` key entirely.
- [OPEN] CRITIQUE flagged "duplicate amber disclaimers (top +
  result)". Both still render. Top disclaimer at
  `chances/page.tsx:33-47` ("Estimates only…") and bottom
  disclaimer at `ChanceResult.tsx:240-246` ("This is an estimate
  based on general admissions patterns…"). The two say almost the
  same thing in different tones. Keep one — preferably the top
  one, which is more substantive and links to `/methodology`.
- [RESOLVED in 343ff95] CRITIQUE WARN about light-mode contrast on
  the top "Estimates only" disclaimer. Verified at
  `chances/page.tsx:33-47`: it now ships separate light + dark
  amber tones (`bg-amber-500/[0.06] dark:bg-amber-500/[0.04]`,
  `text-amber-900/85 dark:text-amber-200/80`). Reads in both modes.
- [NEW BLOCK] **Hardcoded `bg-[#12121f]` headline card.**
  `ChanceResult.tsx:160` wraps the headline narrative in
  `<div className="rounded-xl bg-[#12121f] border border-border-strong
  p-5">`. Dark-only hex literal sitting inside a card that already
  has `bg-bg-surface`. In light mode this is a near-black block
  inside a white card — the most visually broken part of the page.
  Replace with `bg-bg-inset` or `bg-bg-surface-2`.
- [NEW BLOCK] **Bottom disclaimer is dark-only.**
  `ChanceResult.tsx:240-246`: `bg-amber-500/5 border
  border-amber-500/10 ... text-amber-400/70`. Even after deduping
  with the top one (above), this block has no light-mode tones —
  text-amber-400 on amber-500/5 in light mode reads as washed-out
  yellow on near-white at way under 4.5:1.
- [NEW BLOCK] **Score-bar track is invisible in light mode.**
  `ChanceResult.tsx:148`: `<div className="h-2 rounded-full
  bg-bg-surface overflow-hidden">` — but the parent card at `:102`
  is *also* `bg-bg-surface`. Same color on same color = no track,
  the bar appears to float. Use `bg-bg-inset` for the track.

### WARN

- [OPEN] **`ChanceForm` mixes required + optional with identical
  visual weight.** CRITIQUE flagged "(optional)" lives inside the
  label string. Still true at `ChanceForm.tsx:192` ("SAT
  (optional)"), `:198` ("ACT Composite (optional)"), `:204`
  ("ACT Science (optional)"), `:239` ("Common App Score (0-100)"
  — silent about optional even though it's optional). No required-*
  marker either. Adopt one rule: required inputs get a red asterisk
  + `aria-required`, optional inputs lose the inline `(optional)`
  in favor of a muted "Optional" suffix in `<small>`.
- [OPEN] **Strengths/Weaknesses use raw `text-emerald-400` /
  `text-red-400`.** CRITIQUE called this out as "polluting the
  semantic-color contract" because emerald/red are tier colors,
  not generic positive/negative signals. Still true at
  `ChanceResult.tsx:193, 198, 207, 212`. Either reuse
  `--tier-safety-fg` (green-tier) for strengths and
  `--tier-unlikely-fg` (red-tier) for weaknesses (they happen to
  be the same hues anyway, this is not a tier collision because
  these are not tier classifications), or define dedicated
  `--positive-fg / --negative-fg` tokens.
- [NEW WARN] **`GpaScaleNote` and the auto-fill banner use raw
  blue ramps.** `ChanceForm.tsx:320` declares `bg-blue-500/[0.05]
  border border-blue-500/[0.18]`. CRITIQUE systemic #9 codemodded
  most of these to `bg-accent-soft / border-accent-line` — this
  one was missed.
- [NEW WARN] **`text-rose-400` for over-scale GPA warnings**
  (`ChanceForm.tsx:174, 186`). Same family — should use a
  semantic-error token, not a Tailwind ramp.
- [NEW WARN] **Bouncy spring on the tier-percentage badge.**
  `ChanceResult.tsx:109-112`: `transition={{ type: "spring",
  stiffness: 200, damping: 15 }}`. MASTER.md anti-patterns:
  "No bouncy or elastic motion easings." A `damping: 15` spring at
  `stiffness: 200` overshoots visibly. Replace with `transition={{
  duration: 0.24, ease: [0.16, 1, 0.3, 1] }}` per MASTER §Motion.
- [NEW WARN] **Coursework score colors use raw ramps.**
  `ChanceForm.tsx:284-291` — `text-emerald-400` for AP≥4 / IB≥6,
  `text-amber-400` for AP=3 / IB 4-5. Decorative use of tier-named
  colors. Define dedicated coursework-quality tokens or reuse the
  `--tier-*` system explicitly.
- [NEW WARN] **Typo: empty `focus:` class.** `ChanceForm.tsx:21`
  — `inputClass` has `focus:border-blue-500/50 focus:
  focus:ring-accent-line` — there's a bare `focus:` with no rule
  attached, which Tailwind silently drops. Also `focus:border-blue-500/50`
  conflicts with the focus-state token contract in MASTER.md
  (focus border should become `var(--accent)`, not raw blue-500).
- [NEW WARN] **Missing-data hints panel uses `bg-zinc-500/5`.**
  `ChanceResult.tsx:224` — should use a token (`bg-bg-inset` or
  `bg-bg-surface-2`).

### INFO

- [OPEN] CRITIQUE noted "(optional)" inside label strings is easy
  to miss — covered above as WARN #1. Marking INFO as
  acknowledged but not addressed.
- [NEW INFO] `details > summary` hover at `ChanceResult.tsx:177`
  — `hover:bg-bg-surface` on a `bg-bg-surface` parent yields no
  visible hover state. Use `hover:bg-bg-surface-2`.
- [NEW INFO] The `<details>` "See the breakdown" element at
  `ChanceResult.tsx:176-188` has no `aria-expanded` (browser-native
  on `<details>` so screen readers do announce it correctly), but
  the chevron rotation transition is on `transform` — good. No
  action; flagged for completeness.

