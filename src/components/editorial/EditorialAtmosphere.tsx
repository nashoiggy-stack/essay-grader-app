"use client";

import React from "react";

/**
 * Editorial-luxury palette + atmosphere — scoped to a wrapper class so the
 * rest of the app keeps its existing tone. Inject this once near the top of
 * a page tree and wrap the page content in `<div className="editorial-luxury">`
 * (or use the `<EditorialWrapper>` helper below).
 *
 * Tokens:
 *   --ink-100..ink-30   warm ink ramp
 *   --bg-rule           hairline rule
 *   --accent            champagne (#c9a96a)
 *   --accent-soft       champagne tint
 *   --accent-strong     hover champagne
 *   --tier-*            tier-band tints
 *
 * Atmosphere:
 *   absolute radial gold blooms behind content (z-index 0)
 *   fixed paper-grain noise overlay (z-index 1, mix-blend overlay)
 *
 * Reusable utilities exposed under .editorial-luxury:
 *   .corner-frame                   1px frame with 12×12 champagne brackets
 *   .grade-letter-gold              gold-leaf gradient text fill
 *   .sub-meter                      engraved-foil 1px hairline meter
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

      /* Engraved letter — gold-leaf gradient text fill */
      .editorial-luxury .grade-letter-gold {
        background: linear-gradient(180deg, #f4f1ea 0%, #c9a96a 70%, #8a7340 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 60px rgba(201, 169, 106, 0.15);
      }

      /* Corner-bracketed frame */
      .editorial-luxury .corner-frame {
        position: relative;
        border: 1px solid var(--bg-rule);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0)),
          rgba(13, 13, 19, 0.55);
      }
      .editorial-luxury .corner-frame::before,
      .editorial-luxury .corner-frame::after {
        content: "";
        position: absolute;
        width: 12px;
        height: 12px;
        border: 1px solid var(--accent);
        opacity: 0.55;
      }
      .editorial-luxury .corner-frame::before {
        top: -1px; left: -1px;
        border-right: 0; border-bottom: 0;
      }
      .editorial-luxury .corner-frame::after {
        bottom: -1px; right: -1px;
        border-left: 0; border-top: 0;
      }

      /* Sub-score gradient meter — overflows the 1px hairline 3px above and
         below for an engraved gold-foil look. */
      .editorial-luxury .sub-meter {
        position: relative;
        height: 1px;
        background: var(--bg-rule);
        overflow: hidden;
      }
      .editorial-luxury .sub-meter::after {
        content: "";
        position: absolute;
        top: -3px; bottom: -3px;
        left: 0;
        width: var(--w, 0%);
        height: 7px;
        background: linear-gradient(90deg, transparent, var(--accent));
        transition: width 1.2s cubic-bezier(0.32, 0.72, 0, 1);
      }
    `}</style>
  );
}

/**
 * Convenience wrapper. Use as the outermost element on any page that wants
 * the editorial-luxury palette + atmosphere. Children inherit the warm-ink
 * + champagne CSS variables and can opt in via class names like
 * `text-[var(--ink-100)]`, `border-[var(--bg-rule)]`, etc.
 */
export function EditorialWrapper({
  children,
  className = "",
  as: As = "div",
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly as?: "div" | "main" | "section" | "article";
}) {
  return (
    <>
      <EditorialAtmosphere />
      <As className={`editorial-luxury ${className}`}>{children}</As>
    </>
  );
}
