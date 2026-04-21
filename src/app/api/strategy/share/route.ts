// POST /api/strategy/share — generate (or return existing active) share link.
// GET  /api/strategy/share      — list owner's active share (used by the
//                                  popover to reuse an existing link).
//
// Auth: client sends `Authorization: Bearer <access_token>` from supabase-js.
// We validate via anon supabase.auth.getUser(token), then write with the
// admin client to bypass RLS (it also respects RLS via auth.uid() but the
// server doesn't carry the user's JWT, so admin is simpler).

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { StrategyShareSnapshot } from "@/lib/strategy-share-types";

export const runtime = "nodejs";
export const maxDuration = 30;

const SHARE_TTL_DAYS = 30;

function generateToken(): string {
  // 18 random bytes → 24-char base64url (no padding).
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  // Node 20+ supports toString("base64url"); fall back to manual url-safe.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function shareUrl(req: NextRequest, token: string): string {
  // Use the request's origin so the returned URL works on localhost:3000
  // and any future deployment host without hardcoding.
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}/strategy/share/${token}`;
}

async function requireUser(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }
  return { userId: data.user.id };
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  let body: { snapshot?: StrategyShareSnapshot };
  try {
    body = (await req.json()) as { snapshot?: StrategyShareSnapshot };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const snapshot = body.snapshot;
  if (!snapshot || !snapshot.result || !snapshot.analysis) {
    return NextResponse.json(
      { error: "Missing snapshot.result or snapshot.analysis." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Reuse an existing active (not revoked, not expired) share for this user.
  const { data: existing } = await admin
    .from("strategy_shares")
    .select("token, created_at, expires_at")
    .eq("user_id", auth.userId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      token: existing.token,
      url: shareUrl(req, existing.token),
      createdAt: existing.created_at,
      expiresAt: existing.expires_at,
    });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000).toISOString();

  const { data, error } = await admin
    .from("strategy_shares")
    .insert({
      user_id: auth.userId,
      token,
      snapshot,
      expires_at: expiresAt,
    })
    .select("token, created_at, expires_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `Failed to create share: ${error?.message ?? "unknown error"}.` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    token: data.token,
    url: shareUrl(req, data.token),
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data } = await admin
    .from("strategy_shares")
    .select("token, created_at, expires_at")
    .eq("user_id", auth.userId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ active: null });
  return NextResponse.json({
    active: {
      token: data.token,
      url: shareUrl(req, data.token),
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    },
  });
}
