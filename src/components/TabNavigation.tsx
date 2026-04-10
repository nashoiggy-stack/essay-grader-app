"use client";

import React from "react";
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
}) => (
  <nav className="flex border-b border-white/[0.06] overflow-x-auto">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`relative px-5 py-3.5 text-sm font-medium transition-[color] duration-200 whitespace-nowrap ${
          activeTab === tab.id ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        {tab.label}
        {activeTab === tab.id && (
          <motion.div
            layoutId="tab-underline"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-500"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </button>
    ))}
  </nav>
);
