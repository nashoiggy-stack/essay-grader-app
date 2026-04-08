"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { PenLine, Calculator, ClipboardList, School, BarChart3, ArrowRight, User } from "lucide-react";

const FEATURES = [
  { href: "/essay", icon: PenLine, title: "Essay Grader", description: "Grade your Common App essay with 7 criteria + VSPICE rubric. Inline suggestions and coaching chat.", stat: "7+V", statLabel: "Criteria" },
  { href: "/gpa", icon: Calculator, title: "GPA Calculator", description: "Calculate weighted and unweighted GPA across high school and college scales. Auto-fills into other tools.", stat: "4", statLabel: "Scales" },
  { href: "/extracurriculars", icon: ClipboardList, title: "EC Evaluator", description: "Describe your activities in conversation. Get tier ratings, profile analysis, and spike detection.", stat: "4", statLabel: "Tiers" },
  { href: "/colleges", icon: School, title: "College List", description: "Build a balanced list across 5 tiers filtered by your academic profile.", stat: "80+", statLabel: "Schools" },
  { href: "/chances", icon: BarChart3, title: "Chance Calculator", description: "Estimate admission chances at any school. Pulls your GPA, essay, and EC scores automatically.", stat: "5", statLabel: "Bands" },
];

export default function LandingPage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundSize: "60px 60px",
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
            maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10"
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

        <motion.div
          className="absolute bottom-10 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-5 h-8 rounded-full border-2 border-white/20 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-blue-400/60 font-semibold mb-3">AdmitEdge</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Everything you need.
            </h2>
            <p className="text-zinc-500 text-base md:text-lg max-w-2xl mx-auto">
              Five integrated tools that share data automatically. Your GPA fills into your college list.
              Your essay score adjusts your chances. Everything connects.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.href}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  <Link
                    href={feature.href}
                    className="block rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 group border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <Icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">{feature.stat}</p>
                        <p className="text-[9px] uppercase tracking-wider text-zinc-600">{feature.statLabel}</p>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">{feature.description}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-white">
            Start building your profile.
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
            Grade your essays, calculate your GPA, evaluate your extracurriculars, and find your best-fit schools — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/essay"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <User className="w-4 h-4" />
              My Profile
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
