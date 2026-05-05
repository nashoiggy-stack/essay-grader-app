"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { AdmitEdgeLogo } from "@/components/AdmitEdgeLogo";

// Lands here from the Supabase recovery email. Supabase populates a
// recovery session on the URL hash, then `onAuthStateChange` fires
// with event === "PASSWORD_RECOVERY" so we know to render the
// "set new password" form.
//
// Public route — gated in AuthGate via PUBLIC_ROUTES.
export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword, error: ctxError } = useAuthContext();

  const [ready, setReady] = useState(false);
  const [recoveryDetected, setRecoveryDetected] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // Supabase's email link includes a recovery token in the URL hash
    // that the JS client picks up on first load. Subscribing to
    // onAuthStateChange catches the PASSWORD_RECOVERY event reliably.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryDetected(true);
        setReady(true);
      }
    });
    // Also check existing session in case the user was already in a
    // recovery state before the listener attached (race on slow boots).
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setRecoveryDetected(true);
      setReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isValid = password.length >= 6 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setLocalError("");
    const msg = await updatePassword(password);
    if (msg) {
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } else if (ctxError) {
      setLocalError(ctxError);
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-bg-base min-h-dvh w-full flex flex-col text-white">
      <div className="fixed top-4 left-4 z-20 flex items-center gap-2 md:left-1/2 md:-translate-x-1/2">
        <AdmitEdgeLogo size={28} />
        <h1 className="text-base font-bold">AdmitEdge</h1>
      </div>

      <div className="flex w-full flex-1 h-full items-center justify-center relative overflow-hidden px-4">
        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm p-4">
          {!ready && (
            <p className="text-sm text-text-muted">Verifying reset link…</p>
          )}

          {ready && !recoveryDetected && !success && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <p className="font-light text-3xl tracking-[-0.012em]">Link expired</p>
              <p className="text-sm text-text-muted leading-relaxed">
                This reset link is invalid or has already been used. Request a new one from the sign-in screen.
              </p>
              <Link
                href="/"
                className="text-sm text-accent-text hover:text-white transition-colors underline underline-offset-2"
              >
                Go to sign-in
              </Link>
            </div>
          )}

          {ready && recoveryDetected && !success && (
            <>
              <div className="w-full flex flex-col items-center gap-3 text-center">
                <p className="font-light text-3xl sm:text-4xl tracking-[-0.012em]">Set a new password</p>
                <p className="text-sm text-text-muted">Pick something at least 6 characters.</p>
              </div>

              {(localError || ctxError) && (
                <div className="w-full flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{localError || ctxError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="w-full space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden />
                  <input
                    type="password"
                    autoFocus
                    autoComplete="new-password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-9 pr-3 py-3 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-9 pr-3 py-3 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                  />
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-amber-300">Passwords don&rsquo;t match.</p>
                )}
                <button
                  type="submit"
                  disabled={!isValid || submitting}
                  className="w-full rounded-xl bg-white text-zinc-900 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}

          {success && (
            <div className="w-full flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="font-light text-3xl tracking-[-0.012em]">Password updated</p>
              <p className="text-sm text-text-muted">Taking you home…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
