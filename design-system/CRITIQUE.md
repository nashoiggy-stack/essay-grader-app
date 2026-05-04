# AdmitEdge Critique — site-wide audit

12 parallel critique agents reviewed every page route against `MASTER.md`.
This document consolidates findings, organized by **cross-page pattern** (the
high-leverage fixes) followed by **per-page specifics**.

The critique is brutal because the goal is honest signal. The redesign got
the **token foundation** and the **typography sweep** right; the **component
migration** is incomplete and the **information architecture** has drift the
foundation alone can't fix.

---

## TOP 10 SYSTEMIC ISSUES (one fix → many pages improved)

Sorted by leverage. Fix in this order.

### 1. Glass + rounded-2xl + ring-shadow leftovers everywhere
**Severity:** BLOCK — directly violates MASTER.md anti-patterns.
**Symptom:** Every component-level "card" (CollegeCard, ChanceResult, profile
sections, resume sections, essay tabs, /extracurriculars containers,
TranscriptUpload, StrategyCard) still uses some combination of:
`glass`, `rounded-2xl` / `rounded-3xl`, `ring-1 ring-white/[0.06]`,
`shadow-xl` / `shadow-lg`, `bg-[#0f0f1c]` / `bg-[#0a0a14]` hex literals.
**Why this matters:** The page-level chrome is Linear-derived, but the
*content cards* are pre-Linear. That's the "looks vastly different from
the rest of the website" feeling carrying across multiple pages.
**Fix:** One codemod. Search-and-replace:
- `glass`, `glass-card` → `bg-bg-surface`
- `rounded-2xl`, `rounded-3xl` → `rounded-md`
- `ring-1 ring-white/[0.0X]` → `border border-border-hair`
- `shadow-xl`, `shadow-lg`, `hover:shadow-*` → drop entirely
- `bg-[#0f0f1c]`, `bg-[#0a0a14]` → `bg-bg-surface` or `bg-bg-base`

### 2. Tier semantic colors use raw Tailwind ramps, not OKLCH tokens
**Severity:** BLOCK — breaks mode symmetry + design contract.
**Symptom:** `bg-emerald-500`, `bg-amber-500`, `bg-orange-500`, `bg-red-500`,
`text-emerald-400`, `text-amber-400` used on /list, /chances, /colleges,
/strategy, /compare. In light mode these are too vivid; the matched-chroma
contract from MASTER.md is being ignored.
**Fix:** Promote MASTER.md's `Tier` table to actual CSS custom properties:
```css
--tier-safety-fg, --tier-safety-soft
--tier-likely-fg, --tier-likely-soft
--tier-target-fg, --tier-target-soft
--tier-reach-fg, --tier-reach-soft
--tier-unlikely-fg, --tier-unlikely-soft
--tier-insufficient-fg, --tier-insufficient-soft
```
With dark + light + monochrome overrides. Then a single `TIER_STYLES` map
all pages share.

### 3. Section eyebrows are `<p>`, not `<h2>` — heading hierarchy is broken
**Severity:** BLOCK (a11y) — screen readers see a flat list under H1.
**Symptom:** Every tool page (/list, /chances, /profile, /strategy, /compare,
/resume, /essay, /extracurriculars) uses `<p className={EYEBROW}>` for
section labels. Visual style is correct; semantics are wrong.
**Fix:** Promote eyebrow-style elements that introduce a section to `<h2>`
keeping the same visual class. Inside-section sub-eyebrows stay `<p>`. Run
once across all pages.

### 4. `text-gradient` H1 wrapper is still on most pages
**Severity:** BLOCK — anti-pattern per MASTER.md (gradient text).
**Symptom:** `<span className="text-gradient">{title}</span>` on /chances,
/compare, /essay, /extracurriculars, /methodology, /profile, /strategy.
The class itself was migrated to `color: var(--text-primary)` so it works
in both modes, but it's still extending an anti-pattern. New code will
copy it.
**Fix:** Drop the wrapper span entirely. The H1 should just be:
`<h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04] text-text-primary">{title}</h1>`

### 5. Hover-only affordances break touch + keyboard
**Severity:** WARN — invisible to touch users on every page that uses them.
**Symptom:** `opacity-0 group-hover:opacity-100` on:
- /list pin/unpin actions
- /compare selector remove `X`
- /extracurriculars activity row delete/disable
- Probably more.
**Fix:** Always-visible at min 44×44 touch target. If visual clutter is the
worry, soften the affordance (lower opacity, smaller icon) — not hide.

### 6. Save state is invisible on every form page
**Severity:** WARN — users genuinely don't know if their changes persist.
**Symptom:** /profile, /resume, /essay, /extracurriculars write to cloud
storage on every change, but no UI says so. No "Saved", no timestamp, no
dirty/clean indicator.
**Fix:** One shared `<SaveIndicator>` component driven by the cloud-storage
hook. Renders "Saved · 2s ago" or "Saving…" in the page header.

### 7. Tab panel ARIA is half-wired
**Severity:** WARN (a11y) — affects every tabbed surface.
**Symptom:** TabNavigation declares `aria-controls="tabpanel-${id}"` but
the panels never render the matching `id` or `role="tabpanel"`. /essay
is the most-affected page; /compare also has tab-like surfaces with
similar gaps.
**Fix:** Wrap each tab's content area in `<div role="tabpanel"
id="tabpanel-${id}" aria-labelledby="tab-${id}">`.

### 8. No section navigation on long form pages
**Severity:** WARN — /profile (~825 lines), /resume (4000+ px tall when
populated), /strategy (1577 lines) all scroll forever with no jump targets.
**Fix:** A shared `<SectionNav>` primitive with sticky left rail or top
chip-bar. Anchors to each section. Per-section completion state pulled
from existing data hooks.

### 9. Hardcoded `bg-blue-*` / `text-blue-*` instead of `--accent`
**Severity:** WARN — token discipline slipping in many components.
**Symptom:** Dozens of `bg-blue-500/10`, `text-blue-400`, `border-blue-500/30`
across /chances, /essay, /resume, /profile, /strategy. The accent in the
Linear-derived system is **deep indigo**, not the Tailwind blue palette.
**Fix:** One codemod, similar to issue #1:
- `bg-blue-500/10` → `bg-accent-soft`
- `text-blue-400` → `text-accent-text`
- `border-blue-500/{20,30,40}` → `border-accent-line`
(Some of this was already done in commit `bb7ef81` — but new components
have crept in. Re-run.)

### 10. Dashboard is a parallel design system
**Severity:** BLOCK — defeats the redesign entirely on the user's home page.
**Symptom:** `/dashboard` imports its own `--ae-*` tokens, uses Young Serif
display, `clamp()` for app-UI type, `border-radius: 16px` on cards. This
page reads like a port from a different design language.
**Fix:** Migrate `dashboard-atlas.css` to use the global tokens. Drop the
serif. Replace 16px radii with `--radius` (6px). Remove the Orbital layout
mode (per the critique — it's decorative, not informative).

---

## PER-PAGE CRITICAL FINDINGS

### Landing (/)
- **BLOCK:** First-time visitor cannot scan value prop without scrolling — hero says "Your edge in college admissions" but never names *what the product does*. Add a one-line standfirst under the H1.
- **BLOCK:** `LandingMiddle` and `LandingFooter` use `ssr: false` — entire editorial middle invisible to crawlers + no-JS first paint. Disastrous for SEO. Drop `ssr: false`; keep `dynamic()` for code-splitting only.
- **WARN:** No social proof anywhere. For a "serious decision tool" the absence reads as pre-launch toy.
- **WARN:** Brand expression is generic Linear-SaaS — palette/copy/mark could be project management, finance, anything. Add one editorial moment that's admissions-specific (sample admit-rate readout, tier-color legend, essay snippet).
- **INFO:** Tools grid is 9 items in a 4-col layout → orphaned 9th tile. Either go 3×3 or feature one tool as a 2-col bento break.

### /list
- **BLOCK:** `CollegeCard` hardcoded `bg-[#0f0f1c]`, `rounded-2xl`, `hover:shadow-*` — exact "vastly different" complaint, see systemic issue #1.
- **WARN:** Breakdown columns visually lopsided — Balance has 5 rows × ~80px, Major fit has 2 rows.
- **INFO:** `aria-label="Grade: ${letter}"` but the numeric score has no label.

### /chances
- **BLOCK:** Tier colors raw Tailwind ramps + duplicate amber disclaimers (top + result).
- **WARN:** ChanceForm grid mixes required + optional with identical visual weight; "(optional)" lives inside label string, easy to miss.
- **WARN:** Strengths/Weaknesses use `text-emerald-400`/`text-red-400` decoratively, not as tier signal — pollutes the semantic-color contract.

### /colleges
- **BLOCK:** Escape does not clear search input.
- **BLOCK:** Filters always-open, 14 fields tall, push first card below fold on 13" laptop.
- **WARN:** Card grid wastes ~40% of screen at ≥1024px (2-up + tall cards). Add 3-up density or list view.
- **WARN:** Tier label per-card is redundant with tier-grouped headers.

### /profile
- **BLOCK:** No `<form>`, no `<fieldset>`/`<legend>` — semantic groups invisible to AT.
- **BLOCK:** Save state never shown.
- **WARN:** Section ordering is wrong (Major sits awkwardly above academics; ECs after essays).
- **WARN:** `TranscriptUpload` exists but is **not mounted on /profile** — only on /gpa. Users have to leave /profile to discover the auto-fill.
- **WARN:** Completeness double-counts (`APs` chip and `Coursework` chip share the same `advancedCoursework` signal).

### /compare
- **BLOCK:** Tier signaling is color-only at small sizes — fails the "color is never the only signal" rule.
- **BLOCK:** Dark-only palette — hardcoded `#06060f`, `text-emerald-300`, etc. throughout. Cannot render in light mode.
- **BLOCK:** Sticky tab nav clips on mobile (8 tabs at 375px with no scroll affordance).
- **BLOCK:** `QualitativeCompare` uses `repeat(N, 1fr)` instead of the `auto-fit minmax()` pattern the rest of the page fixed.
- **WARN:** Color-by-selection-order means the "blue school" changes when slots are reordered. Use stable hash on `c.name`.
- **WARN:** Selector remove `X` is `opacity-0 group-hover:opacity-100` — invisible on touch (see issue #5).

### /strategy
- **BLOCK:** No landmark structure — entire 1577-line page is one `<main>` with flat `<div>` cards. No `<section aria-labelledby>`, no skip links, no h2 group headings.
- **BLOCK:** Spec calls for "school-by-school plan" (atlas) — `ApplicationStrategyBody` renders one paragraph + flat bullet list. **The atlas does not exist.**
- **BLOCK:** Focus management on expand/collapse is missing — `aria-expanded` set, but no `aria-controls` and no live regions.
- **WARN:** Action items are bullets with checkboxes only — no "Open in profile" links, no jumps to /colleges. Pattern exists on Missing-Data banner; copy it.
- **WARN:** Count tiles look static — no hover, no chevron, no `aria-expanded`. Then `SchoolsInClassificationNote` ignores the selected classification entirely (`void classification`) — a bug masquerading as a feature.
- **INFO:** 1577 lines violates the 800-line file rule. Split into `src/components/strategy/`.

### /resume
- **BLOCK:** No section navigation — 8 sections + Skills + Header in one column, easily 4000+ px tall when populated.
- **WARN:** AI `Improve` button silently overwrites prose with no diff/undo. Dangerous.
- **WARN:** Mode toggle ("Resume mode / Activities Helper") sits where section nav should live and replaces the whole editor — destination disguised as mode.
- **WARN:** Mobile preview parity is poor — preview drops below editor with no scroll-to.
- **INFO:** "Reset to autofilled" at bottom with no confirm. One click nukes user edits.

### /essay
- **BLOCK:** ContainerScroll 3D hero is a cosmic-redesign holdover. Has gradient text + tilt-on-scroll + hardcoded `bg-[#0a0a14]` + bouncy easing. Replace with the standard masthead pattern.
- **BLOCK:** Textarea has visible `<label>` but no `htmlFor`/`id`/`aria-label`/`aria-describedby`. Word-count pill is not `role="status"` `aria-live="polite"` so updates aren't announced.
- **BLOCK:** Drop zone is `motion.div` with `onClick` — no role, no tabIndex, no Enter/Space handling. Keyboard-inaccessible.
- **WARN:** `aria-controls` declared but tab panels have no matching `id`/`role="tabpanel"` (see issue #7).
- **WARN:** `FeedbackTab` Quick Scores duplicate `CommonAppTab` and `ScoreOverview` — three places to see the same numbers.
- **WARN:** "Line Notes" tab is named overlays but renders as a stacked list — content/name mismatch.

### /extracurriculars
- **BLOCK:** Page uses `rounded-3xl border-white/10 bg-white/5 backdrop-blur-xl` cards + `text-gradient` headline. Every container violates the contract.
- **BLOCK:** No `aria-live` region for AI responses — screen-reader users get no announcement.
- **BLOCK:** **Missing brief feature** — distinguished-EC checkboxes (first-author publication / national competition / founder-with-users / selective program) don't exist as UI. Tier-1 is inferred from chat only. Users can't self-attest, model can't anchor.
- **WARN:** `ActivitiesHelperPanel` is actually a **resume**-bulk-improve panel (wrong file in the brief; the actual EC suggestion helper doesn't exist on this page).
- **WARN:** Nothing tells the user their EC band feeds /chances and /list — cross-tool value prop is invisible.

### /gpa
- **BLOCK:** `TranscriptUpload` is the primary off-system component on this page — `rounded-2xl`, `bg-white/[0.03]`, `backdrop-blur-sm`, `text-emerald-400`/`text-red-400`, hardcoded `text-white`. Sits between disciplined chrome and disciplined iframe and visibly screams "old design system."
- **BLOCK:** `TranscriptUpload` width contract violates the page — sets its own `max-w-2xl mx-auto` while the rest is `max-w-[1180px]`. Hard visual break.
- **WARN:** Iframe seam — body uses `-apple-system` while parent uses Geist. On non-Mac, `Inter` will render before fallback and look noticeably different.
- **WARN:** Iframe still has `'DM Sans'` references on `.btn-add-year` and `.ytab-remove`. Migration was incomplete on those classes.
- **WARN:** Fixed `height: 2400px` is brittle. No postMessage-based height sync.

### /dashboard
- **BLOCK:** Parallel design system (see systemic issue #10).
- **BLOCK:** First-load experience is wrong-footed — empty users see a 7-stat grid filled with `—` and a `0%` readiness bar. Should show one CTA above the fold instead.
- **BLOCK:** `LayoutTweaks` lacks state semantics — buttons toggle a value but expose no `aria-pressed`.
- **WARN:** Three layout modes is feature creep. Atlas + List cover the use case; Orbital is decorative (distance encodes a 3-bucket categorical, not a continuous metric — geometry implies precision that isn't there).
- **WARN:** Shortlist duplicates /list / /colleges without clear job. Compress or link out.
- **INFO:** Header eyebrow says "Application atlas" but page is `/dashboard`. Pick one name.
- **INFO:** Orbital description says "Eight tools, one orbit" but `tools` array has nine. Hardcoded copy drift.

---

## RECOMMENDED FIX ORDER

If you only do 5 things, do these — they hit the most pages:

1. **Codemod systemic issue #1 + #9** (glass/rounded-2xl + raw blue → tokens) — single Python script, 30 min, fixes the "card" inconsistency on every page.
2. **Codemod systemic issue #4** (drop `text-gradient` H1 wrapper) — 7 pages.
3. **Promote eyebrow `<p>` → `<h2>`** (systemic issue #3) — fixes a11y everywhere.
4. **Migrate dashboard to global tokens** (systemic issue #10) — fixes /dashboard which currently bleeds drift into the user's command center.
5. **Add `<SaveIndicator>` primitive** + mount on /profile, /resume, /essay, /extracurriculars (systemic issue #6).

If you have time for 5 more:

6. Tier color tokens (systemic issue #2) + replace raw ramps everywhere.
7. Section nav primitive (systemic issue #8) + add to /profile, /resume, /strategy.
8. Fix ContainerScroll hero on /essay → standard masthead.
9. Fix /strategy IA — group cards into `<section>`s with `<h2>` rules; build the actual atlas.
10. Fix /colleges filters discoverability — collapse to chip-bar with "More filters" disclosure.
