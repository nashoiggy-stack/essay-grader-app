"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { College } from "@/lib/college-types";

interface CollegeComboboxProps {
  readonly colleges: readonly College[];
  readonly value: number | null;
  readonly onChange: (index: number | null) => void;
  readonly placeholder?: string;
}

const triggerClass =
  "w-full rounded-sm bg-bg-inset border border-border-hair px-3 py-2 text-sm text-text-primary focus:border-[var(--accent)] focus:ring-1 focus:ring-accent-line focus:outline-none transition-[border-color,box-shadow] duration-200 flex items-center justify-between gap-2 cursor-pointer";

const inputClass =
  "w-full rounded-sm bg-bg-inset border border-[var(--accent)] ring-1 ring-accent-line pl-9 pr-9 py-2 text-sm text-text-primary placeholder-text-faint focus:outline-none";

export const CollegeCombobox: React.FC<CollegeComboboxProps> = ({
  colleges,
  value,
  onChange,
  placeholder = "Search schools by name…",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = value !== null ? colleges[value] : null;

  // Filtered list keeps original colleges-array indices so we hand back
  // the same number useChanceCalculator expects.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const indexed = colleges.map((c, i) => ({ college: c, index: i }));
    if (!q) return indexed;
    return indexed.filter(({ college }) => {
      const haystack = `${college.name} ${college.state}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [colleges, query]);

  // When the dropdown opens or the query changes, reset highlight to top
  // and focus the input.
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      // Defer focus until after the input renders.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open, matches]);

  const commit = (index: number) => {
    onChange(index);
    setOpen(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = matches[activeIdx];
      if (hit) commit(hit.index);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {!open ? (
        <button
          type="button"
          className={triggerClass}
          onClick={() => setOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={false}
        >
          <span className={selected ? "truncate text-text-primary" : "truncate text-text-faint"}>
            {selected
              ? `${selected.name} — ${selected.state} (${selected.acceptanceRate}%)`
              : "Choose a school..."}
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {selected && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selected school"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="p-0.5 rounded text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-text-muted" aria-hidden />
          </span>
        </button>
      ) : (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Search schools"
            aria-autocomplete="list"
            aria-controls="college-combobox-list"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {open && (
        <ul
          ref={listRef}
          id="college-combobox-list"
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-sm border border-border-hair bg-bg-surface shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-xs text-text-muted">
              No schools match &ldquo;{query}&rdquo;.
            </li>
          ) : (
            matches.map(({ college, index }, i) => {
              const isActive = i === activeIdx;
              const isSelected = index === value;
              return (
                <li
                  key={college.name}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(index);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-3 ${
                    isActive ? "bg-bg-inset" : ""
                  } ${isSelected ? "text-accent-text" : "text-text-primary"}`}
                >
                  <span className="truncate">{college.name}</span>
                  <span className="text-[11px] text-text-muted shrink-0">
                    {college.state} · {college.acceptanceRate}%
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
