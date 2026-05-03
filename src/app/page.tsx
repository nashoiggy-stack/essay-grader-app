"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { ArrowRight, User } from "lucide-react";

// Editorial middle (steps + tools + FAQ) and footer come from LandingExtras.
// Lazy-loaded to keep the hero's first paint fast.
const LandingMiddle = dynamic(
  () => import("@/components/landing/LandingExtras").then((m) => ({ default: m.LandingMiddle })),
  { ssr: false, loading: () => <div style={{ minHeight: "60vh" }} /> },
);
const LandingFooter = dynamic(
  () => import("@/components/landing/LandingExtras").then((m) => ({ default: m.LandingFooter })),
  { ssr: false, loading: () => null },
);

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

export default function LandingPage() {
  return (
    <>
      {/* ── Hero — Linear-derived calm density.
          Single screen height, no sticky scroll choreography, no shader,
          no aurora gradient. Headline + standfirst + two CTAs. The
          fluid clamp() on the headline is the *only* place fluid type
          appears in the app — see design-system/MASTER.md page archetype 1. */}
      <section
        data-landing-page=""
        className="min-h-[88svh] flex items-center px-4 sm:px-6 pt-20 pb-16"
      >
        <div className="mx-auto max-w-[1180px] w-full">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: EASE_EXPO }}
            className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted mb-6"
          >
            College admissions, with the math behind it
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: EASE_EXPO, delay: 0.04 }}
            className="text-text-primary font-semibold tracking-[-0.025em] leading-[1.04] max-w-[18ch]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.75rem)" }}
          >
            Your edge in college admissions.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: EASE_EXPO, delay: 0.1 }}
            className="mt-5 max-w-[58ch] text-[16px] sm:text-[17px] leading-relaxed text-text-secondary"
          >
            Nine integrated tools — essay grading, GPA, extracurriculars,
            resume, list grading, chances, comparison, strategy — running off
            one shared profile. Every recommendation is sourced from the
            Common Data Set.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: EASE_EXPO, delay: 0.18 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-sm bg-accent text-white px-5 py-2.5 text-[14px] font-medium transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent-strong active:translate-y-[0.5px]"
            >
              Open dashboard
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-sm border border-border-strong bg-transparent text-text-primary px-5 py-2.5 text-[14px] font-medium transition-[background-color] duration-150 hover:bg-bg-elevated"
            >
              <User className="w-4 h-4" />
              Build your profile
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-6 text-[12px] text-text-faint"
          >
            Early access — actively in development.
          </motion.p>
        </div>
      </section>

      {/* Editorial middle — steps, tools grid, FAQ. */}
      <LandingMiddle />

      {/* CTA — flat card with restrained accent-line border. No sticky
          fade-in choreography, no radial shaders. */}
      <section data-landing-page="" className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-[1180px] w-full">
          <div className="rounded-md border border-accent-line bg-accent-soft px-6 sm:px-12 py-12 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-accent-text mb-4">
              Ready when you are
            </p>
            <h2
              className="text-text-primary font-semibold tracking-[-0.025em] leading-[1.04] max-w-[16ch]"
              style={{ fontSize: "clamp(2rem, 4.4vw, 3.25rem)" }}
            >
              Start building your profile.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-text-secondary">
              The same profile feeds every tool. Drop in your transcript,
              scores, activities, and goals — fill it in once, work everywhere.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-sm bg-accent text-white px-5 py-2.5 text-[14px] font-medium transition-[background-color] duration-150 hover:bg-accent-strong"
              >
                Dashboard
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-sm border border-border-strong bg-bg-base text-text-primary px-5 py-2.5 text-[14px] font-medium transition-[background-color] duration-150 hover:bg-bg-elevated"
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}
