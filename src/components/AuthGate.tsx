"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuthContext } from "./AuthProvider";
import { BackgroundPaths } from "./ui/background-paths";

const PUBLIC_ROUTES: string[] = [];

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, guest } = useAuthContext();
  const pathname = usePathname();

  // GPA calculator is public — no auth needed
  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060f]">
        <div className="h-6 w-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && !guest) return <LoginScreen />;

  return <>{children}</>;
};

function LoginScreen() {
  const { signIn, signUp, error, enterAsGuest } = useAuthContext();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password.length < 6) return;

    setSubmitting(true);
    setSuccessMsg("");

    if (mode === "signin") {
      await signIn(email, password);
      // After successful sign in, redirect to home
      router.push("/");
    } else {
      const msg = await signUp(email, password);
      if (msg) {
        setSuccessMsg(msg);
        setMode("signin");
      }
    }
    setSubmitting(false);
  };

  const handleGuest = () => {
    enterAsGuest();
    router.push("/");
  };

  return (
    <BackgroundPaths>
      <div className="flex items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="glass rounded-2xl p-8 ring-1 ring-white/[0.06]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4">
              <span className="text-white text-lg font-bold">CP</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {mode === "signin"
                ? "Sign in to access your college prep tools"
                : "Start tracking your GPA and essay scores"}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-sm text-emerald-400">{successMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? mode === "signin" ? "Signing in..." : "Creating account..."
                : mode === "signin" ? "Sign In" : "Create Account"
              }
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Guest button */}
          <button
            onClick={handleGuest}
            className="w-full rounded-xl py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] ring-1 ring-white/[0.06] transition-all"
          >
            Continue as Guest
          </button>

          {/* Toggle */}
          <p className="text-center text-sm text-zinc-500 mt-5">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setSuccessMsg(""); }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
      </div>
    </BackgroundPaths>
  );
}
