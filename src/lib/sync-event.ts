/**
 * Writes to localStorage AND dispatches a custom "profile-source-updated" event
 * so same-tab listeners (useProfile, useChanceCalculator, etc.) can re-read
 * immediately — without waiting for tab focus or cross-tab StorageEvent.
 */
export function setItemAndNotify(key: string, value: string): void {
  localStorage.setItem(key, value);
  window.dispatchEvent(
    new CustomEvent("profile-source-updated", { detail: { key } })
  );
}
