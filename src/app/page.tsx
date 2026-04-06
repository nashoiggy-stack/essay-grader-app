"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ParticleField } from "@/components/ParticleField";
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

  // Scroll to results when grading completes
  useEffect(() => {
    if (grading.result && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
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
    if (grading.result) {
      chat.send(essay.essayText, grading.result);
    }
  };

  return (
    <div className="min-h-screen bg-mesh relative">
      <ParticleField />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:py-16 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
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
            <span className="text-gradient">{APP_CONFIG.title}</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-zinc-400 max-w-xl mx-auto text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {APP_CONFIG.subtitle}
          </motion.p>
        </motion.div>

        {/* Essay Input */}
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

        {/* Results */}
        <AnimatePresence>
          {grading.result && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-10 space-y-8"
            >
              <ScoreOverview result={grading.result} />

              <div className="glass rounded-2xl overflow-hidden">
                <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="p-6 sm:p-8">
                  <AnimatePresence mode="wait">
                    {activeTab === "common" && (
                      <CommonAppTab scores={grading.result.commonApp} />
                    )}
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
                    {activeTab === "lines" && (
                      <LineNotesTab suggestions={grading.result.lineSuggestions} />
                    )}
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
