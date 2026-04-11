// ── Resume improve prompts ──────────────────────────────────────────────────

export type ResumeImproveMode = "activity" | "description";

const SHARED_RULES = `
HARD RULES:
- Do NOT fabricate facts, numbers, awards, or scope. Only work with what the student actually wrote.
- Preserve every concrete fact (numbers, dates, names, titles, quantities).
- If the student didn't mention a number, do NOT invent one.
- Use strong action verbs (led, built, launched, organized, designed, mentored, analyzed, presented, authored, founded, coordinated).
- Cut filler words and passive voice. Be direct.
- Keep it honest. A stronger sentence > an inflated one.
`;

export function buildResumeImprovePrompt(
  text: string,
  mode: ResumeImproveMode,
  maxChars?: number
): string {
  if (mode === "activity") {
    // Common App-style short activity entry
    const titleLimit = 50;
    const descLimit = maxChars ?? 150;
    return `You are helping a high school student write a Common App activity entry.

INPUT (student's description of the activity):
"""
${text}
"""

${SHARED_RULES}

TASK:
Produce two outputs:
1. "improved" — a polished activity description, max ${descLimit} characters. Focus on role + action + impact. Quantify only when the student gave numbers.
2. "shortVersion" — a very short activity title, max ${titleLimit} characters. Should read like a resume line (e.g. "President, Robotics Club").

Also return "changes" as a short array of 1-3 bullet strings explaining what you improved (e.g. "Stronger action verb", "Added role prefix", "Cut redundant phrase"). Do NOT include apologies or filler.

Return ONLY valid JSON matching this exact structure. No markdown fences.
{
  "improved": "string (max ${descLimit} chars)",
  "shortVersion": "string (max ${titleLimit} chars)",
  "changes": ["string", "string"]
}`;
  }

  // mode === "description" — longer free-form resume bullet
  const descLimit = maxChars ?? 300;
  return `You are helping a high school student polish a resume bullet or description.

INPUT:
"""
${text}
"""

${SHARED_RULES}

TASK:
Produce two outputs:
1. "improved" — a cleaner, stronger version of the description. Max ${descLimit} characters. Lead with an action verb when possible.
2. "shortVersion" — a compressed version suitable for a Common App activity description, max 150 characters.

Also return "changes" as a short array of 1-3 bullets explaining what you improved.

Return ONLY valid JSON matching this exact structure. No markdown fences.
{
  "improved": "string (max ${descLimit} chars)",
  "shortVersion": "string (max 150 chars)",
  "changes": ["string"]
}`;
}
