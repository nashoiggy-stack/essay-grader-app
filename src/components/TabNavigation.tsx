"use client";

import React, { useRef } from "react";
import { motion } from "motion/react";
import { TABS } from "@/data/mockData";

export type TabId = (typeof TABS)[number]["id"];

interface TabNavigationProps {
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = e.key === "ArrowRight"
        ? (idx + 1) % TABS.length
        : (idx - 1 + TABS.length) % TABS.length;
      onTabChange(TABS[next].id);
      refs.current[next]?.focus();
    }
  };

  return (
    <nav role="tablist" aria-label="Essay results sections" className="flex border-b border-border-hair overflow-x-auto">
      {TABS.map((tab, i) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative px-5 py-3.5 text-sm font-medium transition-[color] duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-line focus-visible:ring-inset ${
              isActive ? "text-accent-text" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
