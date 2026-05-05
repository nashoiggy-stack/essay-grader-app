"use client";

import React from "react";
import Link from "next/link";
import { AuthProvider } from "./AuthProvider";
import { AuthGate } from "./AuthGate";
import { NavBarWrapper } from "./NavBarWrapper";
import { CloudStorageBoundary } from "./CloudStorageBoundary";
import { CloudSyncToast } from "./CloudSyncToast";

interface AppShellProps {
  readonly children: React.ReactNode;
}

// Minimal global footer surfacing the Methodology link site-wide. Sits below
// the main content; intentionally low-key (small text, muted color) to avoid
// competing with page chrome. Adds a single canonical entry point to the
// chance-model methodology page on every route.
function Footer() {
  return (
    <footer
      className="mt-auto border-t border-white/[0.04] bg-[#06060c]/40 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-zinc-600">
        <p className="leading-relaxed">© AdmitEdge — Beta. Chance estimates are strategic guidance, not predictions.</p>
        <nav className="flex items-center gap-4 shrink-0">
          <Link href="/methodology" className="hover:text-zinc-300 transition-colors">
            Methodology
          </Link>
          <Link href="/profile" className="hover:text-zinc-300 transition-colors">
            Profile
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <AuthProvider>
      <AuthGate>
        <CloudStorageBoundary />
        <NavBarWrapper />
        {children}
        <Footer />
        <CloudSyncToast />
      </AuthGate>
    </AuthProvider>
  );
};
