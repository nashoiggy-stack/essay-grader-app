import { createClient } from "@supabase/supabase-js";

// Browser-safe client. Reads from public env vars so the publishable key
// can be rotated without code changes / redeploys. Both vars must be
// inlined at build time (NEXT_PUBLIC_ prefix) — Next.js does this
// automatically.
//
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is the new (sb_publishable_...) key
// that replaced the legacy anon JWT. Same role (browser-safe, RLS-gated),
// different format. Issued under Supabase dashboard → Settings → API keys.
//
// We do NOT throw at module load if env is missing — Next.js imports this
// during page-data collection at build time, before runtime env is fully
// resolved on some hosting setups. Construct the client with whatever's
// there; if env is genuinely missing at runtime, Supabase requests will
// fail with an "Invalid API key" error from the network layer, which is a
// clear enough signal. Console-warn when constructed empty so the issue
// surfaces in dev too.
// Build-time fallbacks: createClient throws on empty URL at module load,
// which would break Next.js page-data collection during builds where env
// isn't yet available. Use obviously-broken placeholders so build proceeds
// and any actual Supabase request fails loudly at runtime with a network
// error from Supabase itself (which is a clearer signal than a build crash).
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

if (
  typeof window !== "undefined" &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
) {
  console.warn(
    "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (values from " +
      "Supabase dashboard → Settings → API keys).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
