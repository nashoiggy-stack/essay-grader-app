// Public read-only view of a shared strategy snapshot.
//
// Server Component — fetches the snapshot via the GET endpoint using the
// absolute origin so server-side fetch resolves. On 404 (missing, revoked,
// expired) we render a Not Found notice. No auth gate, no login prompt.

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { StrategyShareView } from "@/components/StrategyShareView";
import type { StrategyShareSnapshot } from "@/lib/strategy-share-types";

interface RouteProps {
  readonly params: Promise<{ readonly token: string }>;
}

interface ShareFetchResponse {
  readonly snapshot?: StrategyShareSnapshot;
  readonly expiresAt?: string;
  readonly error?: string;
}

async function fetchShare(
  token: string,
): Promise<{ snapshot: StrategyShareSnapshot; expiresAt: string } | null> {
  // Build an absolute URL from the request's headers so this works on
  // localhost and on any hosted env without hardcoding a domain.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return null;
  const base = `${proto}://${host}`;
  const res = await fetch(`${base}/api/strategy/share/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ShareFetchResponse;
  if (!data.snapshot || !data.expiresAt) return null;
  return { snapshot: data.snapshot, expiresAt: data.expiresAt };
}

export default async function StrategySharePage({ params }: RouteProps) {
  const { token } = await params;
  const share = await fetchShare(token);
  if (!share) notFound();

  return (
    <StrategyShareView snapshot={share.snapshot} expiresAt={share.expiresAt} />
  );
}

export const dynamic = "force-dynamic";
