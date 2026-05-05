"use client";

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

interface CollegeSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly inputId?: string;
}

// 150ms debounce: fast enough to feel live, slow enough to avoid a re-filter
// on every keystroke when the list is long.
const DEBOUNCE_MS = 150;

export const CollegeSearchInput: React.FC<CollegeSearchInputProps> = ({
  value,
  onChange,
  inputId,
}) => {
  const [local, setLocal] = useState(value);

  // Keep local in sync when parent resets externally (e.g. clear filters)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounced propagate
  useEffect(() => {
    if (local === value) return;
    const id = setTimeout(() => onChange(local), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [local, value, onChange]);

  return (
    <div className="relative mb-4">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          // Escape clears the input. Native <input type=search> sometimes
          // does this in WebKit, but never in Firefox/Chrome — wire it
          // explicitly so the contract is the same everywhere.
          if (e.key === "Escape" && local) {
            e.preventDefault();
            setLocal("");
          }
        }}
        placeholder="Search schools by name or alias…"
        aria-label="Search colleges"
        className="w-full rounded-sm bg-bg-inset border border-border-hair pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder-text-faint focus:border-[var(--accent)] focus:ring-1 focus:ring-accent-line focus:outline-none"
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 sm:p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
