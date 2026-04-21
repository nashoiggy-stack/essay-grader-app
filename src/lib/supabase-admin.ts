// Server-only admin client for routes that need to bypass RLS.
//
// Used by /api/strategy/share/* — public GET reads any non-revoked,
// non-expired row by token without an auth context, and POST/DELETE
// validate the user via getUser(token) then write through this client.
//
// NEVER import this from client code. Next.js will throw at build time if
// the SUPABASE_SERVICE_ROLE_KEY is referenced from anything that ends up in
// a client bundle.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qspnraniadsleifzyfxb.supabase.co";

let cached: SupabaseClient | null = null;

/**
 * Lazily build the admin client so importing this module from somewhere
 * that doesn't actually call it (e.g. a route file with conditional logic)
 * doesn't crash on missing env. Throws when SUPABASE_SERVICE_ROLE_KEY is
 * unset at the moment of first use.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local — " +
        "value is in Supabase dashboard → Settings → API → service_role.",
    );
  }
  cached = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
