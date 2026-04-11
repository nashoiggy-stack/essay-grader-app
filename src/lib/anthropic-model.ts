// Central Anthropic model ID so we can update it in one place if Anthropic
// renames the alias. Reads from env first, falls back to the same ID the
// rest of the app already uses.
//
// To switch models without a code change, set ANTHROPIC_MODEL in Vercel env.

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
