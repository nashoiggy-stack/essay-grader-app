"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useAuthContext } from "./AuthProvider";

const NAV_ITEMS = [
  { href: "/", label: "Essay Grader" },
  { href: "/gpa", label: "GPA Calculator" },
] as const;

export const NavBar: React.FC = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuthContext();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#06060f]/70 border-b border-white/[0.06]">
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">CP</span>
          </div>
          <span className="text-sm font-semibold text-zinc-300 hidden sm:block">
            College Prep
          </span>
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 ring-1 ring-white/[0.06]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
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

        {/* User */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 hidden sm:block truncate max-w-[140px]">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-all"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
