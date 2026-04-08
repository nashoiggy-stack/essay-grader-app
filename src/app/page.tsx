"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

// Lazy-load shader to avoid blocking first paint
const ShaderLines = dynamic(
  () => import("@/components/ui/shader-lines").then((m) => ({ default: m.ShaderLines })),
  { ssr: false }
);
import { PenLine, Calculator, ClipboardList, School, BarChart3, ArrowRight, User } from "lucide-react";

const FEATURES = [
  { href: "/essay", icon: PenLine, title: "Essay Grader", description: "Grade your Common App essay with 7 criteria + VSPICE rubric. Inline suggestions and coaching chat.", stat: "7+V", statLabel: "Criteria" },
  { href: "/gpa", icon: Calculator, title: "GPA Calculator", description: "Calculate weighted and unweighted GPA across high school and college scales. Auto-fills into other tools.", stat: "4", statLabel: "Scales" },
  { href: "/extracurriculars", icon: ClipboardList, title: "EC Evaluator", description: "Describe your activities in conversation. Get tier ratings, profile analysis, and spike detection.", stat: "4", statLabel: "Tiers" },
  { href: "/colleges", icon: School, title: "College List", description: "Build a balanced list across 5 tiers filtered by your academic profile.", stat: "80+", statLabel: "Schools" },
  { href: "/chances", icon: BarChart3, title: "Chance Calculator", description: "Estimate admission chances at any school. Pulls your GPA, essay, and EC scores automatically.", stat: "5", statLabel: "Bands" },
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
        className="feature-card-depth block rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <Icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">{feature.stat}</p>
            <p className="text-[9px] uppercase tracking-wider text-blue-200/40">{feature.statLabel}</p>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-white mb-1.5">{feature.title}</h3>
        <p className="text-xs text-blue-100/40 leading-relaxed">{feature.description}</p>
      </Link>
    </motion.div>
  );
}

export default function LandingPage() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const [shaderReady, setShaderReady] = useState(false);

  // Delay shader mount to avoid blocking first paint
  useEffect(() => {
    const timer = setTimeout(() => setShaderReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Scroll tracking
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Phase 1: Hero fades (0 to 0.15)
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.15], [1, 1.1]);
  const heroBlur = useTransform(smoothProgress, [0, 0.15], [0, 15]);
  const heroBlurFilter = useTransform(heroBlur, (v) => `blur(${v}px)`);
  const gridOpacity = useTransform(smoothProgress, [0, 0.12], [0.4, 0]);

  // Phase 2 + 6: Card rises from below (0.05 to 0.3), exits up (0.85 to 1)
  const cardY = useTransform(
    smoothProgress,
    [0, 0.05, 0.3, 0.85, 1],
    ["110%", "110%", "0%", "0%", "-110%"]
  );

  // Phase 3: Card expands via scale (0.25 to 0.4), shrinks before exit (0.75 to 0.85)
  const cardScale = useTransform(
    smoothProgress,
    [0.05, 0.25, 0.4, 0.75, 0.85],
    [0.85, 0.85, 1, 1, 0.85]
  );
  const cardRadius = useTransform(
    smoothProgress,
    [0.25, 0.4, 0.75, 0.85],
    [40, 0, 0, 40]
  );

  // Phase 5: Card content header
  const contentOpacity = useTransform(smoothProgress, [0.38, 0.5, 0.7, 0.78], [0, 1, 1, 0]);
  const contentY = useTransform(smoothProgress, [0.38, 0.5], [40, 0]);

  // Phase 6: CTA appears (0.78 to 0.88)
  const ctaOpacity = useTransform(smoothProgress, [0.78, 0.88], [0, 1]);
  const ctaScale = useTransform(smoothProgress, [0.78, 0.88], [0.8, 1]);
  const ctaBlur = useTransform(smoothProgress, [0.78, 0.88], [30, 0]);
  const ctaBlurFilter = useTransform(ctaBlur, (v) => `blur(${v}px)`);
  const ctaPointerEvents = useTransform(ctaOpacity, (v) => (v > 0.5 ? "auto" : "none"));

  // Mouse sheen on card
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
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={sectionRef} style={{ height: "700vh" }}>
      <div
        className="relative w-screen bg-zinc-950 text-white"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          perspective: "1500px",
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

        {/* Hero text — visible on first paint at opacity 1, fades via scroll */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4"
          style={{ opacity: heroOpacity, scale: heroScale, filter: heroBlurFilter }}
        >
          <p className="text-xs uppercase tracking-[0.5em] text-zinc-500 mb-6 font-semibold">
            College Prep Suite
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-3 text-white">
            Your edge in
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white">
            college admissions.
          </h1>
        </motion.div>

        {/* UNDO SHADER: Remove this div to revert CTA shader */}
        {shaderReady && (
          <motion.div className="absolute inset-0 z-[1] pointer-events-none" style={{ opacity: ctaOpacity }}>
            <ShaderLines />
          </motion.div>
        )}

        {/* CTA — starts at opacity 0, appears via scroll */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4"
          style={{
            opacity: ctaOpacity,
            scale: ctaScale,
            filter: ctaBlurFilter,
            pointerEvents: ctaPointerEvents,
          }}
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-white">
            Start building your profile.
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
            Grade your essays, calculate your GPA, evaluate your extracurriculars, and find your
            best-fit schools — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/essay"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.98]"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <User className="w-4 h-4" /> My Profile
            </Link>
          </div>
        </motion.div>

        {/* Deep blue card — starts off-screen at translateY(110%), rises via scroll */}
        <div
          className="absolute top-0 left-0 w-full h-full z-20 flex items-center justify-center pointer-events-none"
          style={{ perspective: "1500px" }}
        >
          <motion.div
            ref={cardRef}
            className="premium-depth-card relative overflow-hidden flex items-center justify-center pointer-events-auto"
            style={{
              y: cardY,
              scale: cardScale,
              borderRadius: cardRadius,
              width: "100vw",
              height: "100vh",
            }}
          >
            <div className="card-sheen" aria-hidden="true" />

            <motion.div
              className="relative w-full h-full max-w-6xl mx-auto px-6 lg:px-12 flex flex-col justify-center z-10"
              style={{ opacity: contentOpacity, y: contentY }}
            >
              <div className="text-center mb-10">
                <p className="text-xs uppercase tracking-[0.4em] text-blue-300/60 font-semibold mb-3">
                  AdmitEdge
                </p>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                  Everything you need.
                </h2>
                <p className="text-blue-100/50 text-base md:text-lg max-w-2xl mx-auto">
                  Five integrated tools that share data automatically. Your GPA fills into your
                  college list. Your essay score adjusts your chances. Everything connects.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
