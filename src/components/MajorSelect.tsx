"use client";

import React from "react";
import { MAJOR_GROUPS } from "@/lib/college-types";

// Shared grouped <select> for picking a major. Rendered identically across
// the College List filters, the Chances form, and the Strategy page picker
// so all three surfaces see the same comprehensive list, optgroups, and
// styling. Keeping this in one component means "adding a new major" is a
// one-file change.

interface MajorSelectProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly id?: string;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  // Optional placeholder rendered as a disabled empty-value option at the
  // top. Used by the chip add-pattern where the parent always re-sets
  // value to "" after each pick — the placeholder gives the select a
  // sensible empty state to show.
  readonly placeholder?: string;
}

const DEFAULT_SELECT_CLASS =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 focus:border-blue-500/50 focus:ring-1 focus:ring-accent-line focus:outline-none appearance-none cursor-pointer";

export const MajorSelect: React.FC<MajorSelectProps> = ({
  value,
  onChange,
  id,
  className,
  ariaLabel,
  disabled,
  placeholder,
}) => {
  return (
    <select
      id={id}
      value={value}
      aria-label={ariaLabel ?? "Intended major"}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className ?? DEFAULT_SELECT_CLASS}
    >
      {placeholder !== undefined && (
        <option value="" disabled hidden={false}>
          {placeholder}
        </option>
      )}
      {MAJOR_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.majors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
