# Phase 14 — Essay versioning (minimal)

**Goal:** Existing `useEssayHistory` already pushes a new entry on Save and supports Load/Rename/Delete. Per spec: "If already versioned: add a 'restore this version' action and skip the rest of this feature."

## Files

- Modify: `src/components/EssayHistorySidebar.tsx` — add an explicit "Restore" affordance per row (the title click already loads, but it's not labeled). Add a confirm step when restoring would replace unsaved current text.
- Modify: `src/app/essay/page.tsx` — pass current essayText to the sidebar so it can compare for the confirm prompt.

## Behavior changes

1. Each row gets a small "Restore" button next to Rename/Delete (visible on hover, like the others).
2. When clicked: if current essayText is non-empty AND differs from this saved entry's essayText, show a tiny inline "Replace?" confirm (same pattern as existing delete confirm).
3. If current is empty or matches, restore immediately (calls existing `onLoad`).

That's the whole change. No schema changes, no new hooks, no diff view, no version cap (existing list has no cap; spec says "Cap at 25" is only required for the not-yet-versioned branch which doesn't apply here).

## Acceptance

- "Restore" button visible on each saved entry on hover.
- Clicking with empty current → immediate restore.
- Clicking with different current essay → "Replace?" confirm before restore.
