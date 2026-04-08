"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PenLine, Calculator, ClipboardList, School, BarChart3, ArrowRight, User } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

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
    return () => { window.removeEventListener("mousemove", handleMouseMove); cancelAnimationFrame(requestRef.current); };
  }, []);

  // GSAP pinned scroll animation
  useEffect(() => {
    if (!containerRef.current) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // Card starts off-screen — GSAP makes it visible and positions it
      gsap.set(".scroll-card", { visibility: "visible", y: window.innerHeight + 200 });
      gsap.set([".card-content", ".card-feature"], { opacity: 0 });
      gsap.set(".scroll-cta", { opacity: 0, scale: 0.8, filter: "blur(30px)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=7000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl
        // Phase 1: Hero fades, card rises
        .to(".scroll-hero", { opacity: 0, scale: 1.1, filter: "blur(15px)", duration: 2 }, 0)
        .to(".scroll-grid", { opacity: 0, duration: 1.5 }, 0)
        .to(".scroll-card", { y: 0, duration: 2, ease: "power3.inOut" }, 0)
        // Phase 2: Card expands
        .to(".scroll-card", { width: "100%", height: "100%", borderRadius: "0px", duration: 1.5, ease: "power3.inOut" })
        // Phase 3: Features animate in
        .to(".card-content", { opacity: 1, y: 0, duration: 1, ease: "power3.out" })
        .to(".card-feature", { opacity: 1, y: 0, scale: 1, stagger: 0.2, duration: 1, ease: "back.out(1.2)" }, "-=0.5")
        // Phase 4: Hold
        .to({}, { duration: 3 })
        // Phase 5: Features exit, CTA appears
        .to([".card-content", ".card-feature"], { opacity: 0, y: -30, scale: 0.95, stagger: 0.05, duration: 1 })
        .to(".scroll-card", {
          width: isMobile ? "92vw" : "85vw",
          height: isMobile ? "92vh" : "85vh",
          borderRadius: isMobile ? "32px" : "40px",
          duration: 1.5,
          ease: "expo.inOut",
        }, "exit")
        .to(".scroll-cta", { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.5, ease: "expo.inOut" }, "exit")
        // Phase 6: Card exits up
        .to(".scroll-card", { y: -(window.innerHeight + 300), duration: 1.5, ease: "power3.in" });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white"
      style={{ perspective: "1500px" }}
    >
      <style dangerouslySetInnerHTML={{ __html: CARD_STYLES }} />

      {/* Grid background */}
      <div
        className="scroll-grid absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundSize: "60px 60px",
          backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
        }}
      />

      {/* Hero text — plain white, always visible, no GSAP hiding */}
      <div className="scroll-hero absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500 mb-6 font-semibold">College Prep Suite</p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-3 text-white">
          Your edge in
        </h1>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white">
          college admissions.
        </h1>
      </div>

      {/* CTA — starts hidden, GSAP fades it in */}
      <div className="scroll-cta absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-auto">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-white">
          Start building your profile.
        </h2>
        <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
          Grade your essays, calculate your GPA, evaluate your extracurriculars, and find your best-fit schools — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/essay" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.98]">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/profile" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10">
            <User className="w-4 h-4" /> My Profile
          </Link>
        </div>
      </div>

      {/* Deep blue card — starts hidden + off-screen via inline style */}
      <div className="absolute top-0 left-0 w-full h-full z-20 flex items-center justify-center pointer-events-none overflow-hidden" style={{ perspective: "1500px" }}>
        <div
          ref={cardRef}
          className="scroll-card premium-depth-card relative overflow-hidden flex items-center justify-center pointer-events-auto w-[92vw] md:w-[85vw] h-[92vh] md:h-[85vh] rounded-[32px] md:rounded-[40px]"
          style={{ visibility: "hidden" }}
        >
          <div className="card-sheen" aria-hidden="true" />

          <div className="card-content relative w-full h-full max-w-6xl mx-auto px-6 lg:px-12 flex flex-col justify-center z-10" style={{ opacity: 0, transform: "translateY(40px)" }}>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.4em] text-blue-300/60 font-semibold mb-3">AdmitEdge</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">Everything you need.</h2>
              <p className="text-blue-100/50 text-base md:text-lg max-w-2xl mx-auto">
                Five integrated tools that share data automatically. Your GPA fills into your college list. Your essay score adjusts your chances. Everything connects.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link
                    key={feature.href}
                    href={feature.href}
                    className="card-feature feature-card-depth rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] group"
                    style={{ opacity: 0, transform: "translateY(40px) scale(0.9)" }}
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
