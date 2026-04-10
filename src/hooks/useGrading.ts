"use client";

import { useState, useRef } from "react";
import type { GradingResult } from "@/lib/types";
import { APP_CONFIG } from "@/data/mockData";

interface UseGradingReturn {
  readonly result: GradingResult | null;
  readonly loading: boolean;
  readonly error: string;
  readonly errorCode: string | null;
  readonly canRetry: boolean;
  readonly grade: (essayText: string, file: File | null) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly reset: () => void;
  readonly loadResult: (result: GradingResult) => void;
}

export function useGrading(): UseGradingReturn {
  const [result, setResult] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const lastArgsRef = useRef<{ essayText: string; file: File | null } | null>(null);

  const grade = async (essayText: string, file: File | null) => {
    setError("");
    setErrorCode(null);
    setResult(null);

    const hasFile = file && file.size > 0;
    const hasText = essayText.trim().length > 0;

    if (!hasFile && !hasText) {
      setError("Please paste your essay or upload a PDF/Doc file.");
      setErrorCode("EMPTY_INPUT");
      return;
    }

    lastArgsRef.current = { essayText, file };
    setLoading(true);

    try {
      let res: Response;

      if (hasFile) {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch(APP_CONFIG.gradeEndpoint, { method: "POST", body: fd });
      } else {
        res = await fetch(APP_CONFIG.gradeEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: essayText }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setErrorCode(`HTTP_${res.status}`);
        return;
      }

      setResult(data as GradingResult);

      // Save scores to localStorage so Chance Calculator can auto-fill essay strength
      try {
        localStorage.setItem("essay-grader-result", JSON.stringify({
          rawScore: (data as GradingResult).rawScore,
          vspiceComposite: (data as GradingResult).vspiceComposite,
        }));
      } catch {}
    } catch {
      setError("Network error. Please check your connection.");
      setErrorCode("NETWORK");
    } finally {
      setLoading(false);
    }
  };

  const retry = async () => {
    if (!lastArgsRef.current) return;
    const { essayText, file } = lastArgsRef.current;
    await grade(essayText, file);
  };

  const reset = () => {
    setResult(null);
    setError("");
    setErrorCode(null);
  };

  const loadResult = (savedResult: GradingResult) => {
    setResult(savedResult);
    setError("");
    setErrorCode(null);
  };

  return {
    result,
    loading,
    error,
    errorCode,
    canRetry: !!lastArgsRef.current && errorCode !== "EMPTY_INPUT",
    grade,
    retry,
    reset,
    loadResult,
  };
}
