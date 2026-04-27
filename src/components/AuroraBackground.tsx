"use client";

import React, { ReactNode } from "react";

interface AuroraBackgroundProps {
  readonly children: ReactNode;
}

// The WebGL shader is now mounted once at AppShell level (PersistentBackground)
// so it survives route transitions instead of re-initializing on every nav,
// which was causing the flash + lag when switching between tools.
export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ children }) => {
  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ color: "var(--text-primary)" }}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};
