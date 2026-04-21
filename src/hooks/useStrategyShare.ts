"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  StrategyShareSnapshot,
  StrategyShareRow,
} from "@/lib/strategy-share-types";

interface UseStrategyShareReturn {
  readonly active: StrategyShareRow | null;
  readonly loading: boolean;
  readonly error: string;
  readonly generate: (snapshot: StrategyShareSnapshot) => Promise<void>;
  readonly revoke: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

async function bearer(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function useStrategyShare(): UseStrategyShareReturn {
  const [active, setActive] = useState<StrategyShareRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    const token = await bearer();
    if (!token) {
      // Not signed in — shares require auth. Silent no-op.
      setActive(null);
      return;
    }
    try {
      const res = await fetch("/api/strategy/share", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { active: StrategyShareRow | null };
      setActive(data.active);
    } catch {
      // Silent — this is just the initial lookup.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(
    async (snapshot: StrategyShareSnapshot) => {
      setError("");
      setLoading(true);
      try {
        const token = await bearer();
        if (!token) {
          setError("Sign in to create a share link.");
          return;
        }
        const res = await fetch("/api/strategy/share", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ snapshot }),
        });
        const data = (await res.json()) as StrategyShareRow & { error?: string };
        if (!res.ok) {
          setError(data.error || `Failed to create share (${res.status}).`);
          return;
        }
        setActive({
          token: data.token,
          url: data.url,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const revoke = useCallback(async () => {
    if (!active) return;
    setError("");
    setLoading(true);
    try {
      const token = await bearer();
      if (!token) {
        setError("Sign in to revoke.");
        return;
      }
      const res = await fetch(`/api/strategy/share/${encodeURIComponent(active.token)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Revoke failed (${res.status}).`);
        return;
      }
      setActive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [active]);

  return { active, loading, error, generate, revoke, refresh };
}
