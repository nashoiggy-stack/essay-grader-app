"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { InlineSuggestion } from "@/lib/types";
import type { SuggestionFocus } from "@/lib/suggestions-prompt";
import { SUGGESTION_CATEGORIES } from "@/lib/suggestions-prompt";

const TYPE_COLORS = {
  cut: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", label: "Cut", dot: "bg-red-500" },
  add: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", label: "Add", dot: "bg-emerald-500" },
  rewrite: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400", label: "Rewrite", dot: "bg-blue-500" },
  strengthen: { bg: "bg-violet-500/15", border: "border-violet-500/40", text: "text-violet-400", label: "Strengthen", dot: "bg-violet-500" },
} as const;

interface InlineEditorProps {
  readonly essayText: string;
  readonly suggestions: InlineSuggestion[];
  readonly suggestionsLoading: boolean;
  readonly suggestionsError: string;
  readonly activeFocus: SuggestionFocus | null;
  readonly onTextChange: (text: string) => void;
  readonly onFetchSuggestions: (focus: SuggestionFocus) => void;
  readonly onAcceptSuggestion: (index: number) => void;
  readonly onDismissSuggestion: (index: number) => void;
  readonly onClearSuggestions: () => void;
  readonly hasResult: boolean;
  readonly onRegrade: () => void;
  readonly essayModified: boolean;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  essayText, suggestions, suggestionsLoading, suggestionsError, activeFocus,
  onFetchSuggestions, onAcceptSuggestion, onDismissSuggestion, onClearSuggestions,
  hasResult, onRegrade, essayModified,
}) => {
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const highlightedParts = useMemo(() => {
    if (!suggestions.length) return null;

    const indexed = suggestions
      .map((s, i) => ({ ...s, index: i, pos: essayText.indexOf(s.original) }))
      .filter((s) => s.pos !== -1)
      .sort((a, b) => a.pos - b.pos);

    const parts: { text: string; suggestionIndex: number | null }[] = [];
    let cursor = 0;

    for (const s of indexed) {
      if (s.pos < cursor) continue;
      if (s.pos > cursor) {
        parts.push({ text: essayText.substring(cursor, s.pos), suggestionIndex: null });
      }
      parts.push({ text: s.original, suggestionIndex: s.index });
      cursor = s.pos + s.original.length;
    }
    if (cursor < essayText.length) {
      parts.push({ text: essayText.substring(cursor), suggestionIndex: null });
    }
    return parts;
  }, [essayText, suggestions]);

  const activeS = activeSuggestion !== null ? suggestions[activeSuggestion] : null;
  const activeColors = activeS ? TYPE_COLORS[activeS.type] : null;

  return (
    <div className="space-y-4">
      {/* ── Controls row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={suggestionsLoading}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {suggestionsLoading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Analyzing...
            </>
          ) : (
            "Get Suggestions"
          )}
        </button>

        {suggestions.length > 0 && (
          <>
            <span className="text-xs text-zinc-500">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
              {activeFocus && <> for <span className="text-violet-400">{activeFocus}</span></>}
            </span>
            <button onClick={onClearSuggestions} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Clear all
            </button>
          </>
        )}

        {hasResult && essayModified && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onRegrade}
            className="ml-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors flex items-center gap-2"
          >
            Re-grade
          </motion.button>
        )}
      </div>

      {/* ── Category picker (inline grid, no floating menu) ───────── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-[#12121f] border border-white/[0.08] p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                Choose focus area
              </p>

              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Common App</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SUGGESTION_CATEGORIES.slice(0, 7).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setShowPicker(false); setActiveSuggestion(null); onFetchSuggestions(cat); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeFocus === cat
                        ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
                        : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">VSPICE</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SUGGESTION_CATEGORIES.slice(7, 13).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setShowPicker(false); setActiveSuggestion(null); onFetchSuggestions(cat); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeFocus === cat
                        ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
                        : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Special</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setShowPicker(false); setActiveSuggestion(null); onFetchSuggestions("Lower Word Count"); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeFocus === "Lower Word Count"
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                      : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                  }`}
                >
                  Lower Word Count
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {(Object.entries(TYPE_COLORS) as [keyof typeof TYPE_COLORS, (typeof TYPE_COLORS)[keyof typeof TYPE_COLORS]][]).map(([, c]) => (
            <span key={c.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {suggestionsError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-sm text-red-400">{suggestionsError}</p>
        </div>
      )}

      {/* ── Highlighted essay ─────────────────────────────────────── */}
      {highlightedParts && highlightedParts.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {highlightedParts.map((part, i) => {
            if (part.suggestionIndex === null) {
              return <span key={i}>{part.text}</span>;
            }

            const s = suggestions[part.suggestionIndex];
            const colors = TYPE_COLORS[s.type];
            const isActive = activeSuggestion === part.suggestionIndex;

            return (
              <span
                key={i}
                onClick={() => setActiveSuggestion(isActive ? null : part.suggestionIndex)}
                className={`${colors.bg} border-b-2 ${colors.border} cursor-pointer transition-all hover:opacity-80 ${
                  s.type === "cut" ? "line-through decoration-red-500/50" : ""
                } ${isActive ? "ring-1 ring-offset-1 ring-offset-transparent " + colors.border : ""}`}
              >
                {part.text}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Active suggestion detail (below the essay, not floating) ── */}
      <AnimatePresence>
        {activeS && activeColors && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl bg-[#12121f] border border-white/[0.08] p-5 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${activeColors.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${activeColors.text}`}>
                {activeColors.label}
              </span>
            </div>

            <p className="text-sm text-zinc-400 mb-3">{activeS.reason}</p>

            {activeS.type === "cut" ? (
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 mb-4">
                <p className="text-xs text-zinc-500 mb-1">Will remove:</p>
                <p className="text-sm text-red-400 line-through">{activeS.original}</p>
              </div>
            ) : activeS.replacement ? (
              <div className="rounded-lg bg-[#1a1a2e] border border-white/[0.08] p-3 mb-4">
                <p className="text-xs text-zinc-500 mb-1">
                  {activeS.type === "add" ? "Will insert after the highlighted text:" : "Will replace with:"}
                </p>
                <p className={`text-sm ${activeColors.text}`}>{activeS.replacement}</p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={() => { onAcceptSuggestion(activeSuggestion!); setActiveSuggestion(null); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-opacity hover:opacity-80 ${activeColors.bg} ${activeColors.text} ring-1 ${activeColors.border}`}
              >
                Accept
              </button>
              <button
                onClick={() => { onDismissSuggestion(activeSuggestion!); setActiveSuggestion(null); }}
                className="flex-1 rounded-lg bg-white/[0.04] text-zinc-500 py-2 text-sm font-semibold hover:text-zinc-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
