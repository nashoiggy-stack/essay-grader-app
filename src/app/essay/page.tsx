"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SaveIndicator } from "@/components/SaveIndicator";
import { EssayInput } from "@/components/EssayInput";
import { ScoreOverview } from "@/components/ScoreOverview";
import { TabNavigation, type TabId } from "@/components/TabNavigation";
import { CommonAppTab } from "@/components/CommonAppTab";
import { VspiceTab } from "@/components/VspiceTab";
import { FeedbackTab } from "@/components/FeedbackTab";
import { LineNotesTab } from "@/components/LineNotesTab";
import { ChatTab } from "@/components/ChatTab";
import { InlineEditor } from "@/components/InlineEditor";
import { EssayHistorySidebar } from "@/components/EssayHistorySidebar";
import { useEssayInput } from "@/hooks/useEssayInput";
import { useGrading } from "@/hooks/useGrading";
import { useChat } from "@/hooks/useChat";
import { useSuggestions } from "@/hooks/useSuggestions";
import { useEssayHistory } from "@/hooks/useEssayHistory";
import { APP_CONFIG } from "@/data/mockData";
import { exportGradeAsMarkdown } from "@/lib/export-grade";
import type { SuggestionFocus } from "@/lib/suggestions-prompt";

export default function Home() {
  const essay = useEssayInput();
  const grading = useGrading();
  const chat = useChat();
  const suggestions = useSuggestions(essay.essayText);
  const history = useEssayHistory();
  const [activeTab, setActiveTab] = useState<TabId>("common");
  const resultsRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const [gradedText, setGradedText] = useState("");
  const essayModified = grading.result !== null && essay.essayText !== gradedText;

  useEffect(() => {
    if (grading.result && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [grading.result]);

  const handleGrade = () => {
    chat.reset();
    suggestions.clear();
    setActiveTab("common");
    setGradedText(essay.essayText);
    grading.grade(essay.essayText, essay.file);
  };

  const handleRegrade = () => {
    setGradedText(essay.essayText);
    grading.grade(essay.essayText, null);
  };

  const handleClear = () => {
    essay.clear();
    grading.reset();
    chat.reset();
    suggestions.clear();
    setGradedText("");
  };

  const handleChatSend = () => {
    if (grading.result) chat.send(essay.essayText, grading.result);
  };

  const handleFetchSuggestions = (focus: SuggestionFocus) => {
    suggestions.fetch(essay.essayText, focus);
  };

  const handleAcceptSuggestion = (index: number) => {
    const newText = suggestions.accept(index);
    if (newText) essay.setEssayText(newText);
  };

  const handleSave = () => {
    if (!grading.result) return;
    history.save(essay.essayText, grading.result);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  const handleExport = () => {
    if (!grading.result) return;
    exportGradeAsMarkdown(essay.essayText, grading.result);
  };

  const handleLoadEssay = (id: string) => {
    const saved = history.load(id);
    if (!saved) return;
    essay.setEssayText(saved.essayText);
    grading.reset();
    // Re-set the result directly — we need to expose this from the hook
    // For now, trigger a re-grade with the loaded text
    chat.reset();
    suggestions.clear();
    setSidebarOpen(false);
    setActiveTab("common");
    setGradedText(saved.essayText);
    // Load the saved result
    grading.loadResult(saved.result);
  };

  return (
    <>
      {/* Essay History Sidebar */}
      <EssayHistorySidebar
        essays={history.essays}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLoad={handleLoadEssay}
        onDelete={history.remove}
        onRename={history.rename}
        currentEssayText={essay.essayText}
      />

      <main id="main-content" className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)]">

        {/* Masthead — replaces the cosmic ContainerScroll 3D hero per
            CRITIQUE.md (was a leftover from the pre-Linear redesign). */}
        <header className="mb-10 sm:mb-12">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted mb-3">
              Tools / Essay Grader
            </p>
            <SaveIndicator storageKey="essay-grader-history" />
          </div>
          <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04] text-text-primary">
            {APP_CONFIG.title}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-text-secondary">
            {APP_CONFIG.subtitle}
          </p>
        </header>

        {/* Rubric reference — two flat tables, matches /gpa's pattern. */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted mb-4">
            How essays are graded
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8 lg:gap-y-0">
            <div>
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint mb-3">
                Common App criteria · 1–100
              </h2>
              <ul className="divide-y divide-border-hair">
                {[
                  { name: "Authenticity", desc: "Your real voice — not a formal essay voice" },
                  { name: "Compelling Story", desc: "Clear beginning, turn, and landing that hooks the reader" },
                  { name: "Insight", desc: "Sustained reflection showing self-awareness and growth" },
                  { name: "Values", desc: "What matters to you — shown through choices, not slogans" },
                  { name: "Writing Skills", desc: "Clear sentences, varied rhythm, conversational but polished" },
                  { name: "Passion", desc: "What energizes you — shown through specific detail" },
                  { name: "Ambition", desc: "Meaningful goals with a concrete next step" },
                ].map((c) => (
                  <li key={c.name} className="py-2">
                    <p className="text-[13px] text-text-primary font-medium">{c.name}</p>
                    <p className="text-[12px] text-text-muted leading-relaxed">{c.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint mb-3">
                VSPICE rubric · 1–4
              </h2>
              <ul className="divide-y divide-border-hair">
                {[
                  { name: "Vulnerability", desc: "Real fear or doubt, handled with maturity" },
                  { name: "Selflessness", desc: "Genuine care for others, grounded and specific" },
                  { name: "Perseverance", desc: "Attempt → failure → adjustment → retry" },
                  { name: "Initiative", desc: "You started something without being asked" },
                  { name: "Curiosity", desc: "A question you chased with real receipts" },
                  { name: "Expression", desc: "Creative choices — image, metaphor, dialogue" },
                ].map((c) => (
                  <li key={c.name} className="py-2">
                    <p className="text-[13px] text-text-primary font-medium">{c.name}</p>
                    <p className="text-[12px] text-text-muted leading-relaxed">{c.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Input Section ────────────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <EssayInput
            essayText={essay.essayText}
            file={essay.file}
            dragging={essay.dragging}
            wordCount={essay.wordCount}
            loading={grading.loading}
            error={grading.error}
            errorCode={grading.errorCode}
            canRetry={grading.canRetry}
            fileInputRef={essay.fileInputRef}
            onTextChange={essay.setEssayText}
            onDrop={essay.handleDrop}
            onDragOver={essay.handleDragOver}
            onDragLeave={essay.handleDragLeave}
            onFileChange={essay.handleFileChange}
            onOpenFilePicker={essay.openFilePicker}
            onGrade={handleGrade}
            onRetry={grading.retry}
            onClear={handleClear}
          />
        </ScrollReveal>

        {/* ── Results ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {grading.result && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-12 space-y-10"
            >
              {/* Divider + Save button */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <span className="text-xs text-text-muted uppercase tracking-[0.08em]">Results</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <motion.button
                  onClick={handleSave}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                    saveFlash
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-bg-inset text-text-secondary hover:bg-accent-soft hover:text-accent-text border border-border-hair"
                  }`}
                >
                  {saveFlash ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Saved
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                      Save
                    </>
                  )}
                </motion.button>
                <motion.button
                  onClick={handleExport}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary bg-bg-inset hover:bg-accent-soft hover:text-accent-text border border-border-hair transition-[background-color,color,box-shadow] duration-200"
                  title="Download grade report as Markdown"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </motion.button>
              </div>

              {/* Score Overview */}
              <ScrollReveal delay={0.1}>
                <ScoreOverview result={grading.result} />
              </ScrollReveal>

              {/* ── Inline Editor / Suggestions ──────────────────────── */}
              <ScrollReveal delay={0.15}>
                <div className="" style={{ "--radius": "1rem" } as React.CSSProperties}>
                <div className="bg-bg-surface rounded-md p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-text-primary mb-1">Inline Suggestions</h3>
                  <p className="text-sm text-text-muted mb-5">
                    Choose a focus area to get targeted, Grammarly-style suggestions. Click highlights to accept or dismiss.
                  </p>
                  <InlineEditor
                    essayText={essay.essayText}
                    suggestions={suggestions.suggestions}
                    suggestionsLoading={suggestions.loading}
                    suggestionsError={suggestions.error}
                    activeFocus={suggestions.activeFocus}
                    onTextChange={essay.setEssayText}
                    onFetchSuggestions={handleFetchSuggestions}
                    onAcceptSuggestion={handleAcceptSuggestion}
                    onDismissSuggestion={suggestions.dismiss}
                    onClearSuggestions={suggestions.clear}
                    hasResult={!!grading.result}
                    onRegrade={handleRegrade}
                    essayModified={essayModified}
                  />
                </div>
                </div>
              </ScrollReveal>

              {/* Tabbed Content */}
              <ScrollReveal delay={0.2}>
                <div className="" style={{ "--radius": "1rem" } as React.CSSProperties}>
                <div className="bg-bg-surface rounded-md overflow-hidden">
                  <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

                  <div className="p-6 sm:p-8">
                    <AnimatePresence mode="wait">
                      {activeTab === "common" && <CommonAppTab scores={grading.result.commonApp} />}
                      {activeTab === "vspice" && (
                        <VspiceTab
                          scores={grading.result.vspice}
                          bonuses={grading.result.bonuses}
                          pitfalls={grading.result.pitfalls}
                        />
                      )}
                      {activeTab === "feedback" && (
                        <FeedbackTab
                          generalFeedback={grading.result.generalFeedback}
                          commonApp={grading.result.commonApp}
                          onNavigateToCommon={() => setActiveTab("common")}
                        />
                      )}
                      {activeTab === "lines" && <LineNotesTab suggestions={grading.result.lineSuggestions} />}
                      {activeTab === "chat" && (
                        <ChatTab
                          messages={chat.messages}
                          input={chat.input}
                          loading={chat.loading}
                          chatEndRef={chat.chatEndRef}
                          onInputChange={chat.setInput}
                          onSend={handleChatSend}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                </div>
              </ScrollReveal>

              {/* Footer */}
              <ScrollReveal delay={0.1}>
                <div className="text-center py-8">
                  <p className="text-xs text-text-faint">
                    Scores are AI-generated estimates, not official admissions feedback.
                    Use as a revision tool alongside your counselor.
                  </p>
                </div>
              </ScrollReveal>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
