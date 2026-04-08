"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const ShaderLines = dynamic(
  () => import("@/components/ui/shader-lines").then((m) => ({ default: m.ShaderLines })),
  { ssr: false }
);
import { PenLine, Calculator, ClipboardList, School, BarChart3, ArrowRight, User } from "lucide-react";

const FEATURES = [
  { href: "/essay", icon: PenLine, title: "Essay Grader", description: "AI essay grading with 7 criteria + VSPICE rubric.", stat: "7+V", statLabel: "Criteria" },
  { href: "/gpa", icon: Calculator, title: "GPA Calculator", description: "Weighted and unweighted GPA across HS and college scales.", stat: "4", statLabel: "Scales" },
  { href: "/extracurriculars", icon: ClipboardList, title: "EC Evaluator", description: "Conversational activity evaluation with tier ratings.", stat: "4", statLabel: "Tiers" },
  { href: "/colleges", icon: School, title: "College List", description: "5-tier college list filtered by your profile.", stat: "80+", statLabel: "Schools" },
  { href: "/chances", icon: BarChart3, title: "Chances", description: "Admission chance estimates with interactive map.", stat: "5", statLabel: "Bands" },
];

const CARD_STYLES = `
  .premium-depth-card {
    background: linear-gradient(145deg, #162C6D 0%, #0A101D 100%);
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9), 0 20px 40px -20px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 40%);
    mix-blend-mode: screen;
  }
  .feature-card-depth {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 15px 30px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08), inset 0 -1px 1px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.06);
  }
`;

function FeatureCard({
  feature,
  index,
  smoothProgress,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  smoothProgress: ReturnType<typeof useSpring>;
}) {
  const start = 0.4 + index * 0.03;
  const end = start + 0.12;
  const featureOpacity = useTransform(smoothProgress, [start, end, 0.7, 0.78], [0, 1, 1, 0]);
  const featureY = useTransform(smoothProgress, [start, end], [40, 0]);
  const featureScale = useTransform(smoothProgress, [start, end], [0.9, 1]);

  const Icon = feature.icon;

  return (
    <motion.div style={{ opacity: featureOpacity, y: featureY, scale: featureScale }}>
      <Link
        href={feature.href}
        className="feature-card-depth block rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] group"
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
          </div>
          <div className="text-right">
            <p className="text-lg sm:text-xl font-bold text-white">{feature.stat}</p>
            <p className="text-[8px] sm:text-[9px] uppercase tracking-wider text-blue-200/40">{feature.statLabel}</p>
          </div>
        </div>
        <h3 className="text-xs sm:text-sm font-semibold text-white mb-1">{feature.title}</h3>
        <p className="text-[10px] sm:text-xs text-blue-100/40 leading-relaxed">{feature.description}</p>
      </Link>
    </motion.div>
  );
}

export default function LandingPage() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const [shaderReady, setShaderReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShaderReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Phase 1: Hero fades
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.15], [1, 1.1]);
  const heroBlur = useTransform(smoothProgress, [0, 0.15], [0, 15]);
  const heroBlurFilter = useTransform(heroBlur, (v) => `blur(${v}px)`);
  const gridOpacity = useTransform(smoothProgress, [0, 0.12], [0.4, 0]);

  // Phase 2+6: Card rises and exits
  const cardY = useTransform(smoothProgress, [0, 0.05, 0.3, 0.85, 1], ["110%", "110%", "0%", "0%", "-110%"]);
  const cardScale = useTransform(smoothProgress, [0.05, 0.25, 0.4, 0.75, 0.85], [0.85, 0.85, 1, 1, 0.85]);
  const cardRadius = useTransform(smoothProgress, [0.25, 0.4, 0.75, 0.85], [40, 0, 0, 40]);

  // Phase 5: Card content
  const contentOpacity = useTransform(smoothProgress, [0.38, 0.5, 0.7, 0.78], [0, 1, 1, 0]);
  const contentY = useTransform(smoothProgress, [0.38, 0.5], [40, 0]);

  // Phase 6: CTA
  const ctaOpacity = useTransform(smoothProgress, [0.78, 0.88], [0, 1]);
  const ctaScale = useTransform(smoothProgress, [0.78, 0.88], [0.8, 1]);
  const ctaBlur = useTransform(smoothProgress, [0.78, 0.88], [30, 0]);
  const ctaBlurFilter = useTransform(ctaBlur, (v) => `blur(${v}px)`);
  const ctaPointerEvents = useTransform(ctaOpacity, (v) => (v > 0.5 ? "auto" : "none"));

  // Mouse sheen (desktop only)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        }
      });
    };
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={sectionRef} style={{ height: "700vh" }}>
      <div
        className="relative w-full bg-zinc-950 text-white"
        style={{
          position: "sticky",
          top: 0,
          height: "100dvh",
          overflow: "hidden",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: CARD_STYLES }} />

        {/* Grid background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: gridOpacity,
            backgroundSize: "60px 60px",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
            maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          }}
        />

        {/* UNDO SHADER: Remove this div to revert hero shader */}
        {shaderReady && (
          <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ opacity: heroOpacity }}>
            <ShaderLines />
          </motion.div>
        )}

        {/* Hero text — responsive sizing with clamp */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
          style={{ opacity: heroOpacity, scale: heroScale, filter: heroBlurFilter }}
        >
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-zinc-300 mb-4 sm:mb-6 font-semibold">
            College Prep Suite
          </p>
          <h1
            className="font-[family-name:var(--font-display)] tracking-tight mb-2 sm:mb-3 text-white leading-[1]"
            style={{ fontSize: "clamp(2.4rem, 8vw, 7rem)" }}
          >
            Your edge in
          </h1>
          <h1
            className="font-[family-name:var(--font-display)] tracking-tight text-white leading-[1] italic"
            style={{ fontSize: "clamp(2.4rem, 8vw, 7rem)" }}
          >
            college admissions.
          </h1>
        </motion.div>

        {/* UNDO SHADER: Remove this div to revert CTA shader */}
        {shaderReady && (
          <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ opacity: ctaOpacity }}>
            <ShaderLines />
          </motion.div>
        )}

        {/* CTA — responsive */}
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
            className="font-[family-name:var(--font-display)] mb-4 sm:mb-6 tracking-tight text-white leading-[1]"
            style={{ fontSize: "clamp(2rem, 7vw, 5rem)" }}
          >
            Start building your profile.
          </h2>
          <p className="text-zinc-300 text-sm sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-xl mx-auto font-light leading-relaxed px-2">
            Grade your essays, calculate your GPA, evaluate your extracurriculars, and find your
            best-fit schools — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/essay"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.98]"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <User className="w-4 h-4" /> My Profile
            </Link>
          </div>
        </motion.div>

        {/* Deep blue card */}
        <div
          className="absolute top-0 left-0 w-full h-full z-20 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            ref={cardRef}
            className="premium-depth-card relative overflow-hidden flex items-center justify-center pointer-events-auto w-full h-full"
            style={{
              y: cardY,
              scale: cardScale,
              borderRadius: cardRadius,
            }}
          >
            <div className="card-sheen hidden sm:block" aria-hidden="true" />

            <motion.div
              className="relative w-full h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col justify-center z-10 overflow-y-auto"
              style={{ opacity: contentOpacity, y: contentY }}
            >
              <div className="text-center mb-6 sm:mb-10">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-blue-300/60 font-semibold mb-2 sm:mb-3">
                  AdmitEdge
                </p>
                <h2
                  className="font-bold tracking-tight text-white mb-3 sm:mb-4"
                  style={{ fontSize: "clamp(1.5rem, 5vw, 3rem)" }}
                >
                  Everything you need.
                </h2>
                <p className="text-blue-100/50 text-xs sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed hidden sm:block">
                  Five integrated tools that share data automatically. Your GPA fills into your
                  college list. Your essay score adjusts your chances. Everything connects.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
                {FEATURES.map((feature, i) => (
                  <FeatureCard
                    key={feature.href}
                    feature={feature}
                    index={i}
                    smoothProgress={smoothProgress}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
