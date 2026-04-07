"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PenLine, Calculator, School, BarChart3 } from "lucide-react";

const STYLE_ID = "hero3-animations";

const getRootTheme = () => {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.getAttribute("data-theme") === "dark") return "dark";
  if (root.classList.contains("light")) return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
};

const useThemeSync = () => {
  const [theme, setTheme] = useState<"dark" | "light">(() => getRootTheme() as "dark" | "light");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => {
      const next = getRootTheme() as "dark" | "light";
      setTheme((prev) => (prev === next ? prev : next));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return [theme, setTheme] as const;
};

const DeckGlyph = ({ theme = "dark" }: { theme?: string }) => {
  const stroke = theme === "dark" ? "#f5f5f5" : "#111111";
  const fill = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(17,17,17,0.08)";

  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16" aria-hidden>
      <circle cx="60" cy="60" r="46" fill="none" stroke={stroke} strokeWidth="1.4"
        className="motion-safe:animate-[hero3-orbit_8.5s_linear_infinite]"
        style={{ strokeDasharray: "18 14" }} />
      <rect x="34" y="34" width="52" height="52" rx="14" fill={fill} stroke={stroke} strokeWidth="1.2"
        className="motion-safe:animate-[hero3-grid_5.4s_ease-in-out_infinite]" />
      <circle cx="60" cy="60" r="7" fill={stroke} />
      <path d="M60 30v10M60 80v10M30 60h10M80 60h10" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"
        className="motion-safe:animate-[hero3-pulse_6s_ease-in-out_infinite]" />
    </svg>
  );
};

const TOOLS = [
  { href: "/essay", title: "Essay Grader", icon: PenLine, description: "AI-powered Common App essay grading with 7 criteria + VSPICE rubric, inline suggestions, and coaching chat.", status: "Live" },
  { href: "/gpa", title: "GPA Calculator", icon: Calculator, description: "Calculate weighted and unweighted GPA across high school and college scales. Auto-fills into other tools.", status: "Live" },
  { href: "/colleges", title: "College List", icon: School, description: "Build a balanced list across 5 tiers — Safety, Likely, Target, Reach, Unlikely — filtered by your profile.", status: "Live" },
  { href: "/chances", title: "Chance Calculator", icon: BarChart3, description: "Estimate admission chances at any school. Pulls your GPA and essay scores automatically.", status: "Live" },
];

export default function HeroModernLanding() {
  const [theme, setTheme] = useThemeSync();
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.innerHTML = `
      @keyframes hero3-intro { 0% { opacity:0; transform:translate3d(0,64px,0) scale(.98); filter:blur(12px); } 60% { filter:blur(0); } 100% { opacity:1; transform:translate3d(0,0,0) scale(1); filter:blur(0); } }
      @keyframes hero3-card { 0% { opacity:0; transform:translate3d(0,32px,0) scale(.95); } 100% { opacity:1; transform:translate3d(0,0,0) scale(1); } }
      @keyframes hero3-orbit { 0% { stroke-dashoffset:0; transform:rotate(0deg); } 100% { stroke-dashoffset:-64; transform:rotate(360deg); } }
      @keyframes hero3-grid { 0%,100% { transform:rotate(-2deg); opacity:.7; } 50% { transform:rotate(2deg); opacity:1; } }
      @keyframes hero3-pulse { 0%,100% { stroke-dasharray:0 200; opacity:.2; } 45%,60% { stroke-dasharray:200 0; opacity:1; } }
      @keyframes hero3-glow { 0%,100% { opacity:.45; transform:translate3d(0,0,0); } 50% { opacity:.9; transform:translate3d(0,-8px,0); } }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  useEffect(() => {
    if (!sectionRef.current) { setVisible(true); return; }
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } }); },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const next = getRootTheme() === "dark" ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    root.setAttribute("data-theme", next);
    setTheme(next);
  };

  const palette = useMemo(() =>
    theme === "dark"
      ? {
          surface: "bg-black text-white",
          subtle: "text-white/60",
          border: "border-white/[0.12]",
          card: "bg-white/[0.06]",
          accent: "bg-white/[0.12]",
          glow: "rgba(255,255,255,0.14)",
          bg: { color: "#040404", layers: ["radial-gradient(ellipse 80% 60% at 10% -10%, rgba(255,255,255,0.15), transparent 60%)", "radial-gradient(ellipse 90% 70% at 90% -20%, rgba(120,120,120,0.12), transparent 70%)"], dots: "radial-gradient(circle at 25% 25%, rgba(250,250,250,0.08) 0.7px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(250,250,250,0.08) 0.7px, transparent 1px)" },
        }
      : {
          surface: "bg-white text-neutral-950",
          subtle: "text-neutral-600",
          border: "border-neutral-200/80",
          card: "bg-neutral-100/80",
          accent: "bg-neutral-100",
          glow: "rgba(17,17,17,0.08)",
          bg: { color: "#f5f5f4", layers: ["radial-gradient(ellipse 80% 60% at 10% -10%, rgba(15,15,15,0.12), transparent 60%)", "radial-gradient(ellipse 90% 70% at 90% -20%, rgba(15,15,15,0.08), transparent 70%)"], dots: "radial-gradient(circle at 25% 25%, rgba(17,17,17,0.12) 0.7px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(17,17,17,0.08) 0.7px, transparent 1px)" },
        },
  [theme]);

  const metrics = [
    { label: "Tools", value: "04" },
    { label: "Colleges", value: "80+" },
    { label: "Criteria", value: "7+V" },
  ];

  const setSpotlight = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--hero3-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--hero3-y", `${event.clientY - rect.top}px`);
  };
  const clearSpotlight = (event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.removeProperty("--hero3-x");
    event.currentTarget.style.removeProperty("--hero3-y");
  };

  return (
    <div className={`relative isolate min-h-screen w-full transition-colors duration-700 ${palette.surface}`}>
      <div className="pointer-events-none absolute inset-0 -z-30" style={{ backgroundColor: palette.bg.color, backgroundImage: palette.bg.layers.join(", "), backgroundRepeat: "no-repeat", backgroundSize: "cover" }} />
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-80" style={{ backgroundImage: palette.bg.dots, backgroundSize: "12px 12px", backgroundRepeat: "repeat" }} />
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: theme === "dark" ? "radial-gradient(60% 50% at 50% 10%, rgba(255,255,255,0.18), transparent 70%)" : "radial-gradient(60% 50% at 50% 10%, rgba(17,17,17,0.12), transparent 70%)", filter: "blur(22px)" }} />

      <section ref={sectionRef} className={`relative flex min-h-screen w-full flex-col gap-16 px-6 py-24 transition-opacity duration-700 md:gap-20 md:px-10 lg:px-16 xl:px-24 ${visible ? "motion-safe:animate-[hero3-intro_1s_cubic-bezier(.22,.68,0,1)_forwards]" : "opacity-0"}`}>
        {/* Header */}
        <header className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] ${palette.border} ${palette.accent}`}>
                College Prep Suite
              </span>
              <button type="button" onClick={toggleTheme} className={`rounded-full border px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] transition duration-500 ${palette.border}`}>
                {theme === "dark" ? "Light" : "Dark"} mode
              </button>
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                AdmitEdge: your command deck for college admissions.
              </h1>
              <p className={`max-w-2xl text-base md:text-lg ${palette.subtle}`}>
                Grade essays with AI, calculate your GPA, build a balanced college list, and estimate your admission chances — all in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className={`inline-flex flex-wrap gap-3 rounded-full border px-5 py-3 text-xs uppercase tracking-[0.3em] transition ${palette.border} ${palette.accent}`}>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  All tools live
                </span>
                <span className="opacity-60">∙</span>
                <span>AI-powered</span>
              </div>
              <div className={`flex divide-x divide-white/10 overflow-hidden rounded-full border text-xs uppercase tracking-[0.35em] ${palette.border}`}>
                {metrics.map((m) => (
                  <div key={m.label} className="flex flex-col px-5 py-3">
                    <span className={`text-[11px] ${palette.subtle}`}>{m.label}</span>
                    <span className="text-lg font-semibold tracking-tight">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mode card */}
          <div className={`relative flex flex-col gap-6 rounded-3xl border p-8 transition ${palette.border} ${palette.card}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em]">Platform</p>
                <h2 className="text-xl font-semibold tracking-tight">Integrated prep tools</h2>
              </div>
              <DeckGlyph theme={theme} />
            </div>
            <p className={`text-sm leading-relaxed ${palette.subtle}`}>
              Your GPA auto-fills into the college list and chance calculator. Essay scores feed into admission estimates. Everything connects.
            </p>
            <ul className="space-y-2 text-sm">
              {["GPA → College List → Chances", "Essay scores adjust fit calculations", "All data stored locally, works offline"].map((item) => (
                <li key={item} className={`flex items-start gap-3 ${palette.subtle}`}>
                  <span className="mt-1 h-2 w-2 rounded-full bg-current" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {/* Tool cards */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                onMouseMove={setSpotlight}
                onMouseLeave={clearSpotlight}
                className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-6 transition duration-500 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)] ${palette.border} ${palette.card}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" style={{ background: theme === "dark" ? "radial-gradient(190px circle at var(--hero3-x, 50%) var(--hero3-y, 50%), rgba(255,255,255,0.18), transparent 72%)" : "radial-gradient(190px circle at var(--hero3-x, 50%) var(--hero3-y, 50%), rgba(17,17,17,0.12), transparent 72%)" }} />
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-[0.35em] opacity-70">{tool.status}</span>
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">{tool.title}</h3>
                <p className={`text-sm leading-relaxed ${palette.subtle}`}>{tool.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { HeroModernLanding };
