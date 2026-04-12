"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Bookmark, Plus } from "lucide-react";
import { COLLEGES } from "@/data/colleges";
import type { College, PinnedCollege } from "@/lib/college-types";
import { PINNED_COLLEGES_KEY } from "@/lib/college-types";

interface CompareSelectorProps {
  readonly selected: readonly College[];
  readonly maxSlots?: number;
  readonly onAdd: (college: College) => void;
  readonly onRemove: (name: string) => void;
}

function readPinnedNames(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_COLLEGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PinnedCollege[];
    return parsed.map((p) => p.name);
  } catch {
    return [];
  }
}

export const CompareSelector: React.FC<CompareSelectorProps> = ({
  selected,
  maxSlots = 4,
  onAdd,
  onRemove,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedNames = new Set(selected.map((c) => c.name));
  const canAdd = selected.length < maxSlots;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? COLLEGES.filter(
          (c) =>
            !selectedNames.has(c.name) &&
            (c.name.toLowerCase().includes(q) ||
              c.state.toLowerCase().includes(q) ||
              c.region.toLowerCase().includes(q)),
        )
      : COLLEGES.filter((c) => !selectedNames.has(c.name));
    return filtered.slice(0, 8);
  }, [query, selectedNames]);

  const importPinned = () => {
    const pinnedNames = readPinnedNames();
    for (const name of pinnedNames) {
      if (selectedNames.has(name)) continue;
      if (selected.length >= maxSlots) break;
      const college = COLLEGES.find((c) => c.name === name);
      if (college) onAdd(college);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected school slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {selected.map((c) => (
          <motion.div
            key={c.name}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 group"
          >
            <button
              type="button"
              onClick={() => onRemove(c.name)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-[opacity,color,background-color] duration-200"
              aria-label={`Remove ${c.name}`}
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-[13px] font-semibold text-zinc-100 truncate pr-6">
              {c.name}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {c.state} · {c.acceptanceRate}%
            </p>
          </motion.div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: maxSlots - selected.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-xl border border-dashed border-white/[0.06] p-3 flex items-center justify-center min-h-[64px]"
          >
            <Plus className="w-4 h-4 text-zinc-600" />
          </div>
        ))}
      </div>

      {/* Search + import */}
      <div className="flex gap-2" ref={containerRef}>
        <div className="relative flex-1">
          <div className="flex items-center gap-2 rounded-xl bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2.5 focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/20 transition-[border-color,box-shadow] duration-200">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              disabled={!canAdd}
              placeholder={canAdd ? "Add a school to compare..." : "Max 4 schools selected"}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none disabled:opacity-50"
            />
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {open && canAdd && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-[#0c0c1a] border border-white/[0.08] shadow-[0_24px_48px_rgba(0,0,0,0.5)] overflow-hidden z-20 max-h-[320px] overflow-y-auto"
              >
                {results.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[12px] text-zinc-500">
                    No schools match &quot;{query}&quot;
                  </div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        onAdd(c);
                        setQuery("");
                        if (selected.length + 1 >= maxSlots) setOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] text-zinc-100 truncate font-medium">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {c.state} · {c.acceptanceRate}% · {c.type}
                        </p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Import pinned */}
        <button
          type="button"
          onClick={importPinned}
          disabled={!canAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-3 py-2.5 text-[12px] font-semibold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Bookmark className="w-3.5 h-3.5" />
          Import pinned
        </button>
      </div>
    </div>
  );
};
