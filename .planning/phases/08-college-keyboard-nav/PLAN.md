# Phase 08 — Keyboard navigation on /colleges

**Goal:** Arrow-key focus across visible college cards + standard shortcuts.

## Files

- Create: `src/hooks/useCollegeListKeyboard.ts`
- Modify: `src/components/CollegeCard.tsx` — accept `focused` prop, render focus ring (`ring-2 ring-blue-500/30`)
- Modify: `src/components/CollegeResults.tsx` — pass `focusedIndex` and `onFocusIndex` through, give each card a stable `data-college-card-index` attribute for hook to find/scroll
- Modify: `src/app/colleges/page.tsx` — wire hook, give search input a ref + id `colleges-search-input` so `/` can focus it

## Hook contract

```ts
export function useCollegeListKeyboard(opts: {
  count: number;
  onTogglePin: (index: number) => void;
  onOpen?: (index: number) => void;
  searchInputId?: string;
}): {
  focusedIndex: number;     // -1 = nothing focused
  setFocusedIndex: (n: number) => void;
};
```

## Key map

| Key | Action |
|-----|--------|
| ArrowDown | move focus +1 (clamp) |
| ArrowUp | move focus −1 (clamp; -1 → 0 = first) |
| Enter | call `onOpen(index)` if provided (CollegeCard click currently toggles `expanded`; reuse) |
| P / p | `onTogglePin(index)` |
| / | focus the search input element by id |
| Escape | clear focus (-1) |

## Skip-when

Ignore key when active element is INPUT / TEXTAREA / SELECT / contenteditable.

## Scroll-into-view

When focusedIndex changes, scroll matching card via `[data-college-card-index="N"]` with `block: "nearest"`.

## Acceptance

- Down arrow walks through cards, ring shows on focused one.
- Typing `/` focuses search; typing inside search does NOT trigger arrow nav.
- `p` toggles pin on focused card.
- Esc clears focus ring.
