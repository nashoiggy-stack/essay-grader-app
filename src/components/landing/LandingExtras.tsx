"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrow,
  IconPen,
  IconCalc,
  IconClipboard,
  IconResume,
  IconSchool,
  IconListGrade,
  IconChart,
  IconCompare,
  IconCompass,
  type ToolIconKey,
} from "@/app/dashboard/_atlas/icons";
import "./landing-extras.css";

interface ToolEntry {
  readonly id: ToolIconKey;
  readonly name: string;
  readonly desc: string;
  readonly href: string;
  readonly stat?: string;
  readonly statLabel?: string;
}

// Stats are only shown when we can verify them against the actual codebase.
// 7+V = 7 criteria + VSPICE rubric (Essay Grader)
// 5 bands = limited/developing/solid/strong/exceptional (EC Evaluator)
// 5 bands = very-low/low/possible/competitive/strong (Chances)
// 8 sections = basicInfo/education/awards/communityService/athletics/activities/summerExperience/skills (Resume)
// 100+ schools = ~111 entries in src/data/colleges.ts
const TOOLS: readonly ToolEntry[] = [
  { id: "essay",            name: "Essay Grader",   desc: "AI grading on 7 criteria + VSPICE rubric.",   href: "/essay",             stat: "7+V", statLabel: "Criteria" },
  { id: "gpa",              name: "GPA Calculator", desc: "Weighted, unweighted, with course rigor.",     href: "/gpa" },
  { id: "extracurriculars", name: "EC Evaluator",   desc: "Conversational tier-rated activity review.",   href: "/extracurriculars", stat: "5",   statLabel: "Bands" },
  { id: "resume",           name: "Resume Helper",  desc: "Common-App-format activities and resume.",     href: "/resume",            stat: "8",   statLabel: "Sections" },
  { id: "colleges",         name: "Colleges",       desc: "Browse 100+ schools and pin your candidates.",  href: "/colleges",          stat: "100+", statLabel: "Schools" },
  { id: "list",             name: "Your List",      desc: "Letter grade on tier balance, ED leverage, and major fit.", href: "/list",              stat: "A–F", statLabel: "Grade" },
  { id: "chances",          name: "Chances",        desc: "Admit estimates with location map.",           href: "/chances",           stat: "5",   statLabel: "Bands" },
  { id: "compare",          name: "Compare",        desc: "Schools side-by-side across key dimensions.",  href: "/compare" },
  { id: "strategy",         name: "Strategy",       desc: "AI consultant that builds your game plan.",    href: "/strategy" },
];

const TOOL_ICON_MAP: Record<ToolIconKey, (p: { size?: number }) => React.JSX.Element> = {
  essay: IconPen,
  gpa: IconCalc,
  extracurriculars: IconClipboard,
  resume: IconResume,
  colleges: IconSchool,
  list: IconListGrade,
  chances: IconChart,
  compare: IconCompare,
  strategy: IconCompass,
};

const STEPS = [
  {
    num: "01",
    title: "Build your profile once",
    desc: "Drop in your transcript, scores, activities, and goals. Every tool reads from the same profile so you fill nothing in twice.",
  },
  {
    num: "02",
    title: "Run the nine tools",
    desc: "Grade essays, model GPA, evaluate ECs, build a resume, browse colleges, grade your list, calculate chances, compare schools, and get a strategy.",
  },
  {
    num: "03",
    title: "Apply with the math behind it",
    desc: "Every recommendation is sourced — admit rates from CDS data, scores from VSPICE rubrics, fit from your declared major and stats.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is the AI grader actually useful, or is it just generic feedback?",
    a: "Every grade is anchored in a 7-criteria rubric and the VSPICE framework. You get a score per criterion and a concrete revision suggestion — not 'try to be more vivid.'",
  },
  {
    q: "Where does the admissions data come from?",
    a: "Admit rates, score ranges, and major-level data come from each school's published Common Data Set. Stored in the codebase and updated as new CDS data is published.",
  },
  {
    q: "What does the chances tool actually predict?",
    a: "It blends your stats (GPA, test scores, rigor, essay) with school-specific admit rates and adjusts for major selectivity where the school reports it. It's a model, not a guarantee.",
  },
  {
    q: "Do you read or train on my essays?",
    a: "No. Essay text is encrypted at rest, used only to grade, and never used to train models. You can clear your data at any time from the Profile page.",
  },
  {
    q: "Is this free to use right now?",
    a: "Yes — AdmitEdge is in early access and free while we're actively in development. Features may change as we learn from how students use them.",
  },
];

// Middle of the page: editorial sections that flow as normal scroll
// between the cinematic hero (sticky, fades out) and the cinematic CTA
// (sticky, fades in).
export function LandingMiddle() {
  return (
    <div className="lpx-root">
      <div className="lpx-bg" />
      <div className="lpx-bg-grid" />
      <div className="lpx-shell">
        <HowItWorks />
        <Tools />
        <FAQ />
      </div>
    </div>
  );
}

// Footer renders after the cinematic CTA scroll section ends.
export function LandingFooter() {
  return (
    <div className="lpx-root">
      <div className="lpx-shell">
        <Foot />
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="lpx-steps" id="how">
      <div className="lpx-container">
        <div className="lpx-eyebrow">How it works</div>
        <h2 className="lpx-section-title">
          Three steps. <em>One profile.</em>
          <br />
          Everything else compounds.
        </h2>
        <div className="lpx-steps-grid">
          {STEPS.map((s) => (
            <div className="lpx-step" key={s.num}>
              <div className="lpx-step-num">
                {s.num}
                <span>step</span>
              </div>
              <h3 className="lpx-step-title">{s.title}</h3>
              <p className="lpx-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tools() {
  return (
    <section className="lpx-tools" id="tools">
      <div className="lpx-container">
        <div className="lpx-tools-head">
          <div>
            <div className="lpx-eyebrow">The toolkit</div>
            <h2 className="lpx-section-title">
              Nine tools.
              <br />
              <em>One shared brain.</em>
            </h2>
          </div>
          <p className="lpx-section-desc">
            Most admissions apps are checklists. AdmitEdge is connected. Your
            essay score adjusts your chances. Your GPA fills your college list.
            Your activities feed your strategy.
          </p>
        </div>

        <div className="lpx-tools-grid">
          {TOOLS.map((t) => {
            const Ic = TOOL_ICON_MAP[t.id];
            return (
              <Link key={t.id} className="lpx-tool" href={t.href}>
                <div className="lpx-tool-head">
                  <div className="lpx-tool-icon"><Ic size={18} /></div>
                  {t.stat && (
                    <div className="lpx-tool-stat">
                      {t.stat}
                      {t.statLabel && (
                        <span className="lpx-tool-stat-lab">{t.statLabel}</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <div className="lpx-tool-name">{t.name}</div>
                  <div className="lpx-tool-desc">{t.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="lpx-tools-connect">
          <div className="lpx-tools-connect-eyebrow">{"// Why it matters"}</div>
          <div className="lpx-tools-connect-text">
            Update your <b>profile</b>. Your <b>tiers</b> shift, your{" "}
            <b>strategy</b> rewrites itself, your <b>action plan</b> reorders.
            One change, the whole picture moves.
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="lpx-faq" id="faq">
      <div className="lpx-container">
        <div className="lpx-faq-grid">
          <div>
            <div className="lpx-eyebrow">FAQ</div>
            <h2 className="lpx-section-title">
              Common questions.
              <br />
              <em>Direct answers.</em>
            </h2>
          </div>
          <div className="lpx-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div className={`lpx-faq-item ${open === i ? "open" : ""}`} key={item.q}>
                <button
                  type="button"
                  className="lpx-faq-q"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                >
                  <span>{item.q}</span>
                  <span className="lpx-faq-q-mark" aria-hidden="true">+</span>
                </button>
                <div className="lpx-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// CTA was moved back into page.tsx as a sticky scroll-driven section so
// the same cinematic fade-in matches the hero's fade-out.

function Foot() {
  return (
    <footer className="lpx-foot">
      <div className="lpx-container">
        <div className="lpx-foot-grid">
          <div>
            <div className="lpx-brand">
              <div className="lpx-brand-mark">A</div>
              <span className="lpx-brand-text">
                Admit<em>Edge</em>
              </span>
            </div>
            <p className="lpx-foot-blurb">
              Nine integrated college admissions tools. Sourced from the
              Common Data Set. Made for students who want to know, not guess.
            </p>
          </div>
          <div className="lpx-foot-col">
            <h4>Product</h4>
            <Link href="/essay">Essay Grader</Link>
            <Link href="/colleges">Colleges</Link>
            <Link href="/list">Your List</Link>
            <Link href="/chances">Chances</Link>
            <Link href="/strategy">Strategy</Link>
            <Link href="/compare">Compare</Link>
          </div>
          <div className="lpx-foot-col">
            <h4>Account</h4>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/gpa">GPA Calculator</Link>
            <Link href="/extracurriculars">EC Evaluator</Link>
            <Link href="/resume">Resume</Link>
          </div>
        </div>
        <div className="lpx-foot-bottom">
          <span>© {new Date().getFullYear()} AdmitEdge</span>
          <span>
            <a
              href="#top"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Back to top <IconArrow size={11} />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
