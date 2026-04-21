# Phase 09 — Autosave indicator

**Goal:** Bottom-right pill that shows saving / saved state for cloud sync. Mounted globally.

## Files

- Create: `src/components/SaveIndicator.tsx`
- Modify: `src/lib/profile-sync.ts` — emit `cloud-sync-saving` before each upsert and `cloud-sync-saved` (or `cloud-sync-error`) after.
- Modify: `src/components/AppShell.tsx` — mount `<SaveIndicator />`.

## Indicator states

| State | Render |
|-------|--------|
| idle | nothing |
| saving | spinner + "Saving…" |
| saved | check + "Saved", auto-hide after 1500ms |

## Events

- Listen for: `cloud-sync-saving`, `cloud-sync-saved` (own events), `profile-source-updated`, `cloud-sync-loaded` (existing).
- `cloud-sync-saving` → state = saving.
- `cloud-sync-saved` → state = saved, schedule fade-out timer to idle.
- `profile-source-updated` (write detected before sync fires) → optionally pre-set "saving" via the existing 2s debounce window — but the indicator updates definitively when sync actually runs, so we don't need it.

## Style

- Fixed bottom-right `bottom-4 right-4 z-40`.
- Pill: rounded-full bg `bg-[#0c0c1a]/90` border `border-white/[0.08]`, padding `px-3 py-1.5`, text `text-xs`.
- Avoid overlap with NavBar bottom on mobile — use `bottom-20` on small screens (NavBar is bottom-anchored on mobile; check NavBarWrapper for actual bottom offset; use `bottom-20 sm:bottom-4` as safe default).
- aria-live="polite", role="status".

## Acceptance

- Edit profile field on /profile → indicator goes Saving → Saved → fades.
- No overlap with mobile bottom nav.
