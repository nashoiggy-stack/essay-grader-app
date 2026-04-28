"use client";

import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCollegePins } from "@/hooks/useCollegePins";
import { computeSATComposite, computeACTComposite } from "@/lib/profile-types";
import { COLLEGES } from "@/data/colleges";
import { classifyCollege } from "@/lib/admissions";
import { computeDeadlines, DEADLINE_DATES } from "@/lib/deadlines";
import type { ApplicationPlan, Classification, College } from "@/lib/college-types";
import type { ActionItem, ShortlistEntry, ToolStatus } from "./types";

const DESIGN_TIER: Record<Classification, ShortlistEntry["tier"] | null> = {
  unlikely: "unlikely",
  reach: "reach",
  target: "target",
  likely: "likely",
  safety: "safety",
  insufficient: null,
};

// O(1) lookup table — built once at module load instead of running
// COLLEGES.find on every render for every pinned school.
const COLLEGE_BY_NAME: Map<string, College> = new Map(
  COLLEGES.map((c) => [c.name, c]),
);

function fmtDate(d: Date | null, isRolling: boolean): string {
  if (isRolling) return "Rolling";
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function defaultPlan(c: College): ApplicationPlan {
  if (c.acceptanceRate < 20) return "EA";
  return "RD";
}

interface AtlasData {
  readonly loaded: boolean;
  readonly tools: readonly ToolStatus[];
  readonly actions: readonly ActionItem[];
  readonly shortlist: readonly ShortlistEntry[];
  readonly snapshot: {
    readonly gpaUW: string;
    readonly gpaW: string;
    readonly sat: string;
    readonly act: string;
    readonly satRW: string;
    readonly satMath: string;
    readonly apCount: number;
    readonly apFives: number;
    readonly apAvg: string;
    readonly rigor: string;
    readonly ecBand: string;
    readonly essay: string;
    readonly vspice: string;
  };
  readonly readiness: number;
  readonly completedCount: number;
  readonly inProgressCount: number;
  readonly studentName: string;
  readonly studentSchool: string;
  readonly studentGradYear: string;
  readonly studentMajor: string;
  readonly studentInterest: string;
}

export function useAtlasData(): AtlasData {
  const { profile, loaded: profileLoaded } = useProfile();
  const { pinned, loaded: pinsLoaded } = useCollegePins();

  // Today is read on mount so SSR/client match-stable enough for a 24h window.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(new Date());
  }, []);

  const sat = computeSATComposite(profile.sat);
  const act = computeACTComposite(profile.act);
  const apCount = profile.apScores.length;
  const apFives = profile.apScores.filter((a) => a.score === 5).length;
  const apAvg = apCount > 0
    ? (profile.apScores.reduce((s, a) => s + a.score, 0) / apCount).toFixed(1)
    : "—";

  const ecLabel = profile.ecBand
    ? profile.ecBand.charAt(0).toUpperCase() + profile.ecBand.slice(1)
    : "—";
  const rigorLabel = profile.rigor
    ? profile.rigor.charAt(0).toUpperCase() + profile.rigor.slice(1)
    : "Medium";

  const essayN = profile.essayCommonApp ? Number(profile.essayCommonApp) : null;
  const vspiceN = profile.essayVspice ? Number(profile.essayVspice) : null;

  // Hoisted: classify every pinned school exactly once per render. Both the
  // tools memo and the shortlist memo previously ran this same loop, doubling
  // the work on every render of the Profile page.
  const classifiedPins = useMemo(() => {
    const gpaUW = profile.gpaUW ? parseFloat(profile.gpaUW) : null;
    const gpaW = profile.gpaW ? parseFloat(profile.gpaW) : null;
    const ecBand = profile.ecBand || undefined;
    const rigor = profile.rigor;
    const distinguishedEC =
      profile.firstAuthorPublication === true ||
      profile.nationalCompetitionPlacement === true ||
      profile.founderWithUsers === true ||
      profile.selectiveProgram === true;
    return pinned
      .map((pin) => {
        const college = COLLEGE_BY_NAME.get(pin.name);
        if (!college) return null;
        const result = classifyCollege(college, gpaUW, gpaW, sat, act, essayN, vspiceN, {
          ecBand,
          distinguishedEC,
          rigor,
          apScores: profile.apScores,
        });
        return { pin, college, ...result };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [
    pinned, profile.gpaUW, profile.gpaW, profile.ecBand, profile.rigor,
    profile.apScores,
    profile.firstAuthorPublication, profile.nationalCompetitionPlacement,
    profile.founderWithUsers, profile.selectiveProgram,
    sat, act, essayN, vspiceN,
  ]);

  const tools = useMemo<ToolStatus[]>(() => {
    const pinCount = pinned.length;
    const classified = classifiedPins;

    const reaches = classified.filter((c) => c.classification === "reach" || c.classification === "unlikely").length;
    const targets = classified.filter((c) => c.classification === "target").length;
    const safeties = classified.filter((c) => c.classification === "safety" || c.classification === "likely").length;

    const medianChance = classified.length > 0
      ? Math.round(
          [...classified].sort((a, b) => a.chance.mid - b.chance.mid)[
            Math.floor(classified.length / 2)
          ].chance.mid,
        )
      : 0;
    const above50 = classified.filter((c) => c.chance.mid >= 50).length;

    const gpaW = profile.gpaW;
    const gpaUW = profile.gpaUW;

    const t: ToolStatus[] = [
      {
        id: "essay",
        label: "Essay",
        title: "Essay Grader",
        blurb: "Common App essay, 7-criteria + VSPICE",
        href: "/",
        state: essayN === null ? "untouched" : essayN >= 88 ? "complete" : "in-progress",
        metric: {
          value: essayN === null ? "—" : String(essayN),
          scale: essayN === null ? "" : "/100",
          caption: vspiceN !== null ? `VSPICE ${vspiceN.toFixed(1)} / 24` : "Not graded yet",
        },
        next: essayN === null
          ? "Grade your Common App essay to unlock chance estimates."
          : essayN < 88
          ? "Aim for 88+ on Reach schools — the third paragraph usually drives the score."
          : "Solid score. Re-run after each revision to track movement.",
        score: essayN === null ? 0 : Math.min(1, essayN / 100),
      },
      {
        id: "gpa",
        label: "GPA",
        title: "GPA Calculator",
        blurb: "Weighted + unweighted across HS scales",
        href: "/gpa",
        state: gpaUW || gpaW ? "complete" : "untouched",
        metric: {
          value: gpaW || gpaUW || "—",
          scale: gpaW ? "W" : gpaUW ? "UW" : "",
          caption: gpaW && gpaUW
            ? `${gpaUW} unweighted · rigor: ${rigorLabel}`
            : "Add courses to compute a weighted GPA.",
        },
        next: gpaUW || gpaW ? `Course rigor reads as ${rigorLabel}.` : "Add this semester's courses in the GPA calculator.",
        score: gpaUW || gpaW ? 1 : 0,
      },
      {
        id: "extracurriculars",
        label: "ECs",
        title: "EC Evaluator",
        blurb: "Conversational tier ratings",
        href: "/extracurriculars",
        state: profile.ecBand ? "complete" : "untouched",
        metric: {
          value: ecLabel,
          scale: "Band",
          caption: profile.ecBand
            ? "Auto-fills resume + chance estimates"
            : "Not evaluated yet",
        },
        next: profile.ecBand
          ? "Add hours-per-week to firm up the tier rating."
          : "Run the EC evaluator to translate activities into a tier.",
        score: profile.ecBand
          ? profile.ecBand === "exceptional" ? 1
          : profile.ecBand === "strong" ? 0.85
          : profile.ecBand === "solid" ? 0.7
          : profile.ecBand === "developing" ? 0.5
          : 0.3
          : 0,
      },
      {
        id: "resume",
        label: "Resume",
        title: "Resume Helper",
        blurb: "Common App-format activities builder",
        href: "/resume",
        // Resume completion is a soft signal — we don't store it here, so use
        // basicInfo presence as a proxy for "started".
        state: profile.basicInfo?.name ? "in-progress" : "untouched",
        metric: {
          value: profile.basicInfo?.name ? "Started" : "—",
          scale: "",
          caption: profile.basicInfo?.name
            ? "Personal info filled — pull activities from EC evaluator."
            : "Not started yet",
        },
        next: profile.basicInfo?.name
          ? "Pull activities from EC Evaluator to fill empty slots."
          : "Add basic info to start the activities builder.",
        score: profile.basicInfo?.name ? 0.4 : 0,
      },
      {
        id: "colleges",
        label: "Colleges",
        title: "College List",
        blurb: "5-tier list filtered by your profile",
        href: "/colleges",
        state: pinCount >= 6 ? "complete" : pinCount > 0 ? "in-progress" : "untouched",
        metric: {
          value: pinCount === 0 ? "—" : String(pinCount),
          scale: pinCount === 0 ? "" : "pinned",
          caption: pinCount === 0
            ? "Pin schools to start your list"
            : `${reaches} reach · ${targets} target · ${safeties} likely/safety`,
        },
        next: pinCount === 0
          ? "Browse the College List and pin a few schools that interest you."
          : pinCount < 6
          ? "Aim for 8–12 pinned schools across all four tiers."
          : "Solid spread. Compare a target vs. a reach to see what's actually different.",
        score: Math.min(1, pinCount / 10),
      },
      {
        id: "chances",
        label: "Chances",
        title: "Chances",
        blurb: "Admission estimates with location map",
        href: "/chances",
        state: classified.length === 0
          ? "untouched"
          : essayN === null
          ? "in-progress"
          : "complete",
        metric: {
          value: classified.length === 0 ? "—" : `${above50}/${classified.length}`,
          scale: classified.length === 0 ? "" : "≥50%",
          caption: classified.length === 0
            ? "Pin schools to compute chances"
            : `Median chance: ${medianChance}%`,
        },
        next: classified.length === 0
          ? "Pin colleges to estimate where you're competitive."
          : essayN === null
          ? "Grade your essay — chances move once an essay score is on file."
          : "Re-run chances after big profile changes (new score, new essay).",
        score: classified.length === 0 ? 0 : Math.min(1, classified.length / 10),
      },
      {
        id: "compare",
        label: "Compare",
        title: "Compare",
        blurb: "Side-by-side across 8 dimensions",
        href: "/compare",
        state: pinCount >= 2 ? "in-progress" : "untouched",
        metric: {
          value: pinCount >= 2 ? `${pinCount}` : "—",
          scale: pinCount >= 2 ? "ready" : "",
          caption: pinCount >= 2 ? "Tap any two pinned schools to compare" : "Pin 2+ schools to enable",
        },
        next: pinCount >= 2
          ? "Try comparing a target vs. a reach to see what changes the answer."
          : "Pin two schools to start comparing them side-by-side.",
        score: pinCount >= 2 ? 0.3 : 0,
      },
      {
        id: "strategy",
        label: "Strategy",
        title: "Strategy",
        blurb: "AI consultant reads your full profile",
        href: "/strategy",
        state: pinCount > 0 && (gpaUW || sat || essayN) ? "in-progress" : "untouched",
        metric: {
          value: pinCount > 0 ? "Ready" : "—",
          scale: pinCount > 0 ? "v1" : "",
          caption: pinCount > 0
            ? "Generates a holistic plan from your full profile"
            : "Add a school list to enable strategy",
        },
        next: pinCount > 0
          ? essayN !== null
            ? "Re-run after your next essay revision."
            : "Grade your essay first — strategy weighs writing heavily."
          : "Pin schools to unlock the strategy report.",
        score: pinCount > 0 ? 0.55 : 0,
      },
    ];

    return t;
  }, [classifiedPins, pinned.length, profile.gpaUW, profile.gpaW, profile.basicInfo, profile.ecBand, sat, essayN, vspiceN, ecLabel, rigorLabel]);

  const shortlist = useMemo<ShortlistEntry[]>(() => {
    const items: ShortlistEntry[] = [];
    for (const c of classifiedPins) {
      const tier = DESIGN_TIER[c.classification];
      if (!tier) continue;
      const plan = c.pin.applicationPlan ?? defaultPlan(c.college);
      const md = DEADLINE_DATES[plan];
      const date = md && today
        ? new Date(today.getFullYear() + (today.getMonth() > md.month - 1 ? 1 : 0), md.month - 1, md.day)
        : null;
      const isRolling = plan === "Rolling";
      items.push({
        name: c.college.name,
        location: c.college.state,
        tier,
        chance: c.chance.mid,
        plan,
        deadline: fmtDate(date, isRolling),
      });
    }
    items.sort((a, b) => a.chance - b.chance);
    return items;
  }, [classifiedPins, today]);

  const actions = useMemo<ActionItem[]>(() => {
    const out: ActionItem[] = [];

    // Earliest deadline → "Now" if within 30 days
    if (today) {
      const deadlines = computeDeadlines(pinned, today);
      const next = [...deadlines].filter((d) => !d.isRolling).sort((a, b) => a.daysAway - b.daysAway)[0];
      if (next && next.daysAway <= 60 && next.date) {
        out.push({
          severity: next.daysAway <= 30 ? "now" : "soon",
          title: `${next.schoolName} ${next.plan} deadline in ${next.daysAway} days`,
          detail: essayN !== null && essayN < 88
            ? `Essay grades ${essayN}/100. Aim 88+ for Reach schools — strongest single lever right now.`
            : `Lock in the application package: essay, activities, and counselor letter.`,
          cta: "Open Strategy",
          href: "/strategy",
        });
      }
    }

    if (essayN === null) {
      out.push({
        severity: "now",
        title: "Grade your Common App essay",
        detail: "Essay score unlocks accurate chance estimates and powers the strategy engine.",
        cta: "Open Essay",
        href: "/",
      });
    } else if (essayN < 88) {
      out.push({
        severity: "soon",
        title: `Push the essay from ${essayN} → 88+`,
        detail: "Reach schools are essay-driven. The next revision typically lifts 4–6 points.",
        cta: "Open Essay",
        href: "/",
      });
    }

    if (pinned.length === 0) {
      out.push({
        severity: "soon",
        title: "Pin a few colleges to start",
        detail: "The college list, chances, compare, and strategy all light up once you pin schools.",
        cta: "Open Colleges",
        href: "/colleges",
      });
    } else if (pinned.length < 4) {
      out.push({
        severity: "soon",
        title: `Add ${4 - pinned.length} more schools to your shortlist`,
        detail: "8–12 pinned schools across reach/target/safety gives the strategy engine room to work.",
        cta: "Open Colleges",
        href: "/colleges",
      });
    }

    if (!profile.ecBand) {
      out.push({
        severity: "later",
        title: "Run the EC Evaluator",
        detail: "It translates your activities into a band that auto-fills chance estimates and the strategy.",
        cta: "Open ECs",
        href: "/extracurriculars",
      });
    }

    if (pinned.length >= 2 && tools.find((t) => t.id === "compare")?.state === "untouched") {
      out.push({
        severity: "later",
        title: "Try Compare on two pinned schools",
        detail: "See where two schools actually differ — usually it's social scene or major depth, not rank.",
        cta: "Open Compare",
        href: "/compare",
      });
    }

    return out.slice(0, 4);
  }, [today, pinned, essayN, profile.ecBand, tools]);

  const completedCount = tools.filter((x) => x.state === "complete").length;
  const inProgressCount = tools.filter((x) => x.state === "in-progress").length;
  const readiness = Math.round((tools.reduce((s, x) => s + x.score, 0) / tools.length) * 100);

  return {
    loaded: profileLoaded && pinsLoaded,
    tools,
    actions,
    shortlist,
    snapshot: {
      gpaUW: profile.gpaUW || "—",
      gpaW: profile.gpaW || "—",
      sat: sat !== null ? String(sat) : "—",
      act: act !== null ? String(act) : "—",
      satRW: profile.sat.readingWriting || "—",
      satMath: profile.sat.math || "—",
      apCount,
      apFives,
      apAvg,
      rigor: rigorLabel,
      ecBand: ecLabel,
      essay: essayN !== null ? String(essayN) : "—",
      vspice: vspiceN !== null ? vspiceN.toFixed(1) : "—",
    },
    readiness,
    completedCount,
    inProgressCount,
    studentName: profile.basicInfo?.name || "",
    studentSchool: profile.basicInfo?.school || "",
    studentGradYear: profile.basicInfo?.graduationYear || "",
    studentMajor: profile.intendedMajor || "",
    studentInterest: profile.intendedInterest || "",
  };
}
