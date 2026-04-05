"use client";

import { useState, useRef, useCallback } from "react";
import type { GradingResult, LineSuggestion } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function Home() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [essayText, setEssayText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setEssayText("");
    }
  }, []);

  // ── Grade ──────────────────────────────────────────────────────────────────
  const handleGrade = async () => {
    setError("");
    setResult(null);
    setChatMessages([]);

    const hasFile = file && file.size > 0;
    const hasText = essayText.trim().length > 0;

    if (!hasFile && !hasText) {
      setError("Please paste your essay or upload a PDF/Doc file.");
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (hasFile) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/grade", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: essayText }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data as GradingResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || !result) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          essayText: essayText || "(uploaded file)",
          gradingResult: result,
          history: chatMessages,
        }),
      });

      const data = await res.json();
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: data.reply || data.error },
      ]);
    } catch {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const scoreColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return "text-emerald-600";
    if (pct >= 0.6) return "text-blue-600";
    if (pct >= 0.4) return "text-amber-600";
    return "text-red-600";
  };

  const barWidth = (score: number, max: number) => `${(score / max) * 100}%`;

  const barColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return "bg-emerald-500";
    if (pct >= 0.6) return "bg-blue-500";
    if (pct >= 0.4) return "bg-amber-500";
    return "bg-red-500";
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Common App Essay Grader
        </h1>
        <p className="mt-2 text-gray-500">
          AI-powered grading across 7 Common App criteria + the VSPICE rubric.
          Built for high school juniors.
        </p>
      </div>

      {/* ── Input Card ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Paste your essay
        </label>
        <textarea
          className="w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
          rows={14}
          placeholder="Paste your Common App essay here..."
          value={essayText}
          onChange={(e) => {
            setEssayText(e.target.value);
            setFile(null);
          }}
        />

        {/* Drop zone */}
        <div
          className={`mt-3 flex items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setEssayText("");
              }
            }}
          />
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {file ? (
                <>
                  <span className="font-medium text-blue-600">{file.name}</span>{" "}
                  selected
                </>
              ) : (
                <>
                  <span className="font-medium text-blue-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop a PDF / Word doc
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-400">PDF, DOC, or DOCX</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleGrade}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Grading..." : "Grade Essay"}
          </button>
          <button
            onClick={() => {
              setEssayText("");
              setFile(null);
              setResult(null);
              setError("");
              setChatMessages([]);
            }}
            className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>

        {loading && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm text-blue-700 font-medium">
              Analyzing your essay with AI... This takes 10-20 seconds.
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </section>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && (
        <>
          {/* Overview */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Results Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Word Count"
                value={result.wordCount.toString()}
                sub={
                  result.wordCount >= 480 && result.wordCount <= 650
                    ? "Ideal range"
                    : result.wordCount < 480
                    ? "Below ideal (480-650)"
                    : "Above ideal (480-650)"
                }
                highlight={
                  result.wordCount >= 480 && result.wordCount <= 650
                }
              />
              <StatCard
                label="Raw Score"
                value={`${result.rawScore}/100`}
                sub="Common App average"
                highlight={result.rawScore >= 75}
              />
              <StatCard
                label="Adjusted Score"
                value={`${result.adjustedScore}/100`}
                sub={
                  result.wordCountPenalty > 0
                    ? `-${result.wordCountPenalty} word count penalty`
                    : "No penalty"
                }
                highlight={result.adjustedScore >= 75}
              />
              <StatCard
                label="VSPICE Composite"
                value={`${result.vspiceComposite}/4`}
                sub="Average of 6 dimensions"
                highlight={result.vspiceComposite >= 3}
              />
            </div>
          </section>

          {/* Common App Scores */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Common App Rubric{" "}
              <span className="text-sm font-normal text-gray-500">
                (1-100)
              </span>
            </h2>
            <div className="space-y-5">
              {Object.entries(result.commonApp).map(([name, c]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      {name}
                    </span>
                    <span
                      className={`text-sm font-bold ${scoreColor(c.score, 100)}`}
                    >
                      {c.score}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(c.score, 100)}`}
                      style={{ width: barWidth(c.score, 100) }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                    {c.feedback}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* VSPICE Scores */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              VSPICE Rubric{" "}
              <span className="text-sm font-normal text-gray-500">(1-4)</span>
            </h2>
            <div className="space-y-5">
              {Object.entries(result.vspice).map(([name, c]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      {name}
                    </span>
                    <span
                      className={`text-sm font-bold ${scoreColor(c.score, 4)}`}
                    >
                      {c.score}/4
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(c.score, 4)}`}
                      style={{ width: barWidth(c.score, 4) }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                    {c.feedback}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Bonuses & Pitfalls */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Bonus Signals
              </h3>
              {result.bonuses.length > 0 ? (
                <ul className="space-y-2">
                  {result.bonuses.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-0.5 text-emerald-500">+</span>
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">None detected.</p>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Pitfall Warnings
              </h3>
              {result.pitfalls.length > 0 ? (
                <ul className="space-y-2">
                  {result.pitfalls.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-0.5 text-red-500">!</span>
                      {p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">None detected.</p>
              )}
            </section>
          </div>

          {/* General Feedback */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Overall Feedback
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {result.generalFeedback}
            </p>
          </section>

          {/* Line-Specific Suggestions */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Line-Specific Suggestions
            </h3>
            {result.lineSuggestions.length > 0 ? (
              <div className="space-y-4">
                {result.lineSuggestions.map(
                  (ls: LineSuggestion, i: number) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-sm text-gray-500 italic mb-1">
                        &ldquo;{ls.line}&rdquo;
                      </p>
                      <p className="text-sm text-gray-800">{ls.suggestion}</p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No line-specific suggestions.
              </p>
            )}
          </section>

          {/* ── Chat Agent ────────────────────────────────────────────────────── */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Ask the Grading Coach
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Ask follow-up questions about your scores, specific criteria, or
              how to improve. Try: &quot;What should I fix first?&quot; or
              &quot;How do I raise my Insight score?&quot;
            </p>

            {/* Chat log */}
            <div className="mb-4 max-h-72 min-h-[120px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  No messages yet. Ask a question below.
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-100 text-blue-900 ml-8"
                      : "bg-white border border-gray-200 text-gray-800 mr-8"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 italic mr-8">
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="flex gap-2">
              <textarea
                className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Ask anything about your essay scores..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="self-end rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

// ── Stat Card Component ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-emerald-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
    </div>
  );
}
