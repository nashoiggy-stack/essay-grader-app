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

---

## `/colleges`

Files swept: `src/app/colleges/page.tsx`,
`src/components/CollegeFilters.tsx`,
`src/components/CollegeResults.tsx`,
`src/components/CollegeSearchInput.tsx`, `CollegeCard.tsx` (covered
in /list section). Also reuses `CollegeCard.tsx` so all the BLOCK +
WARN findings logged on /list (raw tier ramps in `CLASS_COLORS`,
`PILL_TONE` ramps, `bg-[#0a0a14]/70` in `BreakdownPanel`, 32px touch
target, blur-on-mount filter) apply equally on this surface — not
duplicated below.

### BLOCK

- [RESOLVED in current `src/components/CollegeSearchInput.tsx:50-53`]
  CRITIQUE BLOCK: "Escape does not clear search input." Escape
  handler is wired explicitly: `if (e.key === "Escape" && local)
  { e.preventDefault(); setLocal(""); }`.
- [RESOLVED in current `src/components/CollegeFilters.tsx:78`]
  CRITIQUE BLOCK: "Filters always-open, 14 fields tall." Filter
  panel is now `<details className="…">` collapsed by default with
  a single-line summary. First card is above the fold on a 13"
  laptop again.
- [NEW BLOCK] **`bg-[#12121f]` hardcoded hex on the tier guide
  panel.** `colleges/page.tsx:139`: `<div className="rounded-md
  bg-[#12121f] border border-border-strong p-6">`. Same pattern as
  `ChanceResult.tsx:160` — dark-only literal that breaks light
  mode. Replace with `bg-bg-surface` (or `bg-bg-inset` for
  inset look).
- [NEW BLOCK] **TIERS legend in `colleges/page.tsx:17-24` uses raw
  Tailwind ramps for both dot color AND text color.**
  `bg-emerald-500`, `bg-amber-500`, `bg-orange-500`, `bg-red-500`,
  `bg-zinc-500` for dots; `text-emerald-400`, `text-amber-400`,
  `text-orange-400`, `text-red-500`, `text-text-secondary`,
  `text-accent-text` for labels. CRITIQUE systemic #2 specifically
  flagged the same ramps — and this is the *canonical legend that
  defines what tier means* on the page. Hardest place to leave
  off-system. Migrate to `bg-tier-<name>-fg` / `text-tier-<name>-fg`.
  Note `Likely` row uses `bg-blue-500` + `text-accent-text` —
  same accent-vs-tier-likely confusion as `ChanceResult.tsx`
  (BLOCK on /chances).
- [NEW BLOCK] **`GROUPS` in `CollegeResults.tsx:39-49` repeats the
  same raw ramp pattern for the tier-group section headers.**
  `text-emerald-400`, `text-amber-400`, `text-orange-400`,
  `text-red-500`. These are the headings the user reads as they
  scroll down — the most visible tier signal on the page after
  the per-card badge. Migrate to `text-tier-<name>-fg`.

### WARN

- [OPEN] **Card grid wastes ~40% of screen at ≥1024px.** CRITIQUE
  flagged "(2-up + tall cards)" — still exactly that at
  `CollegeResults.tsx:209`: `grid grid-cols-1 sm:grid-cols-2 gap-3`
  with no `lg:` breakpoint. Add a 3-up at `lg:` (or a list-view
  density toggle). Cards collapse cleanly to 1-up on mobile so the
  density bump is purely additive.
- [OPEN] **Tier label per-card is redundant with tier-grouped
  headers.** `CollegeResults.tsx:198-232` already groups results
  by tier with a heading like "Reach (12)"; `CollegeCard.tsx:108`
  *also* badges every card with the same tier label inside that
  group. Drop the per-card badge when rendered inside a grouped
  layout, or swap the per-card badge to a more useful signal
  (e.g. acceptance-rate range, ED/EA availability). Pass a prop
  like `inGroupedView` from `CollegeResults` so `CollegeCard` can
  render the badge only when standalone (e.g. on /list).
- [NEW WARN] **Pinned-count CTA bar mixes accent token + raw
  blue ramp.** `CollegeResults.tsx:145`: `bg-accent-soft border
  border-blue-500/15`. The `border-blue-500/15` is a leftover
  from the pre-token era; pair it with `border-accent-line` to
  match the rest.
- [NEW WARN] **Same-color hover states throughout.**
  - `CollegeResults.tsx:156` "View Strategy" link: `bg-accent-soft
    hover:bg-accent-soft` (no hover delta).
  - `CollegeFilters.tsx:223` "Add interest" button:
    `bg-accent-soft hover:bg-accent-soft`.
  - `CollegeFilters.tsx:177` chip remove button: `opacity-60
    hover:opacity-100` — that one does have a delta but the chip
    itself never gets a hover state.
  Pick one: `hover:bg-accent-soft-strong` (define new token), or
  `hover:bg-accent` with text inversion.
- [NEW WARN] **Active major/interest chips use raw emerald
  ramps.** `CollegeFilters.tsx:160` and `:237`: `bg-emerald-500/15
  ring-emerald-500/30 text-emerald-200`. These signal "active
  filter" not a tier — but they steal the tier-safety visual
  language and they're dark-only (text-emerald-200 on emerald-500/15
  is unreadable in light mode). Either swap to `bg-accent-soft
  text-accent-text ring-accent-line` (active = accented) or
  define a dedicated active-filter token. Same applies to inactive
  chips at `:161` / `:238`: `ring-white/[0.12]` is dark-only by
  construction — invisible in light mode.
- [NEW WARN] **Filters input class has the same `focus:` typo and
  raw blue ramp** as `ChanceForm.tsx`. `CollegeFilters.tsx:18`:
  `focus:border-blue-500/50 focus: focus:ring-accent-line` — bare
  `focus:` is dropped, and the focus border should be
  `focus:border-[var(--accent)]` per MASTER §Focus.
- [NEW WARN] **Cap-warning text uses raw amber ramp.**
  `CollegeFilters.tsx:193`: `text-amber-400/80`. Should be a
  warning token or `text-tier-target-fg`.

### INFO

- [OPEN] CRITIQUE flagged "(optional)" inside label strings —
  same problem as `/chances`; covered there.
- [NEW INFO] Top "Estimates only" disclaimer at
  `colleges/page.tsx:117-131` is mode-aware (RESOLVED in 343ff95)
  but the legend below at `:139` (the `bg-[#12121f]` block) is
  not — they're two adjacent disclaimers with inconsistent
  mode-handling. Fix together with the BLOCK above.
- [NEW INFO] Two-source-of-truth for tier names: `colleges/page.tsx:17-24`
  defines `TIERS[]` for the legend, and `CollegeResults.tsx:39-49`
  defines `GROUPS[]` for the section headers. The labels match
  ("Safety", "Likely", …) but the colors and descriptions live
  in two arrays and could drift. Promote to a single
  `src/lib/tier-meta.ts` consumed by both.

---

## `/profile`

Files swept: `src/app/profile/page.tsx`,
`src/components/SaveIndicator.tsx`, `src/components/SectionNav.tsx`,
`src/components/TranscriptUpload.tsx` (TranscriptUpload covered
again on `/gpa`).

### BLOCK

- [RESOLVED in eb6c1ce] CRITIQUE BLOCK: "No `<form>`, no
  `<fieldset>`/`<legend>`." Verified — `profile/page.tsx:185`
  wraps everything in `<form onSubmit={(e) => e.preventDefault()}>`
  and every section is a `<fieldset>` with `<legend className="sr-only">`
  (e.g. `:188-192`, `:264-268`, `:357-361`, etc.).
- [RESOLVED in 97d34ed / `profile/page.tsx:89`] CRITIQUE BLOCK:
  "Save state never shown." `<SaveIndicator storageKey={…} />` is
  now mounted in the masthead; verified rendering above the H1.
- [WONT-FIX] CRITIQUE called out a "Missing brief feature —
  distinguished-EC checkboxes." User direction is the opposite —
  the EC Evaluator owns tier-1 inference and the self-attestation
  block was deliberately removed (commit `abd6851`). Verified by
  `grep` — no `firstAuthorPublication / nationalCompetition /
  founderWithUsers / selectiveProgram` references in
  `profile/page.tsx`.
- [NEW BLOCK] **Hardcoded `text-white` breaks in light mode.**
  - `profile/page.tsx:130`: completeness count
    `<p className="font-mono ... text-white leading-none">{completed}…</p>`.
  - `:366`: SAT composite `<span className="text-white font-bold">{satComposite}</span>`.
  - `:412`: ACT composite `<span className="text-white font-bold">{actComposite}</span>`.
  All three are page-level numerics. In light mode, `text-white`
  on `--bg-surface (oklch(97% 0.004 250))` is white-on-near-white
  — invisible. Replace with `text-text-primary`.
- [NEW BLOCK] **Completeness bar track + fill use raw blue ramps
  and produce an invisible track.**
  `profile/page.tsx:134`: `<div className="h-1.5 rounded-full
  bg-bg-surface overflow-hidden">` — track is the same color as
  the parent fieldset (`bg-bg-surface`), so the track is
  invisible. Then `:136`: `bg-gradient-to-r from-blue-500 to-blue-400`
  — raw Tailwind blue gradient instead of `--accent`. MASTER.md
  anti-patterns: "No gradient text" implies "no decorative
  gradients" — this fill is a decorative blue gradient where a
  flat `var(--accent)` would suffice. Track → `bg-bg-inset`,
  fill → `bg-[var(--accent)]`, drop the gradient.

### WARN

- [RESOLVED in eb6c1ce / a74c68a] CRITIQUE WARN: "Section ordering
  is wrong (Major sits awkwardly above academics; ECs after essays)."
  Current order at `profile/page.tsx`: Basic (`:188`) → GPA
  (`:264`) → Coursework via `<AdvancedCourseworkSection>`
  (`:348`) → SAT (`:357`) → ACT (`:403`) → ECs (`:471`) →
  Essay (`:505`) → Major (`:545`) → Summary (`:594`). Major now
  sits after academics + ECs + essays as CRITIQUE wanted.
- [RESOLVED in current `profile/page.tsx:118`] CRITIQUE WARN:
  "TranscriptUpload exists but is not mounted on /profile."
  Component is now mounted as the first content block under the
  masthead.
- [RESOLVED in 6ac1a76] CRITIQUE WARN: "Completeness double-counts
  (`APs` chip and `Coursework` chip share the same
  `advancedCoursework` signal)." `profile/page.tsx:55-67` now has
  five sections — Coursework collapsed into a single chip.
- [NEW WARN] **`SourceBadge` mixes accent token with raw blue
  ramp.** `profile/page.tsx:20-27`: outer pill is
  `bg-accent-soft text-accent-text/70 border-accent-line`
  (correct), but inside is `<span className="w-1 h-1 rounded-full
  bg-blue-400" />`. Pick one — use `bg-[var(--accent)]` for the
  dot.
- [NEW WARN] **Loading spinner uses `border-blue-400`.**
  `profile/page.tsx:37`: `<div className="… border-blue-400
  border-t-transparent animate-spin" />`. Should be
  `border-[var(--accent)]`.
- [NEW WARN] **Same `inputClass` typo as `/chances` + `/colleges`.**
  `profile/page.tsx:17`: `focus:border-blue-500/50 focus:
  focus:ring-accent-line`. The bare `focus:` is dropped, and
  `focus:border-blue-500/50` is off-system. Three pages use this
  same broken `inputClass` — promote to a shared utility once
  fixed.
- [NEW WARN] **Over-scale warnings use `text-rose-400`** at
  `:295, :315`. Same systemic issue as `/chances` —
  `--negative-fg` token or reuse `--tier-unlikely-fg`.
- [NEW WARN] **Coursework AP/IB score colors use raw emerald /
  amber** (`profile/page.tsx:701-708`).

### INFO

- [NEW INFO] `<motion.span>` chip animations at `:144-160` add
  per-chip staggered entry animation that triggers on every
  Profile re-render — even when only an unrelated input changed.
  Mild perf cost; consider `framer-motion`'s `LayoutGroup` or
  removing the entry animation since the chips persist.
- [NEW INFO] "Reset to calculated values" button at `:170` has
  no confirmation dialog. If the user has typed values, this
  silently overwrites them. Mild — typed values would be re-typeable
  — but echoes the /resume autofill-reset concern.

