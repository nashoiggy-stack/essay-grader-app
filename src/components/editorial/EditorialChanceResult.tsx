"use client";

import React from "react";
import type { ChanceResult, College, Classification } from "@/lib/college-types";

const TIER_VAR: Record<Classification, string> = {
  safety: "var(--tier-safety)",
  likely: "var(--tier-likely)",
  target: "var(--tier-target)",
  reach: "var(--tier-reach)",
  unlikely: "var(--tier-unlikely)",
  insufficient: "var(--tier-insuf)",
};

const TIER_LABEL: Record<Classification, string> = {
  safety: "Safety",
  likely: "Likely",
  target: "Target",
  reach: "Reach",
  unlikely: "Unlikely",
  insufficient: "Insufficient",
};

const CONF_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

/**
 * Editorial result panel for /chances. Reads `result.breakdown.steps` and
 * `result.whatIfs` directly — same data the legacy ChanceResultDisplay
 * component renders, just laid out as the design's school-hero +
 * multiplier rows + running estimate + what-if scenarios.
 */
export function EditorialChanceResult({
  result,
  college,
}: {
  readonly result: ChanceResult;
  readonly college: College;
}) {
  const tone = TIER_VAR[result.classification];
  const steps = result.breakdown?.steps ?? [];
  const whatIfs = result.whatIfs ?? [];

  return (
    <div className="space-y-[clamp(56px,9vw,96px)]">
      {/* School hero */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 items-end pb-9 border-b border-[var(--bg-rule)]">
          <div>
            <h2 className="font-[family-name:var(--font-display)] font-light text-[clamp(36px,6vw,64px)] leading-[1.02] tracking-[-0.02em] text-[var(--ink-100)] m-0 pb-[0.18em]">
              {college.name}
            </h2>
            <div className="mt-3.5 text-[14px] text-[var(--ink-60)]">
              {college.state} · {college.type === "public" ? "Public" : "Private"} · {college.setting}
              {college.usNewsRank ? ` · № ${college.usNewsRank}` : ""}
            </div>
            <div className="flex gap-2 mt-[18px] flex-wrap">
              <span className="ed-tag" style={{ ["--c" as string]: tone }}>
                <span className="swatch" />
                {TIER_LABEL[result.classification]}
              </span>
              <span className="ed-tag accent">
                {result.multiple >= 1.5
                  ? `${result.multiple.toFixed(1)}× typical admit`
                  : "Within band"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--ink-40)] mb-2">
              Estimated chance
            </div>
            <div
              className="font-[family-name:var(--font-display)] font-light text-[clamp(96px,16vw,160px)] leading-[0.9] tracking-[-0.045em] tabular-nums"
              style={{ color: tone }}
            >
              {result.chance.mid}
              <span className="text-[0.3em] align-[0.55em] text-[var(--ink-40)] ml-1">%</span>
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--ink-60)] tabular-nums mt-1.5">
              {result.chance.low}–{result.chance.high}% range
            </div>
            <div className="mt-3.5">
              <span
                className="ed-tag"
                style={{ ["--c" as string]: TIER_VAR.likely }}
              >
                <span className="swatch" />
                {CONF_LABEL[result.confidence]}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Multiplier stack */}
      {steps.length > 0 && (
        <section>
          <header className="ed-section-head">
            <span className="title">How we got here</span>
            <span className="aside">Multiplier stack</span>
          </header>
          <div>
            <MultiplierRow
              index={0}
              label="Base school admit rate"
              note={result.breakdown?.baseLabel ?? `Headline admit rate`}
              value={`${(result.breakdown?.baseRate ?? college.acceptanceRate).toFixed(1)}%`}
              borderTop={false}
            />
            {steps.map((step, i) => (
              <MultiplierRow
                key={i}
                index={i + 1}
                label={step.label}
                note={step.note}
                multiplier={step.multiplier}
              />
            ))}
          </div>
          <div className="mt-8 p-7 border border-[var(--bg-rule)] rounded bg-[rgba(201,169,106,0.03)]">
            <div className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.24em] text-[var(--ink-40)] mb-1.5">
              Running estimate
            </div>
            <div className="font-[family-name:var(--font-display)] font-light text-[48px] leading-none tracking-[-0.02em] text-[var(--accent)] tabular-nums">
              {result.chance.mid.toFixed(1)}%
            </div>
          </div>
        </section>
      )}

      {/* Reasoning prose */}
      {result.explanation && (
        <section>
          <header className="ed-section-head">
            <span className="title">The read</span>
            <span className="aside">{result.tierLabel}</span>
          </header>
          <p className="text-[15px] leading-[1.65] text-[var(--ink-80)] font-light max-w-[68ch]">
            {result.explanation}
          </p>
          {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
            <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-9">
              {result.strengths.length > 0 && (
                <div>
                  <div className="ed-eyebrow mb-4">
                    <span className="dot" />
                    Strengths
                  </div>
                  <ul className="list-none p-0 m-0 space-y-3">
                    {result.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="text-[13.5px] leading-[1.55] text-[var(--ink-80)] font-light"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.weaknesses.length > 0 && (
                <div>
                  <div className="ed-eyebrow mb-4" style={{ color: "var(--tier-reach)" }}>
                    Areas to address
                  </div>
                  <ul className="list-none p-0 m-0 space-y-3">
                    {result.weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="text-[13.5px] leading-[1.55] text-[var(--ink-80)] font-light"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* What if */}
      {whatIfs.length > 0 && (
        <section>
          <header className="ed-section-head">
            <span className="title">What if</span>
            <span className="aside">Counterfactual scenarios</span>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {whatIfs.map((w, i) => {
              const delta = w.chance - result.chance.mid;
              return (
                <div
                  key={i}
                  className="p-[22px] border border-[var(--bg-rule)] rounded bg-transparent transition-[border-color,background-color] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--ink-40)]">
                      Scenario
                    </span>
                    <span
                      className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums"
                      style={{ color: delta >= 0 ? "var(--accent)" : "var(--tier-reach)" }}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}
                    </span>
                  </div>
                  <div className="font-[family-name:var(--font-display)] font-light text-[18px] leading-[1.2] text-[var(--ink-100)] mb-1.5">
                    {w.label}
                  </div>
                  <div className="text-[12px] text-[var(--ink-60)] leading-[1.5]">
                    Lands at <span className="font-[family-name:var(--font-geist-mono)] text-[var(--ink-100)] tabular-nums">{w.chance}%</span> · {TIER_LABEL[w.classification]}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function MultiplierRow({
  index,
  label,
  note,
  multiplier,
  value,
  borderTop = true,
}: {
  readonly index: number;
  readonly label: string;
  readonly note?: string;
  readonly multiplier?: number;
  readonly value?: string;
  readonly borderTop?: boolean;
}) {
  // Bar visualisation centered on a midline. Multiplier > 1 fills right;
  // < 1 fills left. Width is capped at 50% to stay inside the cell.
  const barFill = multiplier != null ? Math.min(50, Math.abs((multiplier - 1) * 100)) : 0;
  const isPositive = multiplier != null && multiplier > 1;
  const tone = isPositive
    ? "var(--tier-safety)"
    : multiplier != null && multiplier < 1
    ? "var(--tier-reach)"
    : "var(--ink-100)";

  return (
    <div
      className="grid grid-cols-[36px_1.4fr_1fr_90px] gap-6 items-center py-[18px] text-[14px]"
      style={{ borderTop: borderTop ? "1px solid var(--bg-rule)" : "0" }}
    >
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--ink-40)] tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <div className="text-[var(--ink-100)] font-normal min-w-0">
        {label}
        {note && (
          <span className="block mt-[3px] text-[12px] text-[var(--ink-60)] font-light">
            {note}
          </span>
        )}
      </div>
      <div className="relative">
        {multiplier != null && (
          <div className="relative h-px bg-[var(--bg-rule)]">
            <span className="absolute left-1/2 top-[-6px] bottom-[-6px] w-px bg-[var(--ink-30)]" />
            <span
              className="absolute top-0 bottom-0"
              style={{
                background: tone,
                width: `${barFill}%`,
                left: isPositive ? "50%" : "auto",
                right: isPositive ? "auto" : "50%",
              }}
            />
          </div>
        )}
      </div>
      <div
        className="font-[family-name:var(--font-geist-mono)] text-right tabular-nums"
        style={{ color: tone }}
      >
        {value ?? (multiplier != null ? `×${multiplier.toFixed(2)}` : "—")}
      </div>
    </div>
  );
}
