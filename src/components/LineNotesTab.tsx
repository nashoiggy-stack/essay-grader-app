"use client";

import React from "react";
import { motion } from "motion/react";
import type { LineSuggestion } from "@/lib/types";

interface LineNotesTabProps {
  readonly suggestions: LineSuggestion[];
}

export const LineNotesTab: React.FC<LineNotesTabProps> = ({ suggestions }) => (
  <motion.div
    key="lines"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
    className="space-y-4"
  >
    {suggestions.length > 0 ? (
      suggestions.map((ls, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-bg-surface rounded-xl p-4"
        >
          <p className="text-sm text-text-muted italic border-l-2 border-accent-line pl-3 mb-2">
            &ldquo;{ls.line}&rdquo;
          </p>
          <p className="text-sm text-text-secondary pl-3">{ls.suggestion}</p>
        </motion.div>
      ))
    ) : (
      <p className="text-sm text-text-faint text-center py-8">
        No line-specific suggestions
      </p>
    )}
  </motion.div>
);
