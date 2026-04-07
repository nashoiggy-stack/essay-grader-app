"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useAuthContext } from "./AuthProvider";

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthContext();
  const pathname = usePathname();

  // Landing page is public — no auth required
  if (pathname === "/") return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060f]">
        <div className="h-6 w-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return <>{children}</>;
};

function LoginScreen() {
  const { signIn, signUp, error } = useAuthContext();
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
    } else {
      const msg = await signUp(email, password);
      if (msg) {
        setSuccessMsg(msg);
        setMode("signin");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06060f] relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm mx-4"
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
  );
}
