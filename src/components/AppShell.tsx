"use client";

import React from "react";
import { AuthProvider } from "./AuthProvider";
import { AuthGate } from "./AuthGate";
import { NavBarWrapper } from "./NavBarWrapper";
import { ProfileSync } from "./ProfileSync";
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

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <AuthProvider>
      <AuthGate>
        <PersistentBackground />
        <ProfileSync />
        <NavBarWrapper />
        <div id="main-content">{children}</div>
        <SaveIndicator />
      </AuthGate>
    </AuthProvider>
  );
};
