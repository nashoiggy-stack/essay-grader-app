"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MajorSelect } from "@/components/MajorSelect";
import type { ClassifiedCollege } from "@/lib/college-types";
import type { MajorAwareRecommendations } from "@/lib/strategy-types";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";
import { setItemAndNotify } from "@/lib/sync-event";
import { getCachedJson } from "@/lib/cloud-storage";
import { CLASSIFICATION_TEXT } from "./helpers";

export function MajorRecommendationsBody({
  recs,
  onMajorSaved,
}: {
  readonly recs: MajorAwareRecommendations;
  readonly onMajorSaved: () => void;
}) {
  if (!recs.intendedMajor && !recs.intendedInterest) {
    return <MajorPicker onSaved={onMajorSaved} />;
  }

  const totalPinned =
    recs.fromPinned.safeties.length +
    recs.fromPinned.targets.length +
    recs.fromPinned.reaches.length;

  return (
    <div className="space-y-5 pt-3">
      <p className="text-[13px] text-text-secondary leading-relaxed">
        Picks tailored to{" "}
        <span className="text-text-primary">
          {recs.intendedMajor || recs.intendedInterest}
        </span>
        {recs.intendedMajor && recs.intendedInterest && (
          <>
            {" "}(plus your interest in{" "}
            <span className="text-text-primary">{recs.intendedInterest}</span>)
          </>
        )}
        .
      </p>

      {totalPinned === 0 && recs.toConsider.length === 0 && (
        <div className="rounded-xl bg-bg-surface border border-border-hair p-4">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            None of your pinned schools stand out for{" "}
            <span className="text-text-primary">
              {recs.intendedMajor || recs.intendedInterest}
            </span>
            , and we didn&apos;t find strong alternatives in the full list. Try a
            more specific interest or a different major.
          </p>
        </div>
      )}

      {totalPinned > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary mb-3">
            From your pinned list
          </h4>
          <div className="space-y-4">
            <RecTierRow label="Safety" color="text-emerald-400" items={recs.fromPinned.safeties} />
            <RecTierRow label="Target" color="text-amber-400" items={recs.fromPinned.targets} />
            <RecTierRow label="Reach" color="text-orange-400" items={recs.fromPinned.reaches} />
          </div>
        </div>
      )}

      {recs.toConsider.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary mb-3">
            Consider adding
          </h4>
          <div className="space-y-2">
            {recs.toConsider.map((c) => (
              <RecCard key={c.college.name} item={c} />
            ))}
          </div>
        </div>
      )}

      <RankedPinnedDisclosure
        items={recs.rankedPinned}
        hasQuery={!!(recs.intendedMajor || recs.intendedInterest)}
      />

      <button
        type="button"
        onClick={() => {
          // Let the user change their preference without leaving the page.
          const current = getCachedJson<Record<string, unknown>>(PROFILE_STORAGE_KEY) ?? {};
          setItemAndNotify(
            PROFILE_STORAGE_KEY,
            JSON.stringify({ ...current, intendedMajor: "", intendedInterest: "" }),
          );
          onMajorSaved();
        }}
        className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
      >
        Change major / interest
      </button>
    </div>
  );
}

// Read-only ranked transparency view of every pinned school.
// Sorts by majorFitScore desc when a query is set; falls back to chance
// midpoint otherwise. Renders inline (not a modal) for cleaner integration
// with the existing collapsible StrategyCard.
function RankedPinnedDisclosure({
  items,
  hasQuery,
}: {
  items: readonly ClassifiedCollege[];
  hasQuery: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const buttonLabel = hasQuery ? "See all pins ranked" : "Pinned schools by classification";

  return (
    <div className="border-t border-border-hair pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        {buttonLabel}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-border-hair divide-y divide-border-hair">
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold">
                <span>School</span>
                <span className="w-16 text-right">Tier</span>
                <span className="w-12 text-right">Chance</span>
                <span className="w-16 text-right">Major fit</span>
              </div>
              {items.map((c) => (
                <RankedPinnedRow key={c.college.name} item={c} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RankedPinnedRow({ item }: { item: ClassifiedCollege }) {
  const reason = item.matchReason || item.reason;
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-2 items-baseline">
      <div className="min-w-0">
        <p className="text-[13px] text-text-primary font-semibold truncate">{item.college.name}</p>
        {reason && (
          <p className="text-[11px] text-text-muted leading-snug truncate">{reason}</p>
        )}
      </div>
      <span
        className={`w-16 text-right text-[11px] font-semibold uppercase tracking-[0.08em] ${CLASSIFICATION_TEXT[item.classification]}`}
      >
        {item.classification}
      </span>
      <span className="w-12 text-right text-[12px] font-mono tabular-nums text-text-secondary">
        {item.classification === "insufficient" ? "—" : `${item.chance.mid}%`}
      </span>
      <span className="w-16 text-right text-[12px] font-mono tabular-nums text-text-secondary">
        {item.majorFitScore != null ? item.majorFitScore : "—"}
      </span>
    </div>
  );
}

function RecTierRow({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: readonly ClassifiedCollege[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${color} w-16 shrink-0 pt-1`}>
          {label}
        </span>
        <p className="text-[12px] text-text-faint italic pt-1">
          None pinned in this tier &mdash; add one.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${color} w-16 shrink-0 pt-2`}>
        {label}
      </span>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((c) => (
          <RecCard key={c.college.name} item={c} />
        ))}
      </div>
    </div>
  );
}

function RecCard({ item }: { item: ClassifiedCollege }) {
  const c = item.college;
  const match = item.majorMatch ?? "none";
  const matchLabel =
    match === "strong"
      ? { text: "Strong fit", color: "text-emerald-400" }
      : match === "decent"
        ? { text: "Adjacent fit", color: "text-text-muted" }
        : null;
  return (
    <div className="rounded-lg bg-bg-surface border border-border-hair px-3 py-2 hover:border-white/[0.12] transition-colors">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-text-primary truncate">{c.name}</p>
        <span className="text-[11px] font-mono tabular-nums text-text-muted shrink-0">
          {c.acceptanceRate}%
        </span>
      </div>
      {item.matchReason ? (
        <p className="text-[11px] mt-0.5 text-text-secondary leading-snug">
          {item.matchReason}
        </p>
      ) : (
        matchLabel && (
          <p className={`text-[11px] mt-0.5 ${matchLabel.color}`}>{matchLabel.text}</p>
        )
      )}
    </div>
  );
}

function MajorPicker({ onSaved }: { onSaved: () => void }) {
  const [major, setMajor] = useState<string>("");
  const [interest, setInterest] = useState<string>("");

  const save = () => {
    try {
      const current = getCachedJson<Record<string, unknown>>(PROFILE_STORAGE_KEY) ?? {};
      setItemAndNotify(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          ...current,
          intendedMajor: major === "Any" ? "" : major,
          intendedInterest: interest.trim(),
        }),
      );
      onSaved();
    } catch {
      /* ignore */
    }
  };

  const canSave = (major && major !== "Any") || interest.trim().length > 0;

  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-text-secondary leading-relaxed">
        Tell us what you want to study and we&apos;ll surface the schools in your
        pinned list (and a few outside it) that are strong in that area. This
        doesn&apos;t narrow your list elsewhere &mdash; it only adds this one
        card.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Major
          </label>
          <MajorSelect value={major} onChange={setMajor} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Specific interest (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. sustainability, quant trading"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="w-full rounded-lg bg-bg-inset border border-border-hair px-3 py-2 text-sm text-text-primary placeholder-zinc-600 focus:border-blue-500/50 focus: focus:ring-accent-line focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft hover:bg-accent-soft disabled:bg-bg-surface disabled:text-text-faint text-accent-text px-4 py-2 text-xs font-semibold transition-colors"
      >
        Save and show picks
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
