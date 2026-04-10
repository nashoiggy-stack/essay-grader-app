"use client";

import { motion } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ECActivityList } from "@/components/ECActivityList";
import { ECConversationPanel } from "@/components/ECConversation";
import { ECResults } from "@/components/ECResults";
import { useECEvaluator } from "@/hooks/useECEvaluator";

export default function ExtracurricularsPage() {
  const ec = useECEvaluator();

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-5xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md mb-6">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.4em] text-zinc-300">
              Extracurriculars
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tighter leading-[0.95] mb-4">
            <span className="text-gradient">Activity Evaluator</span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-400 leading-relaxed">
            Describe your extracurriculars in your own words. I&apos;ll ask questions to understand
            your involvement, then evaluate each activity and your overall profile.
          </p>
        </div>

        {/* Two-column layout: activity list + conversation */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 mb-10">
            {/* Left: Activity List */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <ECActivityList
                conversations={ec.conversations}
                activeConvId={ec.activeConvId}
                onSelect={ec.selectActivity}
                onRemove={ec.removeActivity}
                onAdd={ec.startNewActivity}
              />
            </div>

            {/* Right: Conversation */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              {ec.activeConversation ? (
                <ECConversationPanel
                  conversation={ec.activeConversation}
                  chatInput={ec.chatInput}
                  chatLoading={ec.chatLoading}
                  chatEndRef={ec.chatEndRef}
                  onInputChange={ec.setChatInput}
                  onSend={ec.sendMessage}
                  onDone={() => ec.markDone(ec.activeConvId!)}
                  onReopen={() => ec.reopenActivity(ec.activeConvId!)}
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[350px]">
                  <div className="text-center">
                    <p className="text-zinc-500 text-sm mb-4">
                      {ec.conversations.length === 0
                        ? "Start by adding your first activity"
                        : "Select an activity to continue, or add a new one"}
                    </p>
                    <button
                      onClick={ec.startNewActivity}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-[background-color,color,opacity] duration-200"
                    >
                      + Add Activity
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Evaluate Button */}
        {ec.doneCount > 0 && (
          <ScrollReveal delay={0.15}>
            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <motion.button
                onClick={ec.evaluate}
                disabled={ec.evaluating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,color,opacity] duration-200"
              >
                {ec.evaluating ? "Evaluating..." : `Evaluate ${ec.doneCount} Activit${ec.doneCount === 1 ? "y" : "ies"}`}
              </motion.button>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </ScrollReveal>
        )}

        {/* Error */}
        {ec.evalError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{ec.evalError}</p>
          </div>
        )}

        {/* Results */}
        {ec.result && (
          <ScrollReveal delay={0.1}>
            <ECResults result={ec.result} />
          </ScrollReveal>
        )}

        {/* Reset */}
        {(ec.conversations.length > 0 || ec.result) && (
          <div className="mt-8 text-center">
            <button
              onClick={ec.resetAll}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Reset all activities
            </button>
          </div>
        )}
      </main>
    </AuroraBackground>
  );
}
