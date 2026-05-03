# AdmitEdge Linear — Master Design Contract

Source of truth for the Linear-derived redesign. Page-level deviations live in
`design-system/pages/<page>.md` and **override** this file when present.

This is **not** a copy of Linear.app. It borrows three principles — calm
density, monochrome + one restrained accent, numerics-as-hero — and applies
them to a college-admissions decision tool, which is a different surface
(forms, classifications, AI feedback) than an issue tracker.

## North Star

A serious tool for serious decisions, that still respects a stressed
seventeen-year-old's attention. Every page should feel:

- **Engineered, not decorated.** No glass, no gradients-for-decoration, no
  drop shadows used as ornament. If a visual element exists, it carries
  meaning.
- **Numbers-first.** Admit %, GPA, AI scores, tier counts — these are the
  product. Mono + tabular figures, never relegated to footnotes.
- **Calm under density.** A page can show a lot without screaming. Hairlines
  do the dividing work; one accent does the calling-out work.
- **Mode-symmetric.** Both light and dark are first-class. Light is the
  default (daytime essay-writing); dark is for late-night planning.

## Anti-patterns (hard nos)

- No glassmorphism / backdrop-blur as decoration (allowed only on
  semi-transparent overlays where the blur is functional)
- No gradient text (use weight + size for emphasis)
- No `border-left: Npx solid color` accent stripes
- No drop-shadow boxes for cards (hairline borders only)
- No icon + heading "tile" pattern repeated across the site
- No emoji as UI icon
- No bouncy or elastic motion easings
- No `text-gradient` headlines (the existing class is fine because it just
  resolves to solid white — leave it alone, but never expand its use)

## Color tokens

OKLCH-tinted neutrals so light/dark match perceptually. Backgrounds carry a
faint cool tint toward the brand hue so neutrals don't feel "off-the-shelf gray".

### Light mode (default)
| Token              | Value                          | Use                                     |
|--------------------|--------------------------------|-----------------------------------------|
| `--bg-base`        | `oklch(99% 0.003 250)`         | Page background — warm-cool off-white   |
| `--bg-surface`     | `oklch(97% 0.004 250)`         | Cards, sections                         |
| `--bg-surface-2`   | `oklch(95% 0.005 250)`         | Hover surfaces, raised elements         |
| `--bg-inset`       | `oklch(93% 0.006 250)`         | Inputs, code, inset surfaces            |
| `--text-primary`   | `oklch(18% 0.01 250)`          | Body text, headlines                    |
| `--text-secondary` | `oklch(40% 0.01 250)`          | Supporting copy                         |
| `--text-muted`     | `oklch(58% 0.008 250)`         | Labels, eyebrows                        |
| `--text-faint`     | `oklch(72% 0.006 250)`         | Inline metadata                         |
| `--border-hair`    | `oklch(18% 0.01 250 / 0.08)`   | Default 1px divider                     |
| `--border-strong`  | `oklch(18% 0.01 250 / 0.16)`   | Card outlines, focus context            |

### Dark mode
| Token              | Value                          |
|--------------------|--------------------------------|
| `--bg-base`        | `oklch(13% 0.012 250)`         |
| `--bg-surface`     | `oklch(16% 0.013 250)`         |
| `--bg-surface-2`   | `oklch(19% 0.014 250)`         |
| `--bg-inset`       | `oklch(11% 0.011 250)`         |
| `--text-primary`   | `oklch(96% 0.005 250)`         |
| `--text-secondary` | `oklch(76% 0.008 250)`         |
| `--text-muted`     | `oklch(58% 0.008 250)`         |
| `--text-faint`     | `oklch(42% 0.008 250)`         |
| `--border-hair`    | `oklch(96% 0.005 250 / 0.08)`  |
| `--border-strong`  | `oklch(96% 0.005 250 / 0.18)`  |

### Accent — single, restrained
We deliberately avoid Linear's purple. Brand accent is a deep desaturated
indigo that reads "decision/strategy" without screaming. Used only for:
primary CTAs, the active nav state, and the active classification highlight
on /list and /chances.

| Token              | Light                          | Dark                           |
|--------------------|--------------------------------|--------------------------------|
| `--accent`         | `oklch(48% 0.16 264)`          | `oklch(64% 0.18 264)`          |
| `--accent-soft`    | `oklch(48% 0.16 264 / 0.08)`   | `oklch(64% 0.18 264 / 0.12)`   |
| `--accent-line`    | `oklch(48% 0.16 264 / 0.24)`   | `oklch(64% 0.18 264 / 0.32)`   |
| `--accent-text`    | `oklch(36% 0.12 264)`          | `oklch(82% 0.10 264)`          |

### Semantic — tier classifications
Five admission tiers + insufficient. Distinct hues but matched chroma so
they sit in the same visual register. **Never** used decoratively; only as
classification signal on /list, /chances, /colleges, /strategy, /compare.

| Tier         | Light fg                  | Dark fg                   | Soft bg              |
|--------------|---------------------------|---------------------------|----------------------|
| safety       | `oklch(45% 0.15 155)`     | `oklch(72% 0.16 155)`     | `oklch(.. / 0.10)`   |
| likely       | `oklch(48% 0.15 220)`     | `oklch(72% 0.16 220)`     | `oklch(.. / 0.10)`   |
| target       | `oklch(56% 0.15 75)`      | `oklch(78% 0.15 75)`      | `oklch(.. / 0.10)`   |
| reach        | `oklch(54% 0.16 45)`      | `oklch(74% 0.16 45)`      | `oklch(.. / 0.10)`   |
| unlikely     | `oklch(48% 0.18 22)`      | `oklch(70% 0.18 22)`      | `oklch(.. / 0.10)`   |
| insufficient | `oklch(58% 0.008 250)`    | `oklch(58% 0.008 250)`    | none                 |

## Typography

Use the typefaces the project already loads — **Geist Sans + Geist Mono**.
Geist is Vercel's typeface, intentionally calm and technical; same
neighborhood as Linear's custom typeface. We do not pull additional fonts.

There is **no display serif** in this system. Headlines are heavy weights of
Geist Sans with tight tracking, not a different family.

| Token             | Stack                                                          |
|-------------------|----------------------------------------------------------------|
| `--font-sans`     | `var(--font-geist-sans), system-ui, sans-serif`                |
| `--font-mono`     | `var(--font-geist-mono), ui-monospace, monospace`              |

### Type scale — fixed `rem` for app UI

App UI does not use fluid type. Fluid (`clamp`) is reserved for **only** the
landing page hero + cinematic CTA. Everything else uses a fixed scale so a
table cell on /chances reads the same size at 1440px and 320px (it just
reflows).

| Token              | Value     | Use                                    |
|--------------------|-----------|----------------------------------------|
| `--text-xs`        | `0.75rem` | 12px — eyebrows, faint metadata        |
| `--text-sm`        | `0.8125rem` | 13px — table data, dense lists       |
| `--text-base`      | `0.9375rem` | 15px — body copy                     |
| `--text-md`        | `1.0625rem` | 17px — section subheads              |
| `--text-lg`        | `1.375rem`  | 22px — page subheads                 |
| `--text-xl`        | `1.875rem`  | 30px — page titles                   |
| `--text-display-1` | `2.5rem`    | 40px — hero on tool pages            |
| `--text-display-2` | `clamp(2.5rem, 6vw, 4.75rem)` | 40-76px — landing hero only |

### Tracking
- Body: `-0.005em`
- Headlines (display-1, display-2, xl): `-0.022em`
- Eyebrows / all-caps labels: `0.08em`

### Numerics
Anywhere a number conveys data (admit %, score, GPA, count), use:
```css
font-family: var(--font-mono);
font-feature-settings: "tnum" 1, "zero" 0;  /* tabular figures, regular zero */
```

This is non-negotiable. The mono is the visual cue that "this is data,
not prose."

## Spacing scale — 4pt

| Token        | Value   |
|--------------|---------|
| `--space-1`  | `4px`   |
| `--space-2`  | `8px`   |
| `--space-3`  | `12px`  |
| `--space-4`  | `16px`  |
| `--space-5`  | `24px`  |
| `--space-6`  | `32px`  |
| `--space-7`  | `48px`  |
| `--space-8`  | `64px`  |
| `--space-9`  | `96px`  |
| `--space-section` | `clamp(64px, 8vw, 128px)` | section vertical rhythm |

## Radii

We use far smaller radii than the current main. Linear-derived = sharp.

| Token        | Value | Use                              |
|--------------|-------|----------------------------------|
| `--radius-sm`| `4px` | Inputs, small buttons            |
| `--radius`   | `6px` | Cards, surfaces (default)        |
| `--radius-md`| `8px` | Modals                           |
| `--radius-lg`| `12px`| Heroes, big cards                |
| `--radius-pill`| `999px` | Pills, only when meaning is "tag" |

No rounded-`2xl`, no `3xl` blob shapes.

## Borders

The visual system runs on **hairlines**. Cards do not have shadows.

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-hair);
  border-radius: var(--radius);
}
```

Hover/active surfaces gain a `--border-strong` border, not a shadow.

## Motion

| Use                                | Duration | Easing                                   |
|------------------------------------|----------|------------------------------------------|
| Hover color/border                 | 150ms    | `cubic-bezier(0.16, 1, 0.3, 1)`          |
| Modal in/out, page transitions     | 240ms    | `cubic-bezier(0.16, 1, 0.3, 1)`          |
| Section reveals on scroll          | 360ms    | same                                     |
| Disabled states                    | instant  | none                                     |

Animate `transform` and `opacity` only. Never `width`, `height`, `padding`,
`margin`, `top`, or `left`.

`prefers-reduced-motion: reduce` → all motion < 80ms or none.

## Focus

Always visible, never relies on color alone.

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: inherit;
}
```

## Component conventions

### Button — primary
- Background: `var(--accent)`, text: `oklch(99% 0 0)`
- Padding: `var(--space-3) var(--space-5)`, radius: `var(--radius-sm)`
- Hover: 92% lightness on accent (slightly lighter), transform `translateY(-0.5px)`
- Active: transform `translateY(0)`, no scale transforms (would shift layout)

### Button — secondary
- Background: transparent, border: `1px solid var(--border-strong)`, text: `var(--text-primary)`
- Hover: `var(--bg-surface-2)` background

### Button — ghost
- Text only, padding `var(--space-2) var(--space-3)`, hover: `var(--bg-surface-2)` bg

### Input
- Background: `var(--bg-inset)`, border: `1px solid var(--border-hair)`
- Padding: `var(--space-3) var(--space-4)`, radius: `var(--radius-sm)`
- Focus: border becomes `var(--accent)` (no glowing ring), `box-shadow: 0 0 0 1px var(--accent-soft)` for the second-line emphasis
- Min height: `36px` desktop / `40px` mobile (touch target)
- Mobile font-size: ≥16px (already enforced globally)

### Card
- See "Borders" — hairline + surface, sharp radius

### Eyebrow label (above section titles, masthead)
- Font: sans, weight 500, size `--text-xs`, tracking `0.08em`, uppercase
- Color: `var(--text-muted)`
- Optionally preceded by a 16px hairline rule

### Numeric display
```css
.num {
  font-family: var(--font-mono);
  font-feature-settings: "tnum" 1, "zero" 0;
  letter-spacing: -0.01em;
}
```

Hero numbers (admit %, list grade letter): use `font-family: var(--font-sans)`
at heavy weight + tabular figures — sans, not mono, when the number IS the
masthead.

## Layout

- Container: `max-width: 1180px; padding: 0 clamp(16px, 4vw, 32px); margin: 0 auto`
- Page padding-top from navbar baseline: `var(--space-7)` (48px) desktop, `var(--space-5)` (24px) mobile
- Sections: separated by `var(--space-section)` rhythm, never by extra horizontal rules

## Page archetypes

1. **Landing** (`/`) — display-2 hero with `clamp()`. Bento-light feature grid (no glass). Shorter than current.
2. **Tool page** (`/list`, `/chances`, `/colleges`, `/strategy`, `/compare`) — masthead with eyebrow + display-1 + standfirst. Dense data sections separated by hairline rules. No card-soup.
3. **Form page** (`/profile`, `/gpa`, `/resume`, `/extracurriculars`, `/essay`) — sectioned forms, hairline dividers between sections, sticky save state.
4. **Detail/result** (`/strategy/share/...`, `/methodology`) — long-form readable column, max width 65ch.

## Accessibility floor

- All text ≥4.5:1 on background. Verify with the OKLCH lightness math above.
- Focus visible on every interactive element.
- Prefers-reduced-motion respected.
- Tier color is **never** the only signal — always paired with a label.
- Min touch target 44×44 on mobile.

## Implementation order (advisory)

1. Tokens in `globals.css`
2. NavBar + AppShell
3. Landing page (`/`)
4. /list (already partially editorial-styled — biggest delta)
5. /colleges + /chances + /profile (data-heavy)
6. /strategy + /compare
7. Remaining forms

## Page overrides

When a page deviates from this contract, write the override in
`design-system/pages/<route>.md`. Example: a marketing landing is allowed
fluid type for the hero — that's a documented override of the "fixed scale
for app UI" rule.
