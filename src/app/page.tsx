"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, User } from "lucide-react";
// LandingMiddle + LandingFooter are below the fold and cost no first-paint
// time to defer. Lazy-loading them shrinks the initial JS payload so the
// hero can paint and become interactive faster.
// LandingMiddle + LandingFooter are below the fold so dynamic() lets
// them code-split out of the initial bundle. SSR is left ON (the
// previous `ssr: false` made the editorial middle + footer invisible
// to crawlers and caused a flash-of-empty-content on slow networks
// — see CRITIQUE.md systemic issue / landing BLOCK).
const LandingMiddle = dynamic(
  () => import("@/components/landing/LandingExtras").then((m) => ({ default: m.LandingMiddle })),
  { loading: () => <div style={{ minHeight: "60vh" }} /> }
);
const LandingFooter = dynamic(
  () => import("@/components/landing/LandingExtras").then((m) => ({ default: m.LandingFooter })),
  { loading: () => null }
);

const ShaderLines = dynamic(
  () => import("@/components/ui/shader-lines").then((m) => ({ default: m.ShaderLines })),
  { ssr: false }
);

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // UNDO [shader-delay]: revert `0` back to `500` if the shader flashes
  // on first paint on slow devices.
  const [shaderReady, setShaderReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShaderReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // ── Hero scroll choreography ──────────────────────────────────
  // Hero text + shader fade out as the user scrolls past the first
  // sticky viewport into the editorial middle.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const smoothHero = useSpring(heroProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });
  // Pronounced fade: hero holds for the first ~30% of scroll then ramps
  // out hard with strong scale-up and blur. Sticky section is also taller
  // so the user must scroll a real distance to push past it.
  const heroOpacity = useTransform(smoothHero, [0, 0.3, 0.85], [1, 1, 0]);
  const heroScale = useTransform(smoothHero, [0, 0.3, 0.85], [1, 1.02, 1.25]);
  const heroBlur = useTransform(smoothHero, [0, 0.3, 0.85], [0, 0, 24]);
  const heroBlurFilter = useTransform(heroBlur, (v) => `blur(${v}px)`);
  const heroGridOpacity = useTransform(smoothHero, [0, 0.3, 0.85], [0.4, 0.4, 0]);

  // ── CTA scroll choreography ───────────────────────────────────
  // Mirror of the hero: the CTA section fades and scales IN as the user
  // arrives, using the same easing so both transitions feel consistent.
  // Offset starts before the section is fully on-screen so the fade-in
  // happens as the user is still scrolling the editorial content.
  const { scrollYProgress: ctaProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end end"],
  });
  const smoothCta = useSpring(ctaProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });
  // Mirror of the hero choreography: stays invisible while the user is in
  // the editorial middle, then fades in hard once they cross into the CTA
  // sticky and ramps fully in by the time the section is locked.
  const ctaOpacity = useTransform(smoothCta, [0.15, 0.7, 1], [0, 1, 1]);
  const ctaScale = useTransform(smoothCta, [0.15, 0.7, 1], [0.78, 1, 1]);
  const ctaBlur = useTransform(smoothCta, [0.15, 0.7, 1], [24, 0, 0]);
  const ctaBlurFilter = useTransform(ctaBlur, (v) => `blur(${v}px)`);
  const ctaPointerEvents = useTransform(ctaOpacity, (v) => (v > 0.5 ? "auto" : "none"));
  const ctaGridOpacity = useTransform(smoothCta, [0.15, 0.7, 1], [0, 0.4, 0.4]);

  const landingTokens: React.CSSProperties = {
    // Lock dark theme tokens for the landing page regardless of picker.
    ["--bg-base" as string]: "#0a0a14",
    ["--bg-surface" as string]: "#0f0f1a",
    ["--text-primary" as string]: "#e4e4e7",
    ["--text-muted" as string]: "#a1a1aa",
    ["--border-token" as string]: "rgba(255, 255, 255, 0.08)",
  };

  return (
    <>
      {/* ── Page 1 / Hero (sticky, fades out on scroll) ───────── */}
      <div
        ref={heroRef}
        data-landing-page=""
        className="bg-zinc-950"
        style={{ height: "420vh", ...landingTokens }}
      >
        <div
          className="relative w-full bg-zinc-950 text-white"
          style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden" }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: heroGridOpacity,
              backgroundSize: "60px 60px",
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
              maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            }}
          />

          {shaderReady && (
            <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ opacity: heroOpacity }}>
              <ShaderLines />
            </motion.div>
          )}

          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
            style={{ opacity: heroOpacity, scale: heroScale, filter: heroBlurFilter }}
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-zinc-300 mb-4 sm:mb-6 font-semibold">
              College Prep Suite
            </p>
            {/* Single h1 with two visual lines — second line italic. Was two
                separate h1s, which advertised two top-level headings to
                screen readers and broke document outline. */}
            <h1
              className="font-[family-name:var(--font-display)] tracking-[-0.012em] text-white leading-[1]"
              style={{ fontSize: "clamp(2.4rem, 8vw, 7rem)" }}
            >
              <span className="block mb-2 sm:mb-3">Your edge in</span>
              <span className="block italic">college admissions.</span>
            </h1>
            {/* Standfirst — names what the product actually does, so a
                first-time visitor scanning the hero understands the value
                prop without scrolling through 420vh of choreography. */}
            <p className="mt-5 sm:mt-6 max-w-[44ch] text-[14px] sm:text-[15px] leading-relaxed text-zinc-300">
              Nine connected tools — essay grading, GPA, extracurriculars,
              resume, list, chances, comparison, strategy — sourced from CDS
              data. One profile feeds them all.
            </p>
            <p className="text-xs text-zinc-500 text-center mt-4">
              Early access — actively in development
            </p>
          </motion.div>

          {/* Scroll hint — fades out alongside the rest of the hero */}
          <motion.div
            style={{ opacity: heroOpacity }}
            className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            aria-hidden="true"
          >
            <span className="text-[12px] sm:text-[13px] uppercase tracking-[0.45em] text-white font-semibold">
              Scroll
            </span>
            <div className="relative w-[2px] h-14 sm:h-16 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/60 to-white/40" />
              <motion.div
                initial={{ y: "-100%" }}
                animate={{ y: "100%" }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: [0.23, 1, 0.32, 1],
                  repeatDelay: 0.25,
                }}
                className="absolute left-0 right-0 h-6 bg-gradient-to-b from-transparent via-white to-transparent"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Page 2 / Editorial middle (normal scroll) ─────────── */}
      <LandingMiddle />

      {/* ── Page 3 / CTA (sticky, fades in on scroll) ─────────── */}
      <div
        ref={ctaRef}
        data-landing-page=""
        className="bg-zinc-950"
        style={{ height: "280vh", ...landingTokens }}
      >
        <div
          className="relative w-full bg-zinc-950 text-white"
          style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden" }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: ctaGridOpacity,
              backgroundSize: "60px 60px",
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
              maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            }}
          />

          {shaderReady && (
            <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ opacity: ctaOpacity }}>
              <ShaderLines />
            </motion.div>
          )}

          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
            style={{
              opacity: ctaOpacity,
              scale: ctaScale,
              filter: ctaBlurFilter,
              pointerEvents: ctaPointerEvents,
            }}
          >
            <h2
              className="font-[family-name:var(--font-display)] tracking-[-0.012em] mb-4 sm:mb-6 text-white leading-[1]"
              style={{ fontSize: "clamp(2.4rem, 8vw, 7rem)" }}
            >
              <span className="block mb-2 sm:mb-3">Start building</span>
              <span className="block italic">your profile.</span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-xl mx-auto font-light leading-relaxed px-2">
              Grade your essays, calculate your GPA, evaluate your extracurriculars, and find your
              best-fit schools — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
              <Link
                href="/dashboard"
                scroll
                onClick={() => {
                  // Belt-and-suspenders: Next 16's scroll restoration
                  // sometimes preserves the landing page's scroll Y on
                  // a SPA navigation, dropping the user at the bottom
                  // of /dashboard. Force the top after the next paint.
                  if (typeof window !== "undefined") {
                    requestAnimationFrame(() => window.scrollTo(0, 0));
                  }
                }}
                className="group inline-flex items-center gap-3 rounded-full bg-white pl-6 sm:pl-8 pr-1.5 py-1.5 text-sm font-semibold text-zinc-950 transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] hover:bg-zinc-100 active:scale-[0.97]"
              >
                Dashboard
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-950/10 transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <Link
                href="/profile"
                className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pl-6 sm:pl-8 pr-1.5 py-1.5 text-sm font-semibold text-white transition-[background-color,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:border-white/15"
              >
                My Profile
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                  <User className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Footer (after CTA finishes) ───────────────────────── */}
      <LandingFooter />
    </>
  );
}
