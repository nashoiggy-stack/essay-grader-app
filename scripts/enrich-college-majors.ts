/**
 * enrich-college-majors.ts
 *
 * LOCALHOST DEV ONLY. Enriches src/data/college-majors.json with LLM-derived
 * topMajors and knownFor for every school in COLLEGES. Resumable: re-running
 * picks up where it left off. Writes after every successful row, so killing
 * the process never loses prior progress.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npm run enrich:colleges
 *   ANTHROPIC_API_KEY=sk-... npm run enrich:colleges -- --dry-run
 *   ANTHROPIC_API_KEY=sk-... npm run enrich:colleges -- --only "Stanford University"
 *   ANTHROPIC_API_KEY=sk-... npm run enrich:colleges -- --only "MIT,Yale University"
 *   ANTHROPIC_API_KEY=sk-... npm run enrich:colleges -- --limit 10
 *
 * Cost (Sonnet 4.6, with prompt caching): ~$1.30 for ~430 colleges. The
 * 128-major allowlist + instructions are cached after the first call.
 *
 * Validation: zod schema-validates every response; on failure, retries ONCE
 * before logging + skipping. Per-row checks include allowlist filter on
 * topMajors (drops logged), confidence gate (<0.7 → needsReview = true),
 * curated cross-check, and breadth-rank advisory (rank>100 + topMajors>5).
 * Writes VALIDATION_REPORT.md (or VALIDATION_REPORT.dryrun.md) at end.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ANTHROPIC_MODEL } from "../src/lib/anthropic-model";
import { MAJORS } from "../src/lib/college-types";
import { COLLEGES } from "../src/data/colleges";
import type { College } from "../src/lib/college-types";

// ── Paths ──────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "src/data/college-majors.json");
const DRYRUN_PATH = path.join(ROOT, "src/data/college-majors.dryrun.json");
const REPORT_PATH = path.join(ROOT, "VALIDATION_REPORT.md");
const REPORT_DRYRUN_PATH = path.join(ROOT, "VALIDATION_REPORT.dryrun.md");

// ── Constants ──────────────────────────────────────────────────────────────

// 30s aborts a single school. No retry on timeout — logged + skipped per spec.
const REQUEST_TIMEOUT_MS = 30_000;
// 1 req/sec rate limit. Polite + completes ~430 schools in ~7 minutes.
const RATE_LIMIT_DELAY_MS = 1_000;
// First N schools' raw responses are echoed to stdout so the operator can
// kill the script early if outputs look off.
const FIRST_N_VERBOSE = 5;
// --dry-run cap. Independent file (DRYRUN_PATH) so it never pollutes the
// real resumable cache.
const DRY_RUN_MAX = 3;
// Bumping this invalidates any prior cache file. Bumped to 2 alongside
// the validation pipeline (needsReview, droppedMajors, warnings now part
// of every row).
const SCHEMA_VERSION = 2;
// Confidence below this triggers needsReview = true (excluded from runtime
// merge until cleared).
const CONFIDENCE_THRESHOLD = 0.7;
// Breadth-rank advisory threshold: low-rank schools claiming wide breadth
// is suspicious. Spec option (b): rank > 100 AND topMajors.length > 5.
const BREADTH_RANK_LIMIT = 100;
const BREADTH_MAJOR_COUNT = 5;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set. Add it to .env.local or your shell env and re-run.",
  );
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── CLI args ────────────────────────────────────────────────────────────────

interface CliOptions {
  readonly dryRun: boolean;
  readonly only: readonly string[] | null;
  readonly limit: number | null;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const dryRun = argv.includes("--dry-run");
  let only: readonly string[] | null = null;
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--only" && typeof value === "string") {
      only = value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    }
    if (flag === "--limit" && typeof value === "string") {
      const n = parseInt(value, 10);
      if (!Number.isNaN(n) && n > 0) limit = n;
    }
  }
  return { dryRun, only, limit };
}

// ── System prompt with allowlist (cached on first call) ────────────────────

// Spec: use MAJORS unchanged. Drop only the two non-major sentinels.
const ALLOWED_MAJORS = MAJORS.filter((m) => m !== "Any" && m !== "Undecided");

const SYSTEM_PROMPT = `You are enriching academic strength data for US universities. For the school given in the user message, return ONE JSON object describing its well-documented academic strengths.

Return ONLY JSON. No prose, no markdown fences, no preamble.

Schema:
{
  "topMajors": string[],   // 5-8 entries, max 8; fewer if unsure
  "knownFor": string[],    // 3-6 entries, max 6; fewer if unsure
  "confidence": number,    // 0.0-1.0, see calibration below
  "notes": string          // one sentence on what drove your confidence
}

RULES:

1. topMajors MUST be exact strings from this allowlist. Copy case-sensitive. Any other value is invalid and will be dropped:
${ALLOWED_MAJORS.map((m) => `  - ${m}`).join("\n")}

Pick majors the school is GENUINELY distinguished in — not every major it offers. If a school isn't clearly strong in more than 3 majors, return 3. Don't pad to hit 8.

2. knownFor entries are 2-5 word ACADEMIC descriptors: a sub-field, named program, research center, or pedagogical approach. Examples: "biomedical engineering research", "undergraduate research access", "open curriculum", "theoretical computer science". NOT location, NOT campus culture, NOT athletic reputation, NOT "prestigious" — those are covered elsewhere. Concrete programmatic strengths only.

3. confidence calibration:
   - 0.9-1.0: household-name school with broadly documented strengths (Stanford, MIT, Harvard, Berkeley)
   - 0.7-0.9: top-30 national university or LAC where published rankings + reputation align
   - 0.6-0.8: regional public or mid-tier private with published subject rankings and clear programmatic identity (e.g. Clemson, Ohio University, Santa Clara)
   - 0.5-0.7: some uncertainty; partial information available
   - <0.5: you aren't sure; RETURN FEWER ENTRIES rather than guessing

4. If you cannot identify the school or have no reliable information about its academic strengths, set confidence below 0.5 and return empty arrays. Do not invent.

5. notes field: one sentence explaining what you based this on ("widely documented CS/engineering powerhouse", "regional public with published rankings in business and education", "limited public information about program-level strengths").`;

// ── Zod schema for raw LLM response ────────────────────────────────────────
// The LLM is instructed to return exactly these four fields. zod enforces
// shape; the validation pipeline (allowlist filter, cross-checks, flags)
// runs separately on parsed-and-typed data.

const RawResponseSchema = z.object({
  topMajors: z.array(z.string()).max(20),
  knownFor: z.array(z.string()).max(12),
  confidence: z.number().min(0).max(1),
  notes: z.string(),
});

type RawResponse = z.infer<typeof RawResponseSchema>;

// ── Output file shape ──────────────────────────────────────────────────────
// Validation flags live alongside the raw LLM fields. needsReview is the
// only one that actually gates runtime use; droppedMajors and warnings are
// advisory artifacts surfaced in VALIDATION_REPORT.md for spot-checking.

interface SchoolEntry {
  readonly topMajors: string[];
  readonly knownFor: string[];
  readonly confidence: number;
  readonly notes: string;
  // Validation outputs:
  readonly needsReview: boolean;       // true → excluded from runtime merge
  readonly droppedMajors: string[];     // LLM entries not in MAJORS allowlist
  readonly warnings: string[];          // advisory: missing-curated, breadth-rank
}

interface OutputFile {
  schemaVersion: number;
  generatedAt: string;
  model: string;
  schools: Record<string, SchoolEntry>;
}

function blankOutput(): OutputFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    model: ANTHROPIC_MODEL,
    schools: {},
  };
}

async function loadCache(filePath: string): Promise<OutputFile> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as OutputFile;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      console.warn(
        `Cache schema version mismatch (got ${parsed.schemaVersion}, expected ${SCHEMA_VERSION}). Starting fresh.`,
      );
      return blankOutput();
    }
    if (!parsed.schools || typeof parsed.schools !== "object") {
      console.warn("Cache shape malformed; starting fresh.");
      return blankOutput();
    }
    return parsed;
  } catch {
    return blankOutput();
  }
}

// Atomic write via tmp file + rename. A crash mid-write leaves the previous
// file intact; a crash after rename leaves the new file intact. Never a
// half-written JSON file.
async function writeAtomic(filePath: string, data: OutputFile): Promise<void> {
  const tmp = `${filePath}.tmp`;
  data.generatedAt = new Date().toISOString();
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

// ── Anthropic call ──────────────────────────────────────────────────────────

interface CallResult {
  readonly rawText: string;
}

async function callForSchool(name: string): Promise<CallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const message = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: `School: ${name}` }],
      },
      { signal: controller.signal },
    );
    const textBlock = message.content.find((b) => b.type === "text");
    const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return { rawText };
  } finally {
    clearTimeout(timer);
  }
}

// ── Parse + zod validate ────────────────────────────────────────────────────

function parseRawResponse(raw: string): RawResponse | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const result = RawResponseSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

// ── Validation pipeline ────────────────────────────────────────────────────
// Runs on a successfully-parsed RawResponse. Applies:
//   1. Allowlist filter on topMajors (drops + log).
//   2. Confidence gate → needsReview.
//   3. Curated cross-check (advisory warning per missing curated entry).
//   4. Breadth-rank advisory (rank > 100 + topMajors.length > 5).

const ALLOWED_MAJORS_SET = new Set<string>(ALLOWED_MAJORS);

// Case-insensitive coverage check: does any LLM topMajors entry "cover" the
// curated term? Either equality or substring either direction (matches the
// runtime matcher's bestContainSpecificity semantics: covers exact, parent,
// and college-specific cases).
function coveredByLlm(curated: string, llmList: readonly string[]): boolean {
  const c = curated.toLowerCase();
  return llmList.some((l) => {
    const lo = l.toLowerCase();
    return lo === c || lo.includes(c) || c.includes(lo);
  });
}

interface ValidationOutcome {
  readonly entry: SchoolEntry;
  // Aggregate counters used by the report. Pass these straight into the
  // run-level totals.
  readonly droppedCount: number;
  readonly missingCuratedCount: number;
  readonly hadBreadthRank: boolean;
  readonly hadLowConfidence: boolean;
}

function validateAndEnrich(
  raw: RawResponse,
  college: College,
): ValidationOutcome {
  // 1. Allowlist filter on topMajors. We do NOT filter knownFor — those
  // are free-text descriptors by design.
  const accepted: string[] = [];
  const dropped: string[] = [];
  for (const m of raw.topMajors) {
    if (ALLOWED_MAJORS_SET.has(m)) {
      accepted.push(m);
    } else {
      dropped.push(m);
    }
  }

  // 2. Confidence gate.
  const lowConfidence = raw.confidence < CONFIDENCE_THRESHOLD;
  const needsReview = lowConfidence;

  // 3. Curated cross-check. If the school's hand-curated topMajors entries
  // are absent from the LLM output, log a per-term warning. Empty curated
  // list (rare) skips this check.
  const warnings: string[] = [];
  let missingCuratedCount = 0;
  const curated = college.topMajors ?? [];
  for (const cur of curated) {
    if (!coveredByLlm(cur, accepted)) {
      warnings.push(`missing-curated:${cur}`);
      missingCuratedCount++;
    }
  }

  // 4. Breadth-rank advisory (option b per spec). Does NOT set needsReview.
  const rank = college.usNewsRank;
  const hadBreadthRank =
    rank != null &&
    rank > BREADTH_RANK_LIMIT &&
    accepted.length > BREADTH_MAJOR_COUNT;
  if (hadBreadthRank) {
    warnings.push(
      `breadth-rank-mismatch:rank=${rank},topMajors=${accepted.length}`,
    );
  }

  return {
    entry: {
      topMajors: accepted,
      knownFor: raw.knownFor,
      confidence: raw.confidence,
      notes: raw.notes,
      needsReview,
      droppedMajors: dropped,
      warnings,
    },
    droppedCount: dropped.length,
    missingCuratedCount,
    hadBreadthRank,
    hadLowConfidence: lowConfidence,
  };
}

// ── Aggregated run stats (consumed by the validation report) ────────────────

interface RunStats {
  totalProcessed: number;
  totalCached: number;
  totalSucceeded: number;
  parseFailed: string[];
  timedOut: string[];
  errored: { name: string; error: string }[];
  allowlistDrops: { name: string; dropped: string[] }[];
  missingCurated: { name: string; missing: string[] }[];
  breadthRank: { name: string; rank: number; count: number }[];
  lowConfidence: { name: string; confidence: number }[];
  startedAt: string;
}

function blankStats(): RunStats {
  return {
    totalProcessed: 0,
    totalCached: 0,
    totalSucceeded: 0,
    parseFailed: [],
    timedOut: [],
    errored: [],
    allowlistDrops: [],
    missingCurated: [],
    breadthRank: [],
    lowConfidence: [],
    startedAt: new Date().toISOString(),
  };
}

// ── Markdown report ─────────────────────────────────────────────────────────

function renderReport(
  stats: RunStats,
  output: OutputFile,
  isDryRun: boolean,
): string {
  const totalSchools = Object.keys(output.schools).length;
  const lines: string[] = [];
  lines.push(`# College Majors Enrichment — Validation Report`);
  lines.push("");
  if (isDryRun) lines.push(`> **Dry-run output.** Not authoritative.`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Run started: ${stats.startedAt}`);
  lines.push(`- Model: ${output.model}`);
  lines.push(`- Schools in cache (this run + prior): ${totalSchools}`);
  lines.push(`- Schools processed THIS run: ${stats.totalProcessed}`);
  lines.push(`- Successfully written THIS run: ${stats.totalSucceeded}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Flag | Count |`);
  lines.push(`| --- | ---: |`);
  lines.push(
    `| Allowlist drops (topMajors entries not in MAJORS) | ${stats.allowlistDrops.reduce((sum, e) => sum + e.dropped.length, 0)} entries across ${stats.allowlistDrops.length} schools |`,
  );
  lines.push(
    `| Missing-curated warnings | ${stats.missingCurated.length} schools |`,
  );
  lines.push(
    `| Breadth-rank mismatches (advisory) | ${stats.breadthRank.length} schools |`,
  );
  lines.push(
    `| Low-confidence rows (\`needsReview: true\`, excluded from runtime merge) | ${stats.lowConfidence.length} schools |`,
  );
  lines.push(`| Parse failures | ${stats.parseFailed.length} |`);
  lines.push(`| Timeouts | ${stats.timedOut.length} |`);
  lines.push(`| Other errors | ${stats.errored.length} |`);
  lines.push("");

  // ── Allowlist drops ─────────────────────────────────────────────────────
  lines.push(`## Allowlist drops`);
  lines.push("");
  if (stats.allowlistDrops.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(
      `LLM returned topMajors entries not present in the MAJORS allowlist. These were silently filtered out before writing to the cache.`,
    );
    lines.push("");
    for (const item of stats.allowlistDrops) {
      lines.push(`- **${item.name}** — dropped: ${item.dropped.map((d) => `"${d}"`).join(", ")}`);
    }
  }
  lines.push("");

  // ── Missing-curated ─────────────────────────────────────────────────────
  lines.push(`## Missing-curated warnings`);
  lines.push("");
  if (stats.missingCurated.length === 0) {
    lines.push(`_None — every curated topMajor entry is covered by the LLM output for every school._`);
  } else {
    lines.push(
      `These schools have hand-curated topMajors entries that the LLM did NOT return. May indicate either (a) the LLM has a different (possibly better) view of the school's strengths, or (b) it invented a new profile entirely. Spot-check before trusting.`,
    );
    lines.push("");
    for (const item of stats.missingCurated) {
      lines.push(`- **${item.name}** — curated entries absent from LLM: ${item.missing.map((m) => `"${m}"`).join(", ")}`);
    }
  }
  lines.push("");

  // ── Breadth-rank ────────────────────────────────────────────────────────
  lines.push(`## Breadth-rank mismatches (advisory)`);
  lines.push("");
  if (stats.breadthRank.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(
      `Schools with US News rank > ${BREADTH_RANK_LIMIT} that returned > ${BREADTH_MAJOR_COUNT} topMajors. Advisory only — does NOT set needsReview. Could indicate over-claimed breadth.`,
    );
    lines.push("");
    for (const item of stats.breadthRank) {
      lines.push(`- **${item.name}** (rank ${item.rank}) — returned ${item.count} topMajors`);
    }
  }
  lines.push("");

  // ── Low-confidence ─────────────────────────────────────────────────────
  lines.push(`## Low-confidence rows (\`needsReview: true\`)`);
  lines.push("");
  if (stats.lowConfidence.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(
      `Confidence below ${CONFIDENCE_THRESHOLD}. These rows are EXCLUDED from runtime majorFitScore contributions until the \`needsReview\` flag is manually cleared in the JSON file.`,
    );
    lines.push("");
    for (const item of stats.lowConfidence) {
      lines.push(`- **${item.name}** — confidence ${item.confidence.toFixed(2)}`);
    }
  }
  lines.push("");

  // ── Parse failures / timeouts / errors ─────────────────────────────────
  lines.push(`## Parse failures`);
  lines.push("");
  if (stats.parseFailed.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(`Failed both initial call and one retry. Re-run the script to retry these (they aren't cached).`);
    lines.push("");
    for (const name of stats.parseFailed) lines.push(`- ${name}`);
  }
  lines.push("");

  lines.push(`## Timeouts`);
  lines.push("");
  if (stats.timedOut.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(`Aborted after ${REQUEST_TIMEOUT_MS}ms. Per spec: no in-script retry. Re-run to pick these up.`);
    lines.push("");
    for (const name of stats.timedOut) lines.push(`- ${name}`);
  }
  lines.push("");

  lines.push(`## Other errors`);
  lines.push("");
  if (stats.errored.length === 0) {
    lines.push(`_None._`);
  } else {
    for (const e of stats.errored) lines.push(`- **${e.name}** — ${e.error}`);
  }
  lines.push("");

  return lines.join("\n");
}

async function writeReport(
  reportPath: string,
  stats: RunStats,
  output: OutputFile,
  isDryRun: boolean,
): Promise<void> {
  const md = renderReport(stats, output, isDryRun);
  await fs.writeFile(reportPath, md, "utf-8");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  const targetPath = cli.dryRun ? DRYRUN_PATH : OUTPUT_PATH;

  // Resumable cache: skip schools already present in the target file.
  // Dry-run uses DRYRUN_PATH so it never affects the real cache.
  const output = await loadCache(targetPath);

  // Filter colleges based on CLI options.
  let colleges: typeof COLLEGES = COLLEGES;
  if (cli.only) {
    const set = new Set(cli.only);
    colleges = colleges.filter((c) => set.has(c.name));
    if (colleges.length === 0) {
      console.error(`No colleges matched --only filter: ${cli.only.join(", ")}`);
      process.exit(1);
    }
  }
  if (cli.dryRun) {
    colleges = colleges.slice(0, DRY_RUN_MAX);
    console.log(
      `[dry-run] Limiting to first ${colleges.length} school(s). Output → ${path.relative(ROOT, targetPath)}`,
    );
  } else if (cli.limit !== null) {
    colleges = colleges.slice(0, cli.limit);
  }

  const cachedCount = Object.keys(output.schools).length;
  const todo = colleges.filter((c) => !output.schools[c.name]);

  console.log(
    `Scope: ${colleges.length} | cached: ${cachedCount} | to process: ${todo.length}`,
  );
  console.log(`Model:  ${ANTHROPIC_MODEL}`);
  console.log(`Output: ${path.relative(ROOT, targetPath)}`);
  console.log("");

  if (todo.length === 0) {
    console.log("Nothing to do — all in-scope schools already cached.");
    return;
  }

  const stats = blankStats();
  stats.totalCached = cachedCount;

  for (const college of todo) {
    const startedAt = Date.now();
    try {
      // Initial call.
      let result = await callForSchool(college.name);

      // First-N raw responses to stdout for early sanity check.
      if (stats.totalProcessed < FIRST_N_VERBOSE) {
        console.log(
          `\n--- Raw response for "${college.name}" (sample ${stats.totalProcessed + 1}/${FIRST_N_VERBOSE}) ---`,
        );
        console.log(result.rawText);
        console.log(`--- end ---\n`);
      }

      let raw = parseRawResponse(result.rawText);

      // Retry-once on parse failure (per spec).
      if (!raw) {
        console.warn(
          `  ↻ ${college.name}: first response failed schema, retrying once…`,
        );
        result = await callForSchool(college.name);
        if (stats.totalProcessed < FIRST_N_VERBOSE) {
          console.log(
            `\n--- Retry raw response for "${college.name}" ---`,
          );
          console.log(result.rawText);
          console.log(`--- end ---\n`);
        }
        raw = parseRawResponse(result.rawText);
      }

      if (!raw) {
        stats.parseFailed.push(college.name);
        console.warn(
          `  ⚠ ${college.name}: failed schema validation after retry, skipping (re-run to retry — not cached).`,
        );
      } else {
        const outcome = validateAndEnrich(raw, college);
        output.schools[college.name] = outcome.entry;
        // Write after EVERY successful row.
        await writeAtomic(targetPath, output);
        stats.totalSucceeded++;

        // Roll up validation hits into run-level totals for the report.
        if (outcome.droppedCount > 0) {
          stats.allowlistDrops.push({
            name: college.name,
            dropped: outcome.entry.droppedMajors,
          });
        }
        if (outcome.missingCuratedCount > 0) {
          stats.missingCurated.push({
            name: college.name,
            missing: outcome.entry.warnings
              .filter((w) => w.startsWith("missing-curated:"))
              .map((w) => w.slice("missing-curated:".length)),
          });
        }
        if (outcome.hadBreadthRank && college.usNewsRank != null) {
          stats.breadthRank.push({
            name: college.name,
            rank: college.usNewsRank,
            count: outcome.entry.topMajors.length,
          });
        }
        if (outcome.hadLowConfidence) {
          stats.lowConfidence.push({
            name: college.name,
            confidence: outcome.entry.confidence,
          });
        }

        const conf = outcome.entry.confidence.toFixed(2);
        const flagBits: string[] = [];
        if (outcome.entry.needsReview) flagBits.push("needsReview");
        if (outcome.droppedCount > 0)
          flagBits.push(`dropped=${outcome.droppedCount}`);
        if (outcome.missingCuratedCount > 0)
          flagBits.push(`missingCurated=${outcome.missingCuratedCount}`);
        if (outcome.hadBreadthRank) flagBits.push("breadthRank");
        const flagStr = flagBits.length > 0 ? ` [${flagBits.join(", ")}]` : "";
        console.log(
          `  ✓ ${college.name} — ${outcome.entry.topMajors.length} majors, ${outcome.entry.knownFor.length} knownFor, conf ${conf}${flagStr}`,
        );
      }
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || /aborted|abort/i.test(err.message));
      if (isAbort) {
        stats.timedOut.push(college.name);
        console.warn(
          `  ⏱ ${college.name}: timed out after ${REQUEST_TIMEOUT_MS}ms, skipping (no retry per spec).`,
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errored.push({ name: college.name, error: msg });
        console.error(`  ✗ ${college.name}: ${msg}`);
      }
    }

    stats.totalProcessed++;

    // Rate limit: 1 req/sec, accounting for time already spent on the call.
    const elapsed = Date.now() - startedAt;
    const remaining = RATE_LIMIT_DELAY_MS - elapsed;
    if (remaining > 0 && stats.totalProcessed < todo.length) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  // Always write the report — even on a partial run, the operator wants
  // the spot-check artifact for whatever we did get through.
  const reportPath = cli.dryRun ? REPORT_DRYRUN_PATH : REPORT_PATH;
  await writeReport(reportPath, stats, output, cli.dryRun);

  console.log(`\nDone. Processed ${stats.totalProcessed} school(s).`);
  console.log(`  ✓ Succeeded: ${stats.totalSucceeded}`);
  if (stats.allowlistDrops.length > 0) {
    console.log(
      `  ⚐ Allowlist drops: ${stats.allowlistDrops.reduce((s, e) => s + e.dropped.length, 0)} entries across ${stats.allowlistDrops.length} schools`,
    );
  }
  if (stats.missingCurated.length > 0) {
    console.log(
      `  ⚐ Missing-curated warnings: ${stats.missingCurated.length} schools`,
    );
  }
  if (stats.breadthRank.length > 0) {
    console.log(
      `  ⚐ Breadth-rank advisories: ${stats.breadthRank.length} schools`,
    );
  }
  if (stats.lowConfidence.length > 0) {
    console.log(
      `  ⚐ Low-confidence (needsReview): ${stats.lowConfidence.length} schools`,
    );
  }
  if (stats.timedOut.length > 0) {
    console.log(`  ⏱ Timed out: ${stats.timedOut.length} (re-run to retry)`);
    for (const name of stats.timedOut) console.log(`     - ${name}`);
  }
  if (stats.parseFailed.length > 0) {
    console.log(`  ⚠ Parse failed (after retry): ${stats.parseFailed.length}`);
    for (const name of stats.parseFailed) console.log(`     - ${name}`);
  }
  if (stats.errored.length > 0) {
    console.log(`  ✗ Errored: ${stats.errored.length}`);
    for (const e of stats.errored) console.log(`     - ${e.name}: ${e.error}`);
  }
  console.log(`\nOutput:  ${path.relative(ROOT, targetPath)}`);
  console.log(`Report:  ${path.relative(ROOT, reportPath)}`);
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
