# Phase 07 — College list free-text search

**Goal:** Substring search over visible colleges by name + aliases. Localhost dev build.

## Files

- Create: `src/components/CollegeSearchInput.tsx`
- Modify: `src/app/colleges/page.tsx` — mount input above filters, debounce 150ms, pass filtered slice into CollegeResults
- No changes to `useCollegeFilter` (search is layered on top of its output).

## Behavior

- Single text input above CollegeFiltersPanel.
- Trim + lowercase. Match `college.name` or any `college.aliases` entry.
- Empty query = pass-through.
- Show `× clear` button inside the input when non-empty (lucide `X`).
- Debounce 150ms.
- Keep result count badge wired to the filtered length so the existing UI stays accurate.

## Acceptance

- Search bar visible at top of /colleges.
- Typing "stanf" filters to Stanford.
- × button clears.
- Tab + arrow keys still work normally inside the input.
