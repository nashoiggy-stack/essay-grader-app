"use client";

import React from "react";

/**
 * Full editorial-luxury design system, scoped to a `.editorial-luxury`
 * wrapper. Mirrors the design handoff at:
 *   college-list/project/list-redesign/shared.css
 *
 * Tokens
 *   --bg-rule, --bg-rule-strong       hairlines
 *   --ink-100..ink-30                 warm-ink ramp
 *   --accent / --accent-soft / --accent-strong   champagne
 *   --tier-safety/likely/target/reach/unlikely/insuf
 *
 * Atmosphere
 *   absolute radial gold blooms behind content (z-index 0)
 *   fixed paper-grain noise overlay (z-index 1, mix-blend overlay)
 *
 * Primitives (all under .editorial-luxury):
 *   .ed-eyebrow                       mono uppercase tracking, with .dot
 *   .ed-section-head                  serif title + mono aside + bottom rule
 *   .ed-corner-frame                  1px frame with 12×12 champagne brackets
 *   .ed-grade-letter-gold             gold-leaf gradient text fill
 *   .ed-sub-meter                     engraved 1px hairline meter
 *   .ed-cta                           pill CTA with circular gold trailing icon
 *   .ed-tag                           tiny mono pill with .swatch dot
 *   .ed-chip / .ed-chip.active        tab-pill filter
 *   .ed-card                          1px bordered editorial card
 *   .ed-meter / .ed-meter::after      generic gradient meter
 */

export function EditorialAtmosphere() {
  return (
    <style>{`
      .editorial-luxury {
        --bg-rule: rgba(255, 255, 255, 0.07);
        --bg-rule-strong: rgba(255, 255, 255, 0.14);
        --ink-100: #f4f1ea;
        --ink-80:  #d9d4ca;
        --ink-60:  #a09a90;
        --ink-40:  #6b665e;
        --ink-30:  #4d4943;
        --ink-20:  #34322e;
        --accent:        #c9a96a;
        --accent-soft:   rgba(201, 169, 106, 0.14);
        --accent-strong: #d8bb7e;
        --tier-safety:   #8fb89a;
        --tier-likely:   #88a4c4;
        --tier-target:   #c9a96a;
        --tier-reach:    #c98a5c;
        --tier-unlikely: #b8675b;
        --tier-insuf:    #5a5750;
        --serif: var(--font-display), "Fraunces", Georgia, serif;
        --mono: var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, monospace;
        --ease-luxe: cubic-bezier(0.32, 0.72, 0, 1);
        position: relative;
      }
      .editorial-luxury::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background:
          radial-gradient(1200px 700px at 8% -10%, rgba(201,169,106,0.06), transparent 55%),
          radial-gradient(900px 600px at 110% 20%, rgba(201,169,106,0.03), transparent 60%),
          radial-gradient(800px 500px at 50% 110%, rgba(255,255,255,0.02), transparent 60%);
      }
      .editorial-luxury::after {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>");
        opacity: 0.35;
        mix-blend-mode: overlay;
      }
      .editorial-luxury > * { position: relative; z-index: 2; }

      /* Eyebrow */
      .editorial-luxury .ed-eyebrow {
        display: inline-flex; align-items: center; gap: 10px;
        font-family: var(--mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        color: var(--ink-60);
        font-weight: 400;
      }
      .editorial-luxury .ed-eyebrow .dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 10px rgba(201,169,106,0.6);
      }

      /* Section head */
      .editorial-luxury .ed-section-head {
        display: flex; justify-content: space-between; align-items: baseline;
        gap: 20px;
        margin-bottom: 36px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--bg-rule);
      }
      .editorial-luxury .ed-section-head .title {
        font-family: var(--serif);
        font-weight: 300;
        font-size: 26px;
        color: var(--ink-100);
        letter-spacing: -0.01em;
      }
      .editorial-luxury .ed-section-head .title em {
        font-style: italic; color: var(--ink-60); font-weight: 300;
      }
      .editorial-luxury .ed-section-head .aside {
        font-family: var(--mono);
        font-size: 11px;
        color: var(--ink-40);
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }

      /* Engraved letter gold-leaf gradient */
      .editorial-luxury .ed-grade-letter-gold {
        background: linear-gradient(180deg, #f4f1ea 0%, #c9a96a 70%, #8a7340 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 60px rgba(201, 169, 106, 0.15);
      }

      /* Corner-bracketed frame */
      .editorial-luxury .ed-corner-frame {
        position: relative;
        border: 1px solid var(--bg-rule);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0)),
          rgba(13,13,19,0.55);
      }
      .editorial-luxury .ed-corner-frame::before,
      .editorial-luxury .ed-corner-frame::after {
        content: "";
        position: absolute;
        width: 12px; height: 12px;
        border: 1px solid var(--accent);
        opacity: 0.55;
      }
      .editorial-luxury .ed-corner-frame::before {
        top: -1px; left: -1px; border-right: 0; border-bottom: 0;
      }
      .editorial-luxury .ed-corner-frame::after {
        bottom: -1px; right: -1px; border-left: 0; border-top: 0;
      }

      /* Sub-score gradient meter */
      .editorial-luxury .ed-sub-meter {
        position: relative; height: 1px;
        background: var(--bg-rule);
        overflow: hidden;
      }
      .editorial-luxury .ed-sub-meter::after {
        content: ""; position: absolute;
        top: -3px; bottom: -3px;
        left: 0; width: var(--w, 0%); height: 7px;
        background: linear-gradient(90deg, transparent, var(--accent));
        transition: width 1.2s var(--ease-luxe);
      }

      /* Generic solid meter */
      .editorial-luxury .ed-meter {
        position: relative; height: 1px;
        background: var(--bg-rule); overflow: hidden;
      }
      .editorial-luxury .ed-meter::after {
        content: ""; position: absolute; left: 0; top: 0; bottom: 0;
        width: var(--w, 0%);
        background: var(--c, var(--accent));
        transition: width 1.2s var(--ease-luxe);
      }

      /* CTA pill with trailing icon-circle */
      .editorial-luxury .ed-cta {
        display: inline-flex; align-items: center; gap: 10px;
        border: 1px solid var(--bg-rule-strong);
        background: rgba(255,255,255,0.02);
        color: var(--ink-100);
        padding: 8px 8px 8px 16px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        font-family: inherit;
        transition: all 300ms var(--ease-luxe);
      }
      .editorial-luxury .ed-cta:hover {
        border-color: var(--accent);
        background: var(--accent-soft);
        color: var(--accent-strong);
      }
      .editorial-luxury .ed-cta .icon {
        width: 24px; height: 24px;
        border-radius: 50%;
        background: var(--accent);
        color: #1a1410;
        display: inline-flex; align-items: center; justify-content: center;
        transition: transform 300ms var(--ease-luxe);
      }
      .editorial-luxury .ed-cta:hover .icon { transform: translateX(2px); }
      .editorial-luxury .ed-cta svg { width: 12px; height: 12px; }
      .editorial-luxury .ed-cta.ghost { border: 1px solid var(--bg-rule); }
      .editorial-luxury .ed-cta.ghost .icon {
        background: transparent;
        border: 1px solid var(--bg-rule-strong);
        color: var(--ink-60);
      }

      /* Tag — small mono pill */
      .editorial-luxury .ed-tag {
        display: inline-flex; align-items: center; gap: 6px;
        font-family: var(--mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--ink-60);
        padding: 4px 10px;
        border: 1px solid var(--bg-rule);
        border-radius: 999px;
        white-space: nowrap;
      }
      .editorial-luxury .ed-tag .swatch {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--c, var(--accent));
      }
      .editorial-luxury .ed-tag.accent {
        color: var(--accent);
        border-color: rgba(201,169,106,0.4);
        background: var(--accent-soft);
      }

      /* Chip — segmented filter pill */
      .editorial-luxury .ed-chip {
        font-family: var(--mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-60);
        padding: 6px 12px;
        border: 1px solid var(--bg-rule);
        border-radius: 999px;
        cursor: pointer;
        background: transparent;
        transition: all 250ms var(--ease-luxe);
        white-space: nowrap;
      }
      .editorial-luxury .ed-chip:hover {
        color: var(--ink-100);
        border-color: var(--bg-rule-strong);
      }
      .editorial-luxury .ed-chip.active {
        color: var(--ink-100);
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      /* Card */
      .editorial-luxury .ed-card {
        border: 1px solid var(--bg-rule);
        background: linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0)),
                    rgba(13,13,19,0.55);
        border-radius: 4px;
        padding: 28px;
      }

      /* Editorial table row */
      .editorial-luxury .ed-row {
        display: grid;
        gap: 24px;
        align-items: center;
        padding: 24px 8px;
        border-bottom: 1px solid var(--bg-rule);
        transition: background 350ms var(--ease-luxe);
      }
      .editorial-luxury .ed-row:hover { background: rgba(255,255,255,0.015); }
    `}</style>
  );
}

/**
 * Centered editorial hero — eyebrow + serif headline split into roman and
 * italic-champagne, with optional lede.
 */
export function EditorialHero({
  eyebrow,
  title,
  accent,
  lede,
  align = "center",
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly accent?: string;
  readonly lede?: string;
  readonly align?: "center" | "left";
}) {
  const isCentered = align === "center";
  return (
    <header
      className={[
        "mx-auto max-w-[920px] mb-[clamp(48px,7vw,80px)] pt-[clamp(32px,6vw,64px)]",
        isCentered ? "text-center" : "text-left",
      ].join(" ")}
    >
      <span className="ed-eyebrow">
        <span className="dot" />
        {eyebrow}
      </span>
      <h1
        className={[
          "font-[family-name:var(--font-display)]",
          "font-light text-[clamp(56px,9vw,112px)] leading-[1.1] tracking-[-0.035em]",
          "text-[var(--ink-100)] m-0 mt-[18px] pb-[0.45em]",
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
    </header>
  );
}

/**
 * Smaller masthead — left-aligned eyebrow + serif title + lede. For pages
 * with body content that needs the masthead to anchor the page, not dominate.
 */
export function EditorialMasthead({
  eyebrow,
  title,
  accent,
  lede,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly accent?: string;
  readonly lede?: string;
}) {
  return (
    <header className="mb-[clamp(48px,7vw,80px)] border-t border-[var(--bg-rule)] pt-7 grid gap-6">
      <span className="ed-eyebrow">
        <span className="dot" />
        {eyebrow}
      </span>
      <h1 className="font-[family-name:var(--font-display)] font-light text-[clamp(40px,7vw,72px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink-100)] m-0 pb-[0.18em]">
        {title}
        {accent && (
          <>
            {" "}
            <em className="not-italic [font-style:italic] font-normal text-[var(--accent)]">{accent}</em>
          </>
        )}
      </h1>
      {lede && (
        <p className="max-w-[56ch] text-[15px] leading-[1.65] text-[var(--ink-60)] font-light m-0">
          {lede}
        </p>
      )}
    </header>
  );
}
