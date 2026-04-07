"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthContext } from "./AuthProvider";

const NAV_ITEMS = [
  { href: "/essay", label: "Essay Grader" },
  { href: "/gpa", label: "GPA Calc" },
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
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">CP</span>
          </div>
          <span className="text-sm font-semibold text-zinc-300 hidden sm:block">
            College Prep
          </span>
        </Link>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 ring-1 ring-white/[0.06]">
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

        {/* Right side: user + hamburger */}
        <div className="flex items-center gap-2">
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
                className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all hidden sm:block"
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
                        ? "bg-indigo-500/10 text-indigo-400"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

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
