"use client";

import { motion } from "motion/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ECActivityList } from "@/components/ECActivityList";
import { ECConversationPanel } from "@/components/ECConversation";
import { ECResults } from "@/components/ECResults";
import { useECEvaluator } from "@/hooks/useECEvaluator";
import { useProfile } from "@/hooks/useProfile";

const DISTINGUISHED_FIELDS = [
  {
    key: "firstAuthorPublication",
    label: "First-author publication",
    desc: "Peer-reviewed paper, conference talk, or magazine byline where you are the first author. Class assignments and school newspapers don't count.",
  },
  {
    key: "nationalCompetitionPlacement",
    label: "National competition placement",
    desc: "Top-N placement at a USAMO/USAPhO/Intel ISEF/etc. national event, or comparable ranked qualifier. Regional and state placements do not count here.",
  },
  {
    key: "founderWithUsers",
    label: "Founder with real users",
    desc: "Project, company, or nonprofit you started — with revenue, downloads, members, or another verifiable measure of traction. Not a side project no one used.",
  },
  {
    key: "selectiveProgram",
    label: "Selective program admit",
    desc: "Admitted to a < 10% acceptance rate program: RSI, MITES, TASS, SSP, Bank of America Leaders, Telluride, Stanford OHS, etc. Camps and travel programs you paid into don't count.",
  },
] as const;

export default function ExtracurricularsPage() {
  const ec = useECEvaluator();
  const { profile, updateField } = useProfile();

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)]">
        {/* Masthead — eyebrow + h1 + standfirst, plus Save button on the
            right when there are activities to save. */}
        <header className="mb-10 sm:mb-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted mb-3">
                Tools / Activity Evaluator
              </p>
              <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04] text-text-primary">
                Activity Evaluator
              </h1>
              <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-text-secondary">
                Describe your extracurriculars in your own words. We&apos;ll ask
                questions to understand your involvement, then tier-rate each
                activity and your overall profile. Tier-1 candidates can be
                self-attested below.
              </p>
            </div>
            {ec.conversations.length > 0 && (
              <motion.button
                onClick={ec.saveAll}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-[background-color,color] duration-200 ${
                  ec.saveFlash
                    ? "bg-tier-safety-soft text-tier-safety-fg"
                    : "bg-bg-inset text-text-secondary hover:bg-accent-soft hover:text-accent-text border border-border-hair"
                }`}
              >
                {ec.saveFlash ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save
                  </>
                )}
              </motion.button>
            )}
          </div>
        </header>

        {/* Distinguished EC self-attestation. CRITIQUE.md flagged this as a
            missing feature — Tier-1 was being inferred from chat only,
            users couldn't anchor the model. Each checkbox includes
            calibration copy that discourages overstating. Writes to the
            same profile fields toGraderProfile() reads from. */}
        <section className="mb-10 sm:mb-12 rounded-md border border-border-hair bg-bg-surface p-6 sm:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted mb-2">
            Distinguished signals
          </p>
          <p className="text-[13px] text-text-muted max-w-[60ch] leading-relaxed mb-5">
            Self-attest only when you can name a specific instance — first author of
            <em> what paper</em>, founder of <em>what company with what users</em>.
            These flags raise your tier ceiling on /chances and /list, so honest
            calibration matters.
          </p>
          <fieldset>
            <legend className="sr-only">Distinguished EC signals</legend>
            <ul className="divide-y divide-border-hair">
              {DISTINGUISHED_FIELDS.map((f) => {
                const checked = profile[f.key as keyof typeof profile] === true;
                return (
                  <li key={f.key} className="py-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => updateField(f.key as keyof typeof profile, e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded-sm border border-border-strong bg-bg-inset accent-[var(--accent)] cursor-pointer"
                      />
                      <div>
                        <span className="text-[13px] font-medium text-text-primary">{f.label}</span>
                        <p className="mt-0.5 text-[12px] text-text-muted leading-relaxed max-w-[70ch]">{f.desc}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </section>

        {/* Two-column layout: activity list + conversation */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 mb-10">
            {/* Left: Activity List */}
            <div className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl p-5">
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
            <div className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl p-6">
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
                    <p className="text-text-muted text-sm mb-4">
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
              className="text-xs text-text-faint hover:text-text-secondary transition-colors"
            >
              Reset all activities
            </button>
          </div>
        )}
      </main>
    </>
  );
}
