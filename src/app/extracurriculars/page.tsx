"use client";

import { motion } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ECActivityList } from "@/components/ECActivityList";
import { ECConversationPanel } from "@/components/ECConversation";
import { ECResults } from "@/components/ECResults";
import { useECEvaluator } from "@/hooks/useECEvaluator";
import { EditorialAtmosphere, EditorialMasthead } from "@/components/editorial/EditorialSystem";

export default function ExtracurricularsPage() {
  const ec = useECEvaluator();

  return (
    <AuroraBackground>
      <EditorialAtmosphere />
      <main className="editorial-luxury mx-auto max-w-[1100px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vw,96px)] pb-32 font-[family-name:var(--font-geist-sans)]">
        <EditorialMasthead
          eyebrow="Activity evaluator"
          title="Your hours,"
          accent="evaluated."
          lede="Describe each activity in your own words. The evaluator asks follow-ups to ground the rubric, then scores leadership, impact, commitment, and depth across your full profile."
        />
        {ec.conversations.length > 0 && (
          <div className="flex justify-end -mt-6 mb-8">
            <motion.button
              onClick={ec.saveAll}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`ed-cta ${ec.saveFlash ? "" : "ghost"}`}
            >
              {ec.saveFlash ? "Saved" : "Save all"}
              <span className="icon">
                {ec.saveFlash ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                )}
              </span>
            </motion.button>
          </div>
        )}

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
                onToggleDisabled={ec.toggleDisabled}
                onSetResumeCategory={ec.setResumeCategory}
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
                {ec.evaluating
                  ? ec.evalProgress
                    ? ec.evalProgress.done < ec.evalProgress.total
                      ? `Evaluating ${ec.evalProgress.done}/${ec.evalProgress.total}...`
                      : "Synthesizing profile..."
                    : "Evaluating..."
                  : `Evaluate ${ec.doneCount} Activit${ec.doneCount === 1 ? "y" : "ies"}`}
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
