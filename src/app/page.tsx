"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { GradingResult, LineSuggestion } from "@/lib/types";
import { Card3D } from "@/components/Card3D";
import { ParticleField } from "@/components/ParticleField";
import { AnimatedScore } from "@/components/AnimatedScore";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Tab = "common" | "vspice" | "feedback" | "lines" | "chat";

export default function Home() {
  const [essayText, setEssayText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("common");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, [result]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setEssayText(""); }
  }, []);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const handleGrade = async () => {
    setError(""); setResult(null); setChatMessages([]); setActiveTab("common");
    const hasFile = file && file.size > 0;
    const hasText = essayText.trim().length > 0;
    if (!hasFile && !hasText) { setError("Please paste your essay or upload a PDF/Doc file."); return; }
    setLoading(true);
    try {
      let res: Response;
      if (hasFile) {
        const fd = new FormData(); fd.append("file", file);
        res = await fetch("/api/grade", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/grade", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: essayText }),
        });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data as GradingResult);
    } catch { setError("Network error. Please check your connection."); }
    finally { setLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !result) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, essayText: essayText || "(uploaded file)", gradingResult: result, history: chatMessages }),
      });
      const data = await res.json();
      setChatMessages([...newMsgs, { role: "assistant", content: data.reply || data.error }]);
    } catch { setChatMessages([...newMsgs, { role: "assistant", content: "Something went wrong." }]); }
    finally { setChatLoading(false); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
  };

  const scoreColor = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return { text: "text-emerald-400", bg: "bg-emerald-500" };
    if (pct >= 0.6) return { text: "text-indigo-400", bg: "bg-indigo-500" };
    if (pct >= 0.4) return { text: "text-amber-400", bg: "bg-amber-500" };
    return { text: "text-red-400", bg: "bg-red-500" };
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "common", label: "Common App (7)" },
    { id: "vspice", label: "VSPICE (6)" },
    { id: "feedback", label: "Feedback" },
    { id: "lines", label: "Line Notes" },
    { id: "chat", label: "Coach" },
  ];

  return (
    <div className="min-h-screen bg-mesh relative">
      <ParticleField />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:py-16 font-[family-name:var(--font-geist-sans)]">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            className="text-5xl sm:text-6xl font-bold tracking-tight"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <span className="text-gradient">Essay Grader</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-zinc-400 max-w-xl mx-auto text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            AI-powered scoring with Common App + VSPICE rubrics.
            Built for high school juniors aiming for top colleges.
          </motion.p>
        </motion.div>

        {/* ── Input Card ──────────────────────────────────────────────── */}
        <Card3D className="glass rounded-2xl p-6 sm:p-8" glowColor="rgba(99, 102, 241, 0.12)">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-zinc-300">Your essay</label>
            {essayText && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-xs font-mono px-2.5 py-1 rounded-full ${
                  wordCount >= 480 && wordCount <= 650
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                }`}
              >
                {wordCount} words
                {wordCount >= 480 && wordCount <= 650 ? " — ideal" : wordCount < 480 ? ` — ${480 - wordCount} short` : ` — ${wordCount - 650} over`}
              </motion.span>
            )}
          </div>

          <textarea
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none resize-y transition-all"
            rows={12}
            placeholder="Paste your Common App essay here..."
            value={essayText}
            onChange={(e) => { setEssayText(e.target.value); setFile(null); }}
          />

          {/* Drop zone */}
          <motion.div
            className={`mt-4 flex items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all cursor-pointer ${
              dragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setEssayText(""); } }}
            />
            <p className="text-sm text-zinc-400">
              {file ? (<><span className="font-medium text-indigo-400">{file.name}</span> selected</>)
                : (<><span className="font-medium text-indigo-400">Click to upload</span> or drag & drop PDF / Word doc</>)}
            </p>
          </motion.div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3">
            <motion.button
              onClick={handleGrade}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 pointer-events-none"
                animate={{ backgroundPosition: loading ? ["0% 50%", "200% 50%"] : "0% 50%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 100%" }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {loading ? "Analyzing..." : "Grade Essay"}
              </span>
            </motion.button>
            <button
              onClick={() => { setEssayText(""); setFile(null); setResult(null); setError(""); setChatMessages([]); }}
              className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
            >
              Clear
            </button>
          </div>

          {/* Loading */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 glass rounded-xl p-5 overflow-hidden animate-pulse-glow"
              >
                <p className="text-sm text-indigo-300 font-medium">
                  Reading your essay like an Ivy League admissions officer...
                </p>
                <div className="mt-3 h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full bg-indigo-500/50 rounded-full shimmer w-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card3D>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-10 space-y-8"
            >
              {/* Score Gauges */}
              <Card3D className="glass rounded-2xl p-8" glowColor="rgba(16, 185, 129, 0.1)">
                <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
                  <AnimatedScore value={result.wordCount} max={650} label="Word Count"
                    sub={result.wordCount >= 480 && result.wordCount <= 650 ? "Ideal range" : result.wordCount < 480 ? "Below 480-650" : "Above 480-650"}
                    delay={0}
                  />
                  <AnimatedScore value={result.rawScore} max={100} label="Raw Score" sub="7-criteria average" delay={200} />
                  <AnimatedScore value={result.adjustedScore} max={100} label="Adjusted"
                    sub={result.wordCountPenalty > 0 ? `-${result.wordCountPenalty} penalty` : "No penalty"}
                    delay={400}
                  />
                  <AnimatedScore value={Math.round(result.vspiceComposite * 25)} max={100} label="VSPICE"
                    sub={`${result.vspiceComposite}/4 composite`}
                    delay={600}
                  />
                </div>
              </Card3D>

              {/* Tab Navigation */}
              <div className="glass rounded-2xl overflow-hidden">
                <nav className="flex border-b border-white/[0.06] overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-5 py-3.5 text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === tab.id ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </nav>

                <div className="p-6 sm:p-8">
                  <AnimatePresence mode="wait">
                    {/* Common App */}
                    {activeTab === "common" && (
                      <motion.div key="common" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="space-y-6">
                        {Object.entries(result.commonApp).map(([name, c], i) => {
                          const colors = scoreColor(c.score, 100);
                          return (
                            <motion.div
                              key={name}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08 }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-zinc-200">{name}</span>
                                <span className={`text-lg font-bold font-mono ${colors.text}`}>
                                  {c.score}<span className="text-xs text-zinc-500">/100</span>
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${colors.bg}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${c.score}%` }}
                                  transition={{ duration: 1, delay: i * 0.08, ease: "easeOut" }}
                                  style={{ boxShadow: `0 0 8px ${colors.bg === "bg-emerald-500" ? "rgba(16,185,129,0.4)" : colors.bg === "bg-indigo-500" ? "rgba(99,102,241,0.4)" : "rgba(245,158,11,0.4)"}` }}
                                />
                              </div>
                              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{c.feedback}</p>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}

                    {/* VSPICE */}
                    {activeTab === "vspice" && (
                      <motion.div key="vspice" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="space-y-6">
                        {Object.entries(result.vspice).map(([name, c], i) => {
                          const colors = scoreColor(c.score, 4);
                          return (
                            <motion.div
                              key={name}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08 }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-zinc-200">{name}</span>
                                <div className="flex items-center gap-1.5">
                                  {[1, 2, 3, 4].map((level) => (
                                    <motion.div
                                      key={level}
                                      className={`w-8 h-2.5 rounded-full ${level <= c.score ? colors.bg : "bg-white/[0.05]"}`}
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{ delay: i * 0.08 + level * 0.1, duration: 0.4 }}
                                      style={{ transformOrigin: "left", boxShadow: level <= c.score ? `0 0 6px ${colors.bg === "bg-emerald-500" ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}` : "none" }}
                                    />
                                  ))}
                                  <span className={`ml-2 text-sm font-bold font-mono ${colors.text}`}>{c.score}/4</span>
                                </div>
                              </div>
                              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{c.feedback}</p>
                            </motion.div>
                          );
                        })}

                        {/* Bonuses & Pitfalls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/[0.06]">
                          <div>
                            <h4 className="text-sm font-semibold text-emerald-400 mb-3">Bonus Signals</h4>
                            {result.bonuses.length > 0 ? (
                              <ul className="space-y-2">{result.bonuses.map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400"><span className="text-emerald-400 mt-0.5">+</span>{b}</li>
                              ))}</ul>
                            ) : <p className="text-sm text-zinc-600">None detected</p>}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-red-400 mb-3">Pitfall Warnings</h4>
                            {result.pitfalls.length > 0 ? (
                              <ul className="space-y-2">{result.pitfalls.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400"><span className="text-red-400 mt-0.5">!</span>{p}</li>
                              ))}</ul>
                            ) : <p className="text-sm text-zinc-600">None detected</p>}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Feedback */}
                    {activeTab === "feedback" && (
                      <motion.div key="feedback" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-5 mb-6">
                          <h4 className="text-sm font-semibold text-indigo-400 mb-2">Overall Assessment</h4>
                          <p className="text-sm text-zinc-300 leading-relaxed">{result.generalFeedback}</p>
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-3">Quick Scores</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.entries(result.commonApp).map(([name, c]) => {
                            const colors = scoreColor(c.score, 100);
                            return (
                              <motion.button
                                key={name}
                                onClick={() => setActiveTab("common")}
                                whileHover={{ scale: 1.05, y: -2 }}
                                className="glass rounded-lg p-3 text-left transition-all cursor-pointer"
                              >
                                <p className="text-xs text-zinc-500 truncate">{name}</p>
                                <p className={`text-lg font-bold font-mono ${colors.text}`}>{c.score}</p>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Line Notes */}
                    {activeTab === "lines" && (
                      <motion.div key="lines" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="space-y-4">
                        {result.lineSuggestions.length > 0 ? (
                          result.lineSuggestions.map((ls: LineSuggestion, i: number) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="glass rounded-xl p-4"
                            >
                              <p className="text-sm text-zinc-500 italic border-l-2 border-violet-500/30 pl-3 mb-2">
                                &ldquo;{ls.line}&rdquo;
                              </p>
                              <p className="text-sm text-zinc-300 pl-3">{ls.suggestion}</p>
                            </motion.div>
                          ))
                        ) : <p className="text-sm text-zinc-600 text-center py-8">No line-specific suggestions</p>}
                      </motion.div>
                    )}

                    {/* Coach / Chat */}
                    {activeTab === "chat" && (
                      <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                        <p className="text-sm text-zinc-500 mb-4">
                          Ask follow-up questions about your scores or how to improve.
                        </p>

                        <div className="mb-4 max-h-80 min-h-[140px] overflow-y-auto rounded-xl bg-black/20 border border-white/[0.04] p-4 space-y-3">
                          {chatMessages.length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-zinc-600 text-sm mb-3">No messages yet</p>
                              <div className="flex flex-wrap justify-center gap-2">
                                {["What's my weakest area?", "How do I improve Insight?", "Rewrite my opening"].map((q) => (
                                  <motion.button
                                    key={q}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setChatInput(q)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all"
                                  >
                                    {q}
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          )}
                          {chatMessages.map((msg, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                                msg.role === "user"
                                  ? "bg-indigo-500/10 text-indigo-200 ml-12"
                                  : "bg-white/[0.03] border border-white/[0.06] text-zinc-300 mr-12"
                              }`}
                            >
                              {msg.content}
                            </motion.div>
                          ))}
                          {chatLoading && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-zinc-500 italic mr-12">
                              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                Thinking...
                              </motion.span>
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
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                          />
                          <motion.button
                            onClick={sendChat}
                            disabled={chatLoading || !chatInput.trim()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="self-end rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            Send
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
