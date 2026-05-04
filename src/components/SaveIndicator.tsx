"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2 } from "lucide-react";

type IndicatorState = "idle" | "saving" | "saved" | "error";

const SAVED_HOLD_MS = 1500;

export const SaveIndicator: React.FC = () => {
  const [state, setState] = useState<IndicatorState>("idle");
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearFade = () => {
      if (fadeTimer.current) {
        clearTimeout(fadeTimer.current);
        fadeTimer.current = null;
      }
    };

    const onSaving = () => {
      clearFade();
      setState("saving");
    };
    const onSaved = () => {
      clearFade();
      setState("saved");
      fadeTimer.current = setTimeout(() => setState("idle"), SAVED_HOLD_MS);
    };
    const onError = () => {
      clearFade();
      setState("error");
      fadeTimer.current = setTimeout(() => setState("idle"), SAVED_HOLD_MS * 2);
    };

    window.addEventListener("cloud-sync-saving", onSaving);
    window.addEventListener("cloud-sync-saved", onSaved);
    window.addEventListener("cloud-sync-error", onError);
    return () => {
      window.removeEventListener("cloud-sync-saving", onSaving);
      window.removeEventListener("cloud-sync-saved", onSaved);
      window.removeEventListener("cloud-sync-error", onError);
      clearFade();
    };
  }, []);

  // BackgroundPicker (phase 06) sits at bottom-4 right-4. Stack this above it.
  // bottom uses max() with env(safe-area-inset-bottom) so the indicator
  // clears the iOS home-indicator bar (otherwise it sits behind it).
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 z-40 pointer-events-none"
      style={{ bottom: "max(5rem, calc(5rem + env(safe-area-inset-bottom)))" }}
    >
      <AnimatePresence>
        {state !== "idle" && (
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0c0c1a]/95 border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-300 shadow-black/40 backdrop-blur"
          >
            {state === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-text" />
                <span>Saving…</span>
              </>
            )}
            {state === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
                <span>Saved</span>
              </>
            )}
            {state === "error" && (
              <span className="text-amber-300">Save failed — will retry</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
