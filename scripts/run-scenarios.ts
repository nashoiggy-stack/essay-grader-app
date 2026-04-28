/**
 * run-scenarios.ts
 *
 * Manual verification harness. Loads each scenario JSON in
 * tests/school-data-scenarios/, builds an in-memory feeder-school record,
 * runs computeAdmissionChance both with and without the blend, and prints
 * actual vs expected.
 *
 * Usage:
 *   tsx scripts/run-scenarios.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COLLEGES } from "../src/data/colleges";
import { computeAdmissionChance } from "../src/lib/admissions";
import {
  _setSchoolDataOverrideForTesting,
  toCollegeSlug,
  type SchoolDataRecord,
} from "../src/lib/school-data";
import type { ApplicationPlan } from "../src/lib/college-types";

interface Scenario {
  name: string;
  user: {
    gpaUW: number | null;
    gpaW: number | null;
    sat: number | null;
    act: number | null;
    rigor: "low" | "medium" | "high";
    ecBand: string;
    essayCommonApp: string;
    essayVspice: string;
    applicationPlan: ApplicationPlan;
  };
  college: string;
  syntheticHistory: {
    appType: string;
    totalApplicants: number;
    admits: number;
    denies: number;
    waitlists: number;
    admittedAvgGpaW: number;
    admittedAvgSat: number;
    admittedSdSat: number | null;
  };
  expected: {
    shiftDirection: "up" | "down" | "none";
    minShiftPct: number;
    maxShiftPct: number;
    scatterplotPosition: string;
    noteIncludes?: string;
  };
  rationale: string;
}

function buildSyntheticRecord(s: Scenario): SchoolDataRecord {
  const collegeName = s.college;
  const slug = toCollegeSlug(collegeName);
  const sample = s.syntheticHistory;

  // Synthesize raw points consistent with the aggregate. We don't need them to
  // be realistic — just enough that the scatterplot would render and the
  // record satisfies the SchoolDataRecord contract.
  // Build as mutable then expose as readonly to satisfy the record contract.
  type MutablePoint = {
    gpaWeighted: number | null;
    sat: number | null;
    act: number | null;
    outcome: "Accepted" | "Denied" | "Waitlisted";
    classYear: number;
  };
  const rawDataPoints: MutablePoint[] = [];
  for (let i = 0; i < sample.admits; i++) {
    rawDataPoints.push({
      gpaWeighted: sample.admittedAvgGpaW + (i % 3) * 0.05 - 0.05,
      sat: sample.admittedAvgSat + ((i % 5) - 2) * 10,
      act: 33,
      outcome: "Accepted",
      classYear: 2025 - (i % 4),
    });
  }
  for (let i = 0; i < sample.denies; i++) {
    rawDataPoints.push({
      gpaWeighted: 4.2 + (i % 3) * 0.1,
      sat: 1450 + ((i % 5) - 2) * 30,
      act: 33,
      outcome: "Denied",
      classYear: 2025 - (i % 4),
    });
  }
  for (let i = 0; i < sample.waitlists; i++) {
    rawDataPoints.push({
      gpaWeighted: 4.3,
      sat: 1480,
      act: 33,
      outcome: "Waitlisted",
      classYear: 2025,
    });
  }

  const sampleSizeLabel: "limited" | "moderate" | "strong" =
    sample.totalApplicants < 10 ? "limited" : sample.totalApplicants < 20 ? "moderate" : "strong";

  return {
    collegeName,
    collegeSlug: slug,
    appType: sample.appType,
    totalApplicants: sample.totalApplicants,
    totalAdmits: sample.admits,
    totalDenied: sample.denies,
    totalWaitlisted: sample.waitlists,
    schoolAdmitRate: sample.admits / sample.totalApplicants,
    admittedAvgGPA: sample.admits >= 2 ? sample.admittedAvgGpaW : null,
    admittedAvgSAT: sample.admits >= 2 ? sample.admittedAvgSat : null,
    admittedAvgACT: sample.admits >= 2 ? 33 : null,
    admittedGPARange: null,
    admittedSATRange: null,
    admittedStdGPA: sample.admits >= 2 ? 0.15 : null,
    admittedStdSAT: sample.admits >= 2 ? sample.admittedSdSat : null,
    rawDataPoints,
    sampleSizeLabel,
  };
}

function runScenario(s: Scenario): void {
  const college = COLLEGES.find((c) => c.name === s.college);
  if (!college) {
    console.error(`✘ ${s.name}: college "${s.college}" not in COLLEGES`);
    return;
  }

  // Pass 1: empty override → forces no blend so we get the true national chance
  // even when committed JSON has data for this college.
  _setSchoolDataOverrideForTesting({});
  const argsForCompute = {
    college,
    gpaUW: s.user.gpaUW,
    gpaW: s.user.gpaW,
    sat: s.user.sat,
    act: s.user.act,
    rigor: s.user.rigor,
    ecBand: s.user.ecBand,
    essayCA: parseFloat(s.user.essayCommonApp) || null,
    essayV: parseFloat(s.user.essayVspice) || null,
    apScores: [],
    applicationPlan: s.user.applicationPlan,
  };
  const national = computeAdmissionChance(argsForCompute);

  // Pass 2: with override → blended.
  const record = buildSyntheticRecord(s);
  _setSchoolDataOverrideForTesting({
    [record.collegeSlug]: { [record.appType]: record },
  });
  const blended = computeAdmissionChance(argsForCompute);
  _setSchoolDataOverrideForTesting(null);

  const nationalMid = national.chance.mid;
  const blendedMid = blended.chance.mid;
  const shift = blendedMid - nationalMid;
  const absShift = Math.abs(shift);

  const observedDirection: "up" | "down" | "none" =
    absShift < 1 ? "none" : shift > 0 ? "up" : "down";

  const directionOk = observedDirection === s.expected.shiftDirection;
  const magnitudeOk =
    absShift >= s.expected.minShiftPct && absShift <= s.expected.maxShiftPct;
  const noteOk = s.expected.noteIncludes
    ? blended.reason.toLowerCase().includes(s.expected.noteIncludes.toLowerCase()) ||
      blended.classification === "insufficient"
    : true;

  const pass = directionOk && magnitudeOk && noteOk;
  const flag = pass ? "✓" : "✘";
  console.log(`${flag} ${s.name}`);
  console.log(`  national=${nationalMid}%  blended=${blendedMid}%  shift=${shift.toFixed(1)}pp ` +
    `(expect ${s.expected.shiftDirection}, ${s.expected.minShiftPct}-${s.expected.maxShiftPct}pp)`);
  console.log(`  classification: ${national.classification} → ${blended.classification}`);
  console.log(`  reason: ${blended.reason}`);
  if (!pass) {
    if (!directionOk) console.log(`  FAIL: direction was ${observedDirection}, expected ${s.expected.shiftDirection}`);
    if (!magnitudeOk) console.log(`  FAIL: magnitude ${absShift.toFixed(1)}pp outside [${s.expected.minShiftPct}, ${s.expected.maxShiftPct}]`);
    if (!noteOk) console.log(`  FAIL: reason did not include "${s.expected.noteIncludes}"`);
  }
  console.log("");
}

function main(): void {
  const dir = join(process.cwd(), "tests", "school-data-scenarios");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  console.log(`Running ${files.length} scenarios from ${dir}\n`);
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    const s = JSON.parse(raw) as Scenario;
    runScenario(s);
  }
}

main();
