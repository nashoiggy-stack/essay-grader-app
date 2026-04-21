"use client";

import { useCallback, useEffect, useState } from "react";

interface UseCollegeListKeyboardOptions {
  readonly count: number;
  readonly onTogglePin: (index: number) => void;
  readonly onOpen?: (index: number) => void;
  readonly searchInputId?: string;
}

interface UseCollegeListKeyboardReturn {
  readonly focusedIndex: number;
  readonly setFocusedIndex: (n: number) => void;
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useCollegeListKeyboard({
  count,
  onTogglePin,
  onOpen,
  searchInputId,
}: UseCollegeListKeyboardOptions): UseCollegeListKeyboardReturn {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Clamp when result count shrinks below current focus.
  useEffect(() => {
    if (focusedIndex >= count) setFocusedIndex(count > 0 ? count - 1 : -1);
  }, [count, focusedIndex]);

  // Scroll focused card into view via the data attribute.
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = document.querySelector<HTMLElement>(
      `[data-college-card-index="${focusedIndex}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) {
        // The "/" shortcut still applies (focus search) — but only when not
        // already typing. So this guard skips everything when in an input.
        return;
      }
      if (count === 0 && e.key !== "/") return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev < 0) return 0;
            return Math.min(count - 1, prev + 1);
          });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev < 0) return 0;
            return Math.max(0, prev - 1);
          });
          break;
        }
        case "Enter": {
          if (focusedIndex >= 0 && onOpen) {
            e.preventDefault();
            onOpen(focusedIndex);
          }
          break;
        }
        case "p":
        case "P": {
          if (focusedIndex >= 0) {
            e.preventDefault();
            onTogglePin(focusedIndex);
          }
          break;
        }
        case "/": {
          if (searchInputId) {
            const input = document.getElementById(searchInputId);
            if (input) {
              e.preventDefault();
              (input as HTMLInputElement).focus();
              (input as HTMLInputElement).select?.();
            }
          }
          break;
        }
        case "Escape": {
          if (focusedIndex >= 0) {
            e.preventDefault();
            setFocusedIndex(-1);
          }
          break;
        }
        default:
          break;
      }
    },
    [count, focusedIndex, onOpen, onTogglePin, searchInputId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return { focusedIndex, setFocusedIndex };
}
