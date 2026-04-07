"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "./AuthProvider";
import { AdmitEdgeLogo } from "./AdmitEdgeLogo";

const NAV_ITEMS = [
  { href: "/essay", label: "Essay Grader" },
  { href: "/gpa", label: "GPA Calc" },
  { href: "/extracurriculars", label: "ECs" },
  { href: "/colleges", label: "College List" },
  { href: "/chances", label: "Chances" },
] as const;

export const NavBar: React.FC = () => {
  const pathname = usePathname();
  const { user, guest, signOut } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#06060f]/70 border-b border-white/[0.06]">
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
        {/* Home button */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <AdmitEdgeLogo size={28} className="group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-[filter]" />
          <span className="text-sm font-semibold text-zinc-300 hidden sm:block group-hover:text-white transition-colors">
            AdmitEdge
          </span>
        </Link>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#0c0c1a]/90 rounded-lg p-1 ring-1 ring-white/[0.06]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 lg:px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-white/[0.08] ring-1 ring-white/[0.1]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side: profile + user + hamburger */}
        <div className="flex items-center gap-2">
          {/* Profile link */}
          <Link
            href="/profile"
            className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
              pathname === "/profile"
                ? "text-blue-400 bg-blue-500/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </Link>

          {user ? (
            <>
              <span className="text-xs text-zinc-500 hidden lg:block truncate max-w-[140px]">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all hidden sm:block"
              >
                Sign out
              </button>
            </>
          ) : guest ? (
            <>
              <span className="text-xs text-zinc-500 hidden lg:block">Guest</span>
              <Link
                href="/"
                onClick={signOut}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all hidden sm:block"
              >
                Sign in
              </Link>
            </>
          ) : null}

          {/* Hamburger button (mobile) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
              className="w-5 h-0.5 bg-zinc-400 block rounded-full origin-center"
            />
            <motion.span
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-5 h-0.5 bg-zinc-400 block rounded-full"
            />
            <motion.span
              animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
              className="w-5 h-0.5 bg-zinc-400 block rounded-full origin-center"
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-white/[0.06] bg-[#0a0a14]"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/profile"
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                }`}
              >
                Profile
              </Link>

              {user && (
                <div className="pt-2 mt-2 border-t border-white/[0.06]">
                  <p className="text-xs text-zinc-600 px-3 truncate">{user.email}</p>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 transition-all"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
