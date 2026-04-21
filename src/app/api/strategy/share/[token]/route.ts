// GET    — public, no auth. Returns the snapshot if not revoked + not expired.
// DELETE — authenticated. Revokes the share by setting revoked_at = now().
//
// Next.js 16: route handlers with dynamic segments receive `context` with
// a Promise-wrapped `params`. Shape is:
//   { params: Promise<{ token: string }> }
// We `await` context.params before destructuring (breaking change from 15).

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly token: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token || typeof token !== "string" || token.length < 8) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from("strategy_shares")
    .select("snapshot, created_at, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Share not found." }, { status: 404 });
  }
  if (data.revoked_at) {
    return NextResponse.json({ error: "Share revoked." }, { status: 404 });
  }
  if (data.expires_at && data.expires_at < nowIso) {
    return NextResponse.json({ error: "Share expired." }, { status: 404 });
  }

  return NextResponse.json({
    snapshot: data.snapshot,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }
  const bearer = authHeader.slice("Bearer ".length);
  const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  // Only revoke if this share belongs to the caller. The admin client
  // bypasses RLS so we enforce ownership explicitly in the match clause.
  const { data, error } = await admin
    .from("strategy_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token)
    .eq("user_id", userData.user.id)
    .is("revoked_at", null)
    .select("token")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Revoke failed." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Share not found or already revoked." }, { status: 404 });
  }

  return NextResponse.json({ revoked: true });
}
