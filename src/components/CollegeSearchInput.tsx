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
        placeholder="Search schools by name or alias…"
        aria-label="Search colleges"
        className="w-full rounded-xl bg-bg-inset border border-border-hair pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none"
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
