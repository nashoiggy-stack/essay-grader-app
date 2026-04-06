"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { EssayInput } from "@/components/EssayInput";
import { ScoreOverview } from "@/components/ScoreOverview";
import { TabNavigation, type TabId } from "@/components/TabNavigation";
import { CommonAppTab } from "@/components/CommonAppTab";
import { VspiceTab } from "@/components/VspiceTab";
import { FeedbackTab } from "@/components/FeedbackTab";
import { LineNotesTab } from "@/components/LineNotesTab";
import { ChatTab } from "@/components/ChatTab";
import { useEssayInput } from "@/hooks/useEssayInput";
import { useGrading } from "@/hooks/useGrading";
import { useChat } from "@/hooks/useChat";
import { APP_CONFIG } from "@/data/mockData";

export default function Home() {
  const essay = useEssayInput();
  const grading = useGrading();
  const chat = useChat();
  const [activeTab, setActiveTab] = useState<TabId>("common");
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (grading.result && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [grading.result]);

  const handleGrade = () => {
    chat.reset();
    setActiveTab("common");
    grading.grade(essay.essayText, essay.file);
  };

  const handleClear = () => {
    essay.clear();
    grading.reset();
    chat.reset();
  };

  const handleChatSend = () => {
    if (grading.result) chat.send(essay.essayText, grading.result);
  };

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-20 font-[family-name:var(--font-geist-sans)]">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <motion.div
            className="inline-block mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          >
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              Powered by Claude AI
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="text-gradient">{APP_CONFIG.title}</span>
          </motion.h1>

          <motion.p
            className="mt-5 text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {APP_CONFIG.subtitle}
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            className="mt-12 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <span className="text-xs text-zinc-600 uppercase tracking-widest">Paste or upload below</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center p-1"
            >
              <motion.div
                className="w-1 h-2 rounded-full bg-indigo-500"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── Input Section ────────────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <EssayInput
            essayText={essay.essayText}
            file={essay.file}
            dragging={essay.dragging}
            wordCount={essay.wordCount}
            loading={grading.loading}
            error={grading.error}
            fileInputRef={essay.fileInputRef}
            onTextChange={essay.setEssayText}
            onDrop={essay.handleDrop}
            onDragOver={essay.handleDragOver}
            onDragLeave={essay.handleDragLeave}
            onFileChange={essay.handleFileChange}
            onOpenFilePicker={essay.openFilePicker}
            onGrade={handleGrade}
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
              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Results</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
              </div>

              {/* Score Overview */}
              <ScrollReveal delay={0.1}>
                <ScoreOverview result={grading.result} />
              </ScrollReveal>

              {/* Tabbed Content */}
              <ScrollReveal delay={0.2}>
                <div className="glass rounded-2xl overflow-hidden ring-1 ring-white/[0.06]">
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
              </ScrollReveal>

              {/* Footer */}
              <ScrollReveal delay={0.1}>
                <div className="text-center py-8">
                  <p className="text-xs text-zinc-600">
                    Scores are AI-generated estimates, not official admissions feedback.
                    Use as a revision tool alongside your counselor.
                  </p>
                </div>
              </ScrollReveal>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AuroraBackground>
  );
}
