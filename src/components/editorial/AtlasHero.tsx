"use client";

import React from "react";
import { motion } from "motion/react";

/**
 * Centered editorial hero used at the top of every redesigned feature page.
 *
 * Structure (per the design handoff):
 *   - eyebrow with champagne dot + uppercase mono label
 *   - oversized serif headline split between roman and italic-champagne
 *   - lede paragraph in warm ink, max-width ~56ch
 *
 * The hero MUST sit inside an `.editorial-luxury` wrapper so the CSS
 * variables (--ink-100, --accent, etc.) resolve. The eyebrow text is mono;
 * the headline serif comes from `--font-display` (Young_Serif) which is
 * already loaded by the root layout.
 *
 * Variant `align="left"` is used on dense single-column pages (e.g. /list)
 * where centering would push the columns out of grid alignment. Default is
 * centered.
 */
export interface AtlasHeroProps {
  readonly eyebrow: string;
  /** First clause of the headline — set in roman serif. */
  readonly title: string;
  /** Second clause — set in italic champagne. Optional. */
  readonly accent?: string;
  /** Lede paragraph beneath the headline. Optional. */
  readonly lede?: string;
  /** "center" | "left" — default centered. */
  readonly align?: "center" | "left";
  /** Additional className applied to the outer header. */
  readonly className?: string;
}

export function AtlasHero({
  eyebrow,
  title,
  accent,
  lede,
  align = "center",
  className = "",
}: AtlasHeroProps) {
  const isCentered = align === "center";
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
      className={[
        "mx-auto max-w-[920px] mb-[clamp(48px,7vw,80px)] pt-[clamp(32px,6vw,64px)]",
        isCentered ? "text-center" : "text-left",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex items-center gap-[10px] font-[family-name:var(--font-geist-mono)]",
          "text-[10.5px] uppercase tracking-[0.24em] text-[var(--accent)] font-normal",
        ].join(" ")}
      >
        <span className="size-[5px] rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(201,169,106,0.6)]" />
        {eyebrow}
      </span>
      <h1
        className={[
          "font-[family-name:var(--font-display)]",
          "font-light text-[clamp(56px,9vw,112px)] leading-[1.1] tracking-[-0.035em]",
          "text-[var(--ink-100)] m-0 mt-[18px] pb-[0.45em]",
          isCentered ? "mx-auto" : "",
        ].join(" ")}
      >
        {title}
        {accent && (
          <>
            {" "}
            <em className="not-italic [font-style:italic] font-normal text-[var(--accent)]">{accent}</em>
          </>
        )}
      </h1>
      {lede && (
        <p
          className={[
            "max-w-[56ch] text-[15px] leading-[1.65] text-[var(--ink-60)] font-light",
            isCentered ? "mx-auto" : "",
          ].join(" ")}
        >
          {lede}
        </p>
      )}
    </motion.header>
  );
}

/**
 * Compact section header — serif title + mono aside + bottom rule.
 * Used between sections within an editorial-luxury page.
 */
export function SectionHead({
  title,
  aside,
  id,
  className = "",
}: {
  readonly title: string;
  readonly aside?: string;
  readonly id?: string;
  readonly className?: string;
}) {
  return (
    <header
      className={[
        "flex items-baseline justify-between gap-5 mb-9 pb-[14px]",
        "border-b border-[var(--bg-rule)]",
        className,
      ].join(" ")}
    >
      <span
        id={id}
        className="font-[family-name:var(--font-display)] font-light text-[26px] tracking-[-0.01em] text-[var(--ink-100)]"
      >
        {title}
      </span>
      {aside && (
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--ink-40)]">
          {aside}
        </span>
      )}
    </header>
  );
}
