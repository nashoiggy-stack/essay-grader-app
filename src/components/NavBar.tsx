"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "./AuthProvider";
import { AdmitEdgeLogo } from "./AdmitEdgeLogo";

const NAV_ITEMS = [
  { href: "/essay", label: "Essay" },
  { href: "/gpa", label: "GPA" },
  { href: "/extracurriculars", label: "ECs" },
  { href: "/resume", label: "Resume" },
  { href: "/colleges", label: "Colleges" },
  { href: "/list", label: "List" },
  { href: "/chances", label: "Chances" },
  { href: "/compare", label: "Compare" },
  { href: "/strategy", label: "Strategy" },
] as const;

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

export const NavBar: React.FC = () => {
  const pathname = usePathname();
  const { user, guest, signOut } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Linear-derived bar — flush full-width, hairline bottom border, no
          floating pill, no decorative shadow. Subtle backdrop-blur is the
          ONLY glass-style effect kept (it's functional: keeps the bar
          legible when content scrolls beneath it). */}
      <nav
        className="sticky top-0 z-50 w-full bg-bg-base/85 backdrop-blur-[6px] border-b border-border-hair"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <AdmitEdgeLogo size={20} />
              <span
                data-brand-mark
                className="text-[14px] font-semibold text-text-primary hidden sm:block"
              >
                AdmitEdge
              </span>
              <span
                aria-label="Beta"
                className="font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-sm bg-bg-surface text-text-muted border border-border-hair leading-none"
              >
                BETA
              </span>
            </Link>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-2.5 lg:px-3 py-1.5 text-[13px] rounded-sm transition-[color,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isActive
                        ? "text-accent-text bg-accent-soft"
                        : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                aria-current={pathname === "/dashboard" ? "page" : undefined}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] transition-[color,background-color] duration-150 ${
                  pathname === "/dashboard"
                    ? "text-accent-text bg-accent-soft"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
                </svg>
                Dashboard
              </Link>
              <Link
                href="/profile"
                aria-current={pathname === "/profile" ? "page" : undefined}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] transition-[color,background-color] duration-150 ${
                  pathname === "/profile"
                    ? "text-accent-text bg-accent-soft"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </Link>

              {user ? (
                <>
                  <span
                    className="text-[11px] text-text-faint hidden lg:block truncate max-w-[80px] whitespace-nowrap ml-1"
                    title={user.email ?? undefined}
                  >
                    {user.email ? user.email.split("@")[0] : ""}
                  </span>
                  <button
                    onClick={signOut}
                    className="text-[12px] text-text-muted hover:text-text-primary px-2 py-1 rounded-sm hover:bg-bg-elevated transition-[color,background-color] duration-150 hidden sm:block whitespace-nowrap"
                  >
                    Sign out
                  </button>
                </>
              ) : guest ? (
                <>
                  <span className="text-[11px] text-text-faint hidden lg:block whitespace-nowrap ml-1">Guest</span>
                  <Link
                    href="/"
                    onClick={signOut}
                    className="text-[12px] text-accent hover:text-accent-strong px-2 py-1 rounded-sm hover:bg-accent-soft transition-[color,background-color] duration-150 hidden sm:block whitespace-nowrap"
                  >
                    Sign in
                  </Link>
                </>
              ) : null}

              {/* Hamburger — 44x44 hit area on mobile (visible icon stays small) */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden flex flex-col justify-center items-center min-w-[44px] min-h-[44px] gap-1.5 -mr-2"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                <motion.span
                  animate={{
                    transform: mobileOpen
                      ? "translateY(5px) rotate(45deg)"
                      : "translateY(0px) rotate(0deg)",
                  }}
                  transition={{ duration: 0.24, ease: EASE_EXPO }}
                  className="w-4 h-px bg-text-secondary block origin-center"
                />
                <motion.span
                  animate={{
                    opacity: mobileOpen ? 0 : 1,
                    transform: mobileOpen ? "scaleX(0)" : "scaleX(1)",
                  }}
                  transition={{ duration: 0.18, ease: EASE_EXPO }}
                  className="w-4 h-px bg-text-secondary block"
                />
                <motion.span
                  animate={{
                    transform: mobileOpen
                      ? "translateY(-5px) rotate(-45deg)"
                      : "translateY(0px) rotate(0deg)",
                  }}
                  transition={{ duration: 0.24, ease: EASE_EXPO }}
                  className="w-4 h-px bg-text-secondary block origin-center"
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Fullscreen mobile overlay — flat surface, no backdrop-blur (Linear-
          derived has no glassmorphism). Hairline divider above the
          dashboard/profile pair to read as a separate group. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_EXPO }}
            className="fixed inset-0 z-40 bg-bg-base md:hidden flex flex-col items-stretch pt-16"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 56px)" }}
          >
            <div className="flex flex-col w-full max-w-md mx-auto px-4">
              {NAV_ITEMS.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, transform: "translateY(8px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    exit={{ opacity: 0, transform: "translateY(4px)" }}
                    transition={{ delay: 0.02 + i * 0.025, duration: 0.24, ease: EASE_EXPO }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`block w-full px-4 py-3 rounded-sm text-[15px] transition-[color,background-color] duration-150 ${
                        isActive
                          ? "text-accent-text bg-accent-soft"
                          : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="mt-4 pt-4 border-t border-border-hair flex flex-col">
                <motion.div
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(4px)" }}
                  transition={{ delay: 0.02 + NAV_ITEMS.length * 0.025, duration: 0.24, ease: EASE_EXPO }}
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === "/dashboard" ? "page" : undefined}
                    className={`block w-full px-4 py-3 rounded-sm text-[15px] transition-[color,background-color] duration-150 ${
                      pathname === "/dashboard"
                        ? "text-accent-text bg-accent-soft"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                  >
                    Dashboard
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(4px)" }}
                  transition={{ delay: 0.02 + (NAV_ITEMS.length + 1) * 0.025, duration: 0.24, ease: EASE_EXPO }}
                >
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    className={`block w-full px-4 py-3 rounded-sm text-[15px] transition-[color,background-color] duration-150 ${
                      pathname === "/profile"
                        ? "text-accent-text bg-accent-soft"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                  >
                    Profile
                  </Link>
                </motion.div>
              </div>

              {user && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.32, duration: 0.24 }}
                  className="mt-6 pt-4 border-t border-border-hair px-4"
                >
                  <p className="text-[12px] text-text-faint truncate mb-2">{user.email}</p>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="text-[13px] text-text-muted hover:text-text-primary transition-[color] duration-150"
                  >
                    Sign out
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
