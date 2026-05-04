"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export interface SectionNavItem {
  /** Anchor id — the section in the page must render with this id. */
  readonly id: string;
  /** Short label shown in the rail/chip. */
  readonly label: string;
  /** Optional completion flag — drives the green check + muted weight. */
  readonly complete?: boolean;
}

interface SectionNavProps {
  readonly sections: readonly SectionNavItem[];
  /** Pixel offset for IntersectionObserver/scrollIntoView so a sticky page
   *  header doesn't hide the heading after a jump. Defaults to 80. */
  readonly headerOffset?: number;
  /** ARIA label for the nav landmark. */
  readonly ariaLabel?: string;
  /**
   * Layout mode:
   * - "chips" (default): sticky horizontal chip-bar at all sizes. Drop-in,
   *   doesn't require the parent to provide a grid column.
   * - "rail-and-chips": sticky left rail at lg+, chip-bar below — requires
   *   the parent page to wrap content in a `lg:grid lg:grid-cols-[200px_1fr]`
   *   layout so the rail has a dedicated column.
   */
  readonly variant?: "chips" | "rail-and-chips";
}

/**
 * Shared section navigation primitive used by /profile, /resume, /strategy.
 *
 * Renders as a sticky left rail at lg+ and a horizontal chip-bar below.
 * Tracks the active section via IntersectionObserver and supports per-section
 * completion state pulled from the page's existing data hooks.
 *
 * Anchors: each section in the parent page must render with `id={item.id}`
 * so the click handler's smooth scroll resolves and the observer can pick
 * up the heading. Use `scroll-mt-[var(--section-offset)]` on the section
 * heading if the parent has its own sticky chrome.
 */
export function SectionNav({
  sections,
  headerOffset = 80,
  ariaLabel = "Section navigation",
  variant = "chips",
}: SectionNavProps) {
  const [activeId, setActiveId] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sections.length === 0) return;

    // Trigger when a section's top crosses ~30% of viewport height. This
    // makes the active state feel tied to "what the user is reading," not
    // to whether a section is barely peeking in.
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible entry that's intersecting; falls back to
        // the topmost if none are crossing the threshold.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0 && visible[0].target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: `-${headerOffset + 20}px 0px -55% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    observerRef.current = observer;
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections, headerOffset]);

  const onJump = (id: string) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
    if (history.replaceState) {
      history.replaceState(null, "", `#${id}`);
    }
  };

  if (sections.length === 0) return null;

  // Chip-bar — sticky horizontal scroller. Used at all sizes in "chips"
  // variant; only at <lg in "rail-and-chips" variant.
  const chipBar = (
    <nav
      aria-label={ariaLabel}
      className={`${
        variant === "rail-and-chips" ? "lg:hidden" : ""
      } sticky top-[var(--navbar-height,64px)] z-20 -mx-4 px-4 py-2 mb-6 overflow-x-auto bg-bg-base/85 backdrop-blur supports-[backdrop-filter]:bg-bg-base/70 border-b border-border-hair`}
    >
      <ul className="flex items-center gap-2 min-w-max">
        {sections.map((s) => (
          <li key={s.id}>
            <ChipButton
              section={s}
              active={s.id === activeId}
              onClick={() => onJump(s.id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );

  if (variant === "chips") return chipBar;

  return (
    <>
      {chipBar}
      {/* Desktop rail — parent page must provide a grid column for this. */}
      <nav
        aria-label={ariaLabel}
        className="hidden lg:block sticky top-24 self-start"
      >
        <ul className="flex flex-col gap-0.5">
          {sections.map((s) => (
            <li key={s.id}>
              <RailButton
                section={s}
                active={s.id === activeId}
                onClick={() => onJump(s.id)}
              />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function RailButton({
  section,
  active,
  onClick,
}: {
  section: SectionNavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "location" : undefined}
      className={`group w-full flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-[12px] transition-colors ${
        active
          ? "bg-bg-elevated text-text-primary"
          : "text-text-muted hover:text-text-secondary hover:bg-bg-surface"
      }`}
    >
      <span
        aria-hidden
        className={`w-0.5 h-3.5 rounded-full transition-colors ${
          active
            ? "bg-[var(--accent)]"
            : "bg-transparent group-hover:bg-border-strong"
        }`}
      />
      <span className="flex-1 truncate">{section.label}</span>
      {section.complete && (
        <Check
          className="w-3 h-3 text-tier-safety-fg shrink-0"
          aria-label="Complete"
        />
      )}
    </button>
  );
}

function ChipButton({
  section,
  active,
  onClick,
}: {
  section: SectionNavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "location" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap border ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent-line)]"
          : "bg-bg-surface text-text-secondary border-border-hair hover:bg-bg-elevated"
      }`}
    >
      {section.label}
      {section.complete && (
        <Check
          className="w-3 h-3 text-tier-safety-fg shrink-0"
          aria-label="Complete"
        />
      )}
    </button>
  );
}
