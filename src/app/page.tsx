"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GradingResult, LineSuggestion } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Tab = "common" | "vspice" | "feedback" | "lines" | "chat";

export default function Home() {
  const [essayText, setEssayText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("common");
  const [animatedScores, setAnimatedScores] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);

  // Animate scores when results appear
  useEffect(() => {
    if (result) {
      setAnimatedScores(false);
      const timer = setTimeout(() => setAnimatedScores(true), 100);
      return () => clearTimeout(timer);
    }
  }, [result]);

  // Scroll to results
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setEssayText("");
    }
  }, []);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const handleGrade = async () => {
    setError("");
    setResult(null);
    setChatMessages([]);
    setActiveTab("common");

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

  const scoreColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return { text: "text-emerald-400", bg: "bg-emerald-500", glow: "shadow-emerald-500/20" };
    if (pct >= 0.6) return { text: "text-blue-400", bg: "bg-blue-500", glow: "shadow-blue-500/20" };
    if (pct >= 0.4) return { text: "text-amber-400", bg: "bg-amber-500", glow: "shadow-amber-500/20" };
    return { text: "text-red-400", bg: "bg-red-500", glow: "shadow-red-500/20" };
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "common", label: "Common App", icon: "7" },
    { id: "vspice", label: "VSPICE", icon: "6" },
    { id: "feedback", label: "Feedback", icon: "!" },
    { id: "lines", label: "Line Notes", icon: "#" },
    { id: "chat", label: "Coach", icon: "?" },
  ];

  return (
    <div className="min-h-screen bg-mesh">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16 font-[family-name:var(--font-geist-sans)]">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Essay Grader</span>
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
            AI-powered scoring across 7 Common App criteria + VSPICE rubric.
            Built for high school juniors applying to top colleges.
          </p>
        </div>

        {/* ── Input Card ──────────────────────────────────────────────────── */}
        <section className="glass rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-zinc-300">
              Your essay
            </label>
            {essayText && (
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  wordCount >= 480 && wordCount <= 650
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {wordCount} words
                {wordCount >= 480 && wordCount <= 650
                  ? " — ideal"
                  : wordCount < 480
                  ? ` — ${480 - wordCount} short`
                  : ` — ${wordCount - 650} over`}
              </span>
            )}
          </div>

          <textarea
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none resize-y transition-all"
            rows={12}
            placeholder="Paste your Common App essay here..."
            value={essayText}
            onChange={(e) => {
              setEssayText(e.target.value);
              setFile(null);
            }}
          />

          {/* Drop zone */}
          <div
            className={`mt-4 flex items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all cursor-pointer ${
              dragging
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
                if (f) { setFile(f); setEssayText(""); }
              }}
            />
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                {file ? (
                  <>
                    <span className="font-medium text-indigo-400">{file.name}</span>{" "}
                    selected
                  </>
                ) : (
                  <>
                    <span className="font-medium text-indigo-400">Click to upload</span>{" "}
                    or drag & drop a PDF / Word doc
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleGrade}
              disabled={loading}
              className="group relative rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden"
            >
              <span className="relative z-10">
                {loading ? "Analyzing..." : "Grade Essay"}
              </span>
              {!loading && (
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            <button
              onClick={() => {
                setEssayText(""); setFile(null); setResult(null);
                setError(""); setChatMessages([]);
              }}
              className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
            >
              Clear
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-5 glass rounded-xl p-5 animate-pulse-glow">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <p className="text-sm text-indigo-300 font-medium">
                  Reading your essay like an Ivy League admissions officer...
                </p>
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full bg-indigo-500/50 rounded-full shimmer w-full" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </section>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && (
          <div ref={resultsRef} className="mt-8 space-y-6">
            {/* Score Overview */}
            <section className="glass rounded-2xl p-6 sm:p-8 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ScoreCard
                  label="Word Count"
                  value={result.wordCount}
                  suffix=""
                  sub={
                    result.wordCount >= 480 && result.wordCount <= 650
                      ? "Ideal range"
                      : result.wordCount < 480 ? "Below 480-650" : "Above 480-650"
                  }
                  color={
                    result.wordCount >= 480 && result.wordCount <= 650
                      ? "emerald" : "amber"
                  }
                  animated={animatedScores}
                />
                <ScoreCard
                  label="Raw Score"
                  value={result.rawScore}
                  suffix="/100"
                  sub="7-criteria average"
                  color={result.rawScore >= 75 ? "emerald" : result.rawScore >= 60 ? "blue" : "amber"}
                  animated={animatedScores}
                />
                <ScoreCard
                  label="Adjusted"
                  value={result.adjustedScore}
                  suffix="/100"
                  sub={
                    result.wordCountPenalty > 0
                      ? `-${result.wordCountPenalty} penalty`
                      : "No penalty"
                  }
                  color={result.adjustedScore >= 75 ? "emerald" : result.adjustedScore >= 60 ? "blue" : "amber"}
                  animated={animatedScores}
                />
                <ScoreCard
                  label="VSPICE"
                  value={result.vspiceComposite}
                  suffix="/4"
                  sub="6-dim composite"
                  color={result.vspiceComposite >= 3 ? "emerald" : result.vspiceComposite >= 2 ? "blue" : "amber"}
                  animated={animatedScores}
                />
              </div>
            </section>

            {/* Tab Navigation */}
            <div className="glass rounded-2xl overflow-hidden" style={{ animationDelay: "0.1s" }}>
              <nav className="flex border-b border-white/[0.06] overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-indigo-400 tab-active"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span className={`text-xs font-mono w-5 h-5 rounded flex items-center justify-center ${
                      activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.05] text-zinc-500"
                    }`}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="p-6 sm:p-8">
                {/* Common App Tab */}
                {activeTab === "common" && (
                  <div className="space-y-6">
                    {Object.entries(result.commonApp).map(([name, c], i) => {
                      const colors = scoreColor(c.score, 100);
                      return (
                        <div
                          key={name}
                          className="animate-fade-in"
                          style={{ animationDelay: `${i * 0.08}s` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-zinc-200">{name}</span>
                            <span className={`text-lg font-bold font-mono ${colors.text} animate-count`}
                              style={{ animationDelay: `${i * 0.08 + 0.3}s` }}>
                              {c.score}
                              <span className="text-xs text-zinc-500">/100</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className={`h-full rounded-full score-bar-fill ${colors.bg}`}
                              style={{ width: animatedScores ? `${c.score}%` : "0%" }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{c.feedback}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* VSPICE Tab */}
                {activeTab === "vspice" && (
                  <div className="space-y-6">
                    {Object.entries(result.vspice).map(([name, c], i) => {
                      const colors = scoreColor(c.score, 4);
                      return (
                        <div
                          key={name}
                          className="animate-fade-in"
                          style={{ animationDelay: `${i * 0.08}s` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-zinc-200">{name}</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((level) => (
                                <div
                                  key={level}
                                  className={`w-8 h-2 rounded-full transition-all duration-700 ${
                                    level <= c.score ? colors.bg : "bg-white/[0.05]"
                                  }`}
                                  style={{ transitionDelay: animatedScores ? `${i * 80 + level * 150}ms` : "0ms" }}
                                />
                              ))}
                              <span className={`ml-2 text-sm font-bold font-mono ${colors.text}`}>
                                {c.score}/4
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{c.feedback}</p>
                        </div>
                      );
                    })}

                    {/* Bonuses & Pitfalls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/[0.06]">
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-400 mb-3">Bonus Signals</h4>
                        {result.bonuses.length > 0 ? (
                          <ul className="space-y-2">
                            {result.bonuses.map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                <span className="text-emerald-400 mt-0.5">+</span>{b}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-zinc-600">None detected</p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-red-400 mb-3">Pitfall Warnings</h4>
                        {result.pitfalls.length > 0 ? (
                          <ul className="space-y-2">
                            {result.pitfalls.map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                <span className="text-red-400 mt-0.5">!</span>{p}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-zinc-600">None detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback Tab */}
                {activeTab === "feedback" && (
                  <div className="animate-fade-in">
                    <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-5 mb-6">
                      <h4 className="text-sm font-semibold text-indigo-400 mb-2">Overall Assessment</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{result.generalFeedback}</p>
                    </div>

                    {/* Score summary grid */}
                    <h4 className="text-sm font-semibold text-zinc-300 mb-3">Score Breakdown</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(result.commonApp).map(([name, c]) => {
                        const colors = scoreColor(c.score, 100);
                        return (
                          <button
                            key={name}
                            onClick={() => setActiveTab("common")}
                            className="glass glass-hover rounded-lg p-3 text-left transition-all group cursor-pointer"
                          >
                            <p className="text-xs text-zinc-500 truncate">{name}</p>
                            <p className={`text-lg font-bold font-mono ${colors.text}`}>{c.score}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Line Notes Tab */}
                {activeTab === "lines" && (
                  <div className="space-y-4">
                    {result.lineSuggestions.length > 0 ? (
                      result.lineSuggestions.map((ls: LineSuggestion, i: number) => (
                        <div
                          key={i}
                          className="glass rounded-xl p-4 animate-fade-in"
                          style={{ animationDelay: `${i * 0.06}s` }}
                        >
                          <p className="text-sm text-zinc-500 italic border-l-2 border-violet-500/30 pl-3 mb-2">
                            &ldquo;{ls.line}&rdquo;
                          </p>
                          <p className="text-sm text-zinc-300 pl-3">{ls.suggestion}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-600 text-center py-8">
                        No line-specific suggestions
                      </p>
                    )}
                  </div>
                )}

                {/* Chat Tab */}
                {activeTab === "chat" && (
                  <div className="animate-fade-in">
                    <p className="text-sm text-zinc-500 mb-4">
                      Ask follow-up questions about your scores or how to improve.
                      Try: &quot;What should I fix first?&quot;
                    </p>

                    <div className="mb-4 max-h-80 min-h-[140px] overflow-y-auto rounded-xl bg-black/20 border border-white/[0.04] p-4 space-y-3">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-zinc-600 text-sm">No messages yet</p>
                          <div className="flex flex-wrap justify-center gap-2 mt-3">
                            {["What's my weakest area?", "How do I improve Insight?", "Rewrite my opening"].map((q) => (
                              <button
                                key={q}
                                onClick={() => { setChatInput(q); }}
                                className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-indigo-500/10 text-indigo-200 ml-12"
                              : "bg-white/[0.03] border border-white/[0.06] text-zinc-300 mr-12"
                          }`}
                        >
                          {msg.content}
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-zinc-500 italic mr-12">
                          <span className="inline-flex gap-1">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                          </span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all"
                        rows={2}
                        placeholder="Ask anything about your essay..."
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
                        className="self-end rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Score Card ──────────────────────────────────────────────────────────────────

function ScoreCard({
  label,
  value,
  suffix,
  sub,
  color,
  animated,
}: {
  label: string;
  value: number;
  suffix: string;
  sub: string;
  color: "emerald" | "blue" | "amber" | "red";
  animated: boolean;
}) {
  const colorMap = {
    emerald: { ring: "ring-emerald-500/20", text: "text-emerald-400", glow: "glow-emerald" },
    blue: { ring: "ring-blue-500/20", text: "text-blue-400", glow: "glow-blue" },
    amber: { ring: "ring-amber-500/20", text: "text-amber-400", glow: "" },
    red: { ring: "ring-red-500/20", text: "text-red-400", glow: "" },
  };
  const c = colorMap[color];

  return (
    <div className={`glass rounded-xl p-4 ring-1 ${c.ring} ${animated ? c.glow : ""} transition-shadow duration-1000`}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-3xl font-bold font-mono ${c.text} ${animated ? "animate-count" : "opacity-0"}`}>
        {value}
        {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
      </p>
      <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>
    </div>
  );
}
