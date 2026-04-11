"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, X } from "lucide-react";
import type { ActivityEntry } from "@/lib/resume-types";
import { COMMON_APP_LIMITS } from "@/lib/resume-types";

interface ActivitiesHelperPanelProps {
  readonly activities: readonly ActivityEntry[];
  readonly onApply: (id: string, patch: Partial<ActivityEntry>) => void;
}

interface ImproveResponse {
  readonly improved: string;
  readonly shortVersion: string;
  readonly changes: readonly string[];
}

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";

export const ActivitiesHelperPanel: React.FC<ActivitiesHelperPanelProps> = ({
  activities,
  onApply,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    activities[0]?.id ?? null
  );
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImproveResponse | null>(null);

  const selected = useMemo(
    () => activities.find((a) => a.id === selectedId) ?? null,
    [activities, selectedId]
  );

  // Sync draft when selection changes
  React.useEffect(() => {
    if (selected) {
      setDraftText(
        [selected.role, selected.activityName, selected.description, selected.impact]
          .filter(Boolean)
          .join(" — ")
      );
      setResult(null);
      setError("");
    }
  }, [selected]);

  const runImprove = async () => {
    if (!draftText.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/resume-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: draftText,
          mode: "activity",
          maxChars: COMMON_APP_LIMITS.descriptionMax,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult(data as ImproveResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const applyResult = () => {
    if (!result || !selected) return;
    onApply(selected.id, {
      activityName: result.shortVersion || selected.activityName,
      description: result.improved,
    });
    setResult(null);
  };

  const shortLen = result?.shortVersion.length ?? 0;
  const descLen = result?.improved.length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Activities Helper</h2>
        <p className="text-[12px] text-zinc-500">
          Generate Common App-style short entries. ~{COMMON_APP_LIMITS.activityNameMax} char title, ~{COMMON_APP_LIMITS.descriptionMax} char description. No fabrication — the helper only works with what you wrote.
        </p>
      </div>

      {/* Activity selector */}
      {activities.length > 0 ? (
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Select an activity
          </label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            <option value="">— none selected —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.activityName || "(Untitled)"}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0c0c1a]/60 border border-white/[0.05] p-4">
          <p className="text-[12px] text-zinc-500">
            No activities yet. Add one in the Activities section of Resume mode, or paste a description below.
          </p>
        </div>
      )}

      {/* Draft input */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
          What you wrote
        </label>
        <textarea
          className={`${inputClass} resize-y min-h-[100px]`}
          rows={4}
          placeholder="Describe what you did. Role, actions, results, any numbers you know..."
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
        />
        <p className="mt-1 text-[10px] text-zinc-600">
          {draftText.length} characters
        </p>
      </div>

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={runImprove}
          disabled={loading || draftText.trim().length < 5}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-200"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? "Generating..." : "Generate Common App version"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[12px] text-red-300">{error}</p>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-4 rounded-2xl bg-[#0f0f1c] border border-blue-500/20 p-5"
          >
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-medium">
                  Short title
                </p>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    shortLen > COMMON_APP_LIMITS.activityNameMax ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {shortLen}/{COMMON_APP_LIMITS.activityNameMax}
                </span>
              </div>
              <p className="text-sm text-zinc-100 font-medium">{result.shortVersion}</p>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-medium">
                  Description
                </p>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    descLen > COMMON_APP_LIMITS.descriptionMax ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {descLen}/{COMMON_APP_LIMITS.descriptionMax}
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">{result.improved}</p>
            </div>

            {result.changes.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-medium mb-1">
                  What changed
                </p>
                <ul className="space-y-1">
                  {result.changes.map((c, i) => (
                    <li key={i} className="text-[12px] text-zinc-400 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
              <button
                onClick={applyResult}
                disabled={!selected}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-4 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color] duration-200"
              >
                <Check className="w-3.5 h-3.5" />
                Apply to activity
              </button>
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 px-4 py-2 text-xs font-semibold transition-[background-color,color] duration-200"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
