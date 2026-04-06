"use client";

import React from "react";
import { AuthProvider } from "./AuthProvider";
import { AuthGate } from "./AuthGate";
import { NavBarWrapper } from "./NavBarWrapper";

interface AppShellProps {
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <AuthProvider>
      <AuthGate>
        <NavBarWrapper />
        {children}
      </AuthGate>
    </AuthProvider>
  );
};
