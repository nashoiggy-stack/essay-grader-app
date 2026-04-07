"use client";

import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { AuroraBackground } from "@/components/AuroraBackground";

export default function GPAPage() {
  return (
    <AuroraBackground>
      <ContainerScroll
        titleComponent={
          <div className="mb-4">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-5">
              <span className="text-gradient">GPA Calculator</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed">
              Calculate your weighted and unweighted GPA across high school and college scales.
            </p>
          </div>
        }
      >
        {/* Mock GPA preview inside the 3D card */}
        <div className="h-full w-full bg-[#0a0a14] p-6 flex flex-col gap-4 overflow-hidden">
          {/* Mock GPA cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { school: "HIGH SCHOOL", type: "Weighted", value: "5.39", color: "text-indigo-400" },
              { school: "HIGH SCHOOL", type: "Unweighted", value: "4.20", color: "text-cyan-400" },
              { school: "COLLEGE", type: "Weighted", value: "4.76", color: "text-violet-400" },
              { school: "COLLEGE", type: "Unweighted", value: "4.00", color: "text-teal-400" },
            ].map((card) => (
              <div key={card.school + card.type} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{card.school}</p>
                <p className="text-[10px] text-zinc-500">{card.type}</p>
                <p className={`text-3xl font-bold font-mono mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Mock class rows */}
          <div className="flex-1 space-y-2 overflow-hidden">
            {[
              { name: "AP Calculus BC", grade: "A", level: "AP" },
              { name: "AP English Lang", grade: "A", level: "AP" },
              { name: "AP US History", grade: "A-", level: "AP" },
              { name: "Honors Chemistry", grade: "A", level: "Honors" },
              { name: "AP Computer Science", grade: "A+", level: "AP" },
              { name: "Spanish III", grade: "A", level: "CP" },
            ].map((cls) => (
              <div key={cls.name} className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                <span className="text-xs text-zinc-400">{cls.name}</span>
                <div className="flex gap-3">
                  <span className="text-xs text-emerald-400 font-mono">{cls.grade}</span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{cls.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ContainerScroll>

      {/* Actual GPA calculator iframe */}
      <div className="-mt-32">
        <iframe
          src="/gpa-calculator.html"
          className="w-full border-0"
          style={{ height: "calc(100vh - 56px)" }}
          title="GPA Calculator"
        />
      </div>
    </AuroraBackground>
  );
}
