"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { PenLine, Calculator, School, BarChart3 } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const FEATURES = [
  {
    href: "/essay",
    title: "Essay Grader",
    description: "AI-powered scoring across 7 Common App criteria + VSPICE rubric with inline Grammarly-style suggestions.",
    icon: PenLine,
    color: "from-indigo-500 to-violet-500",
  },
  {
    href: "/gpa",
    title: "GPA Calculator",
    description: "Calculate weighted and unweighted GPA across high school and college recalculated scales.",
    icon: Calculator,
    color: "from-cyan-500 to-blue-500",
  },
  {
    href: "/colleges",
    title: "College List Builder",
    description: "Find your safety, likely, target, reach, and unlikely schools based on your academic profile.",
    icon: School,
    color: "from-emerald-500 to-teal-500",
  },
  {
    href: "/chances",
    title: "Chance Calculator",
    description: "Estimate your admission chances at any school with GPA, test scores, and holistic factors.",
    icon: BarChart3,
    color: "from-amber-500 to-orange-500",
  },
];

const timelineData = [
  {
    id: 1,
    title: "Essay Grader",
    date: "Step 1",
    content: "Grade your Common App essay with AI. Get scores across 7 criteria + VSPICE, inline suggestions, and a coaching chat.",
    category: "Writing",
    icon: PenLine,
    relatedIds: [4],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 2,
    title: "GPA Calculator",
    date: "Step 2",
    content: "Calculate your weighted and unweighted GPA. Auto-fills into the College List and Chance Calculator.",
    category: "Academics",
    icon: Calculator,
    relatedIds: [3, 4],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 3,
    title: "College List",
    date: "Step 3",
    content: "Build a balanced list of safety, likely, target, reach, and unlikely schools filtered by your preferences.",
    category: "Research",
    icon: School,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 75,
  },
  {
    id: 4,
    title: "Chances",
    date: "Step 4",
    content: "Estimate your admission chances at any school. Pulls your GPA and essay scores automatically.",
    category: "Strategy",
    icon: BarChart3,
    relatedIds: [1, 2, 3],
    status: "in-progress" as const,
    energy: 70,
  },
];

export default function LandingPage() {
  return (
    <AuroraBackground>
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="inline-block mb-6"
          >
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              Your complete college prep toolkit
            </span>
          </motion.div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
            <span className="text-gradient">College Prep</span>
          </h1>

          <p className="mt-6 text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed">
            Essay grading, GPA calculation, college list building, and admission chance estimation — all in one place.
          </p>

          <motion.div
            className="mt-10 flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/essay"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="rounded-xl px-6 py-3 text-sm font-semibold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.06] transition-all"
            >
              Explore Features
            </a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-16 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <span className="text-xs text-zinc-600 uppercase tracking-widest">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center p-1"
            >
              <motion.div className="w-1 h-2 rounded-full bg-indigo-500" animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Orbital Timeline */}
      <section className="relative">
        <RadialOrbitalTimeline timelineData={timelineData} />
      </section>

      {/* Feature Cards */}
      <section id="features" className="mx-auto max-w-5xl px-4 py-20">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="text-gradient">Everything you need</span>
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={feature.href} className="block group">
                <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all h-full">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-200 mb-2 group-hover:text-indigo-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="text-xs text-zinc-600">
          Built for high school juniors. Scores are estimates, not guarantees.
        </p>
      </footer>
    </AuroraBackground>
  );
}
