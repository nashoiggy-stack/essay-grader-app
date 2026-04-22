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
 * Validation pipeline (zod schema, allowlist drops, breadth-rank check,
 * VALIDATION_REPORT) is layered in by the next commit.
 */

import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ANTHROPIC_MODEL } from "../src/lib/anthropic-model";
import { MAJORS } from "../src/lib/college-types";
import { COLLEGES } from "../src/data/colleges";

// ── Paths ──────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "src/data/college-majors.json");
const DRYRUN_PATH = path.join(ROOT, "src/data/college-majors.dryrun.json");

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
// Bumping this invalidates any prior cache file. Keep at 1 for now.
const SCHEMA_VERSION = 1;

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

// ── Output file shape ──────────────────────────────────────────────────────
// Validation-layer fields (needsReview, droppedMajors, warnings) are added
// by the next commit. The file is forward-compatible: this script writes
// only the four base fields; future runs that introduce extras will be
// merged additively, not stripped.

interface SchoolEntry {
  readonly topMajors: string[];
  readonly knownFor: string[];
  readonly confidence: number;
  readonly notes: string;
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

// ── Loose JSON parse (validation pipeline lands in next commit) ────────────

function tryParseJson(raw: string): SchoolEntry | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "");
  }
  try {
    const parsed = JSON.parse(cleaned) as Partial<SchoolEntry>;
    if (
      Array.isArray(parsed.topMajors) &&
      Array.isArray(parsed.knownFor) &&
      typeof parsed.confidence === "number" &&
      typeof parsed.notes === "string"
    ) {
      return {
        topMajors: parsed.topMajors.filter(
          (s): s is string => typeof s === "string",
        ),
        knownFor: parsed.knownFor.filter(
          (s): s is string => typeof s === "string",
        ),
        confidence: parsed.confidence,
        notes: parsed.notes,
      };
    }
  } catch {
    return null;
  }
  return null;
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

  let processed = 0;
  const timedOut: string[] = [];
  const parseFailed: string[] = [];
  const errored: { name: string; error: string }[] = [];

  for (const college of todo) {
    const startedAt = Date.now();
    try {
      const result = await callForSchool(college.name);

      // First-N raw responses to stdout for early sanity check.
      if (processed < FIRST_N_VERBOSE) {
        console.log(
          `\n--- Raw response for "${college.name}" (sample ${processed + 1}/${FIRST_N_VERBOSE}) ---`,
        );
        console.log(result.rawText);
        console.log(`--- end ---\n`);
      }

      const entry = tryParseJson(result.rawText);
      if (!entry) {
        parseFailed.push(college.name);
        console.warn(`  ⚠ ${college.name}: failed to parse JSON, skipping.`);
      } else {
        output.schools[college.name] = entry;
        // Write after EVERY successful row — never batch.
        await writeAtomic(targetPath, output);
        const conf = entry.confidence.toFixed(2);
        console.log(
          `  ✓ ${college.name} — ${entry.topMajors.length} majors, ${entry.knownFor.length} knownFor, conf ${conf}`,
        );
      }
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || /aborted|abort/i.test(err.message));
      if (isAbort) {
        timedOut.push(college.name);
        console.warn(
          `  ⏱ ${college.name}: timed out after ${REQUEST_TIMEOUT_MS}ms, skipping (no retry per spec).`,
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        errored.push({ name: college.name, error: msg });
        console.error(`  ✗ ${college.name}: ${msg}`);
      }
    }

    processed++;

    // Rate limit: 1 req/sec, accounting for time already spent on the call.
    const elapsed = Date.now() - startedAt;
    const remaining = RATE_LIMIT_DELAY_MS - elapsed;
    if (remaining > 0 && processed < todo.length) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  console.log(`\nDone. Processed ${processed} school(s).`);
  if (timedOut.length > 0) {
    console.log(`  ⏱ Timed out: ${timedOut.length} (re-run to pick these up — they aren't cached)`);
    for (const name of timedOut) console.log(`     - ${name}`);
  }
  if (parseFailed.length > 0) {
    console.log(`  ⚠ Parse failed: ${parseFailed.length} (re-run to retry)`);
    for (const name of parseFailed) console.log(`     - ${name}`);
  }
  if (errored.length > 0) {
    console.log(`  ✗ Errored: ${errored.length}`);
    for (const e of errored) console.log(`     - ${e.name}: ${e.error}`);
  }
  console.log(`\nOutput saved to: ${path.relative(ROOT, targetPath)}`);
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
