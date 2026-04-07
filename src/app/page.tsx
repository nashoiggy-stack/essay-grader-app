"use client";

import { motion } from "motion/react";
import { PenLine, Calculator, School, BarChart3 } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const timelineData = [
  {
    id: 1,
    title: "Essay Grader",
    date: "/essay",
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
    date: "/gpa",
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
    date: "/colleges",
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
    date: "/chances",
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
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Three.js shader background */}
      <div className="absolute inset-0 z-0">
        <ShaderAnimation />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Title positioned at the top of the orbital section */}
        <motion.div
          className="absolute top-12 left-0 right-0 z-20 text-center px-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="text-gradient">AdmitEdge</span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-lg mx-auto text-sm sm:text-base">
            Click a node to explore. Everything connects.
          </p>
        </motion.div>

        {/* Orbital timeline takes up the full viewport */}
        <RadialOrbitalTimeline timelineData={timelineData} />
      </div>
    </div>
  );
}
