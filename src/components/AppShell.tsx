"use client";

import React from "react";
import Link from "next/link";
import { AuthProvider } from "./AuthProvider";
import { AuthGate } from "./AuthGate";
import { NavBarWrapper } from "./NavBarWrapper";
import { CloudStorageBoundary } from "./CloudStorageBoundary";
import { SaveIndicator } from "./SaveIndicator";
import { WebGLShader } from "./ui/web-gl-shader";
import { useBackground } from "./BackgroundProvider";

interface AppShellProps {
  readonly children: React.ReactNode;
}

// Hoisted once at the shell level so the (heavy) WebGL canvas survives
// route transitions instead of re-initializing on every navigation.
function PersistentBackground() {
  const { background } = useBackground();
  if (background !== "shader") return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    >
      <WebGLShader />
    </div>
  );
}

// Minimal global footer surfacing the Methodology link site-wide. Sits below
// the main content; intentionally low-key (small text, muted color) to avoid
// competing with page chrome. Adds a single canonical entry point to the
// chance-model methodology page on every route.
function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.04] bg-[#06060c]/40 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600">
        <p>© AdmitEdge — Beta. Chance estimates are strategic guidance, not predictions.</p>
        <nav className="flex items-center gap-4">
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
        <PersistentBackground />
        <CloudStorageBoundary />
        <NavBarWrapper />
        <div id="main-content">{children}</div>
        <Footer />
        <SaveIndicator />
      </AuthGate>
    </AuthProvider>
  );
};
