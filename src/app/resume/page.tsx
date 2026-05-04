"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ResumePreview } from "@/components/ResumePreview";
import { ResumeSectionCard, type FieldSchema } from "@/components/ResumeSectionCard";
import { ActivitiesHelperPanel } from "@/components/ActivitiesHelperPanel";
import { SectionNav } from "@/components/SectionNav";
import {
  ResumeImproveDiff,
  type ResumeImprovePending,
} from "@/components/ResumeImproveDiff";
import { useResume } from "@/hooks/useResume";
import { Download, Save, FileText, Wand2, Eye, EyeOff, RotateCcw, Download as DownloadIcon } from "lucide-react";

const inputClass =
  "w-full rounded-lg bg-bg-inset border border-border-hair px-3 py-2 text-sm text-text-primary placeholder-zinc-600 focus:border-blue-500/50 focus: focus:ring-accent-line focus:outline-none transition-[border-color,box-shadow] duration-200";

function fieldLabelFor(fields: readonly FieldSchema[], key: string): string {
  return fields.find((f) => f.key === key)?.label ?? key;
}

// ── Section field schemas ────────────────────────────────────────────────────

const EDUCATION_FIELDS: readonly FieldSchema[] = [
  { key: "school", label: "School", type: "text", placeholder: "e.g. Lincoln High School" },
  { key: "graduationDate", label: "Graduation date", type: "text", placeholder: "e.g. May 2026" },
  { key: "gpaUnweighted", label: "Unweighted GPA", type: "text", placeholder: "e.g. 3.87" },
  { key: "gpaWeighted", label: "Weighted GPA", type: "text", placeholder: "e.g. 4.52" },
  { key: "gpaScale", label: "GPA scale", type: "text", placeholder: "e.g. 4.00 or 5.00" },
  { key: "classRank", label: "Class rank (optional)", type: "text", placeholder: "e.g. 5/450" },
];

const AWARD_FIELDS: readonly FieldSchema[] = [
  { key: "name", label: "Award name", type: "text", placeholder: "e.g. National Merit Finalist" },
  { key: "grades", label: "Grade(s)", type: "text", placeholder: "e.g. 11, 12" },
  { key: "description", label: "Description (optional)", type: "textarea", placeholder: "Optional context", improvable: true },
];

const COMMUNITY_FIELDS: readonly FieldSchema[] = [
  { key: "organization", label: "Organization", type: "text", placeholder: "e.g. Local Food Bank" },
  { key: "role", label: "Role", type: "text", placeholder: "e.g. Volunteer Coordinator" },
  { key: "grades", label: "Grade(s)", type: "text", placeholder: "e.g. 10, 11, 12" },
  { key: "timeCommitment", label: "Time commitment", type: "text", placeholder: "e.g. 4 hrs/week, 30 wks/yr" },
  { key: "description", label: "Description", type: "textarea", placeholder: "What you did and the impact", improvable: true },
];

const ATHLETICS_FIELDS: readonly FieldSchema[] = [
  { key: "sport", label: "Sport", type: "text", placeholder: "e.g. Soccer" },
  { key: "level", label: "Level", type: "text", placeholder: "e.g. Varsity" },
  { key: "position", label: "Position", type: "text", placeholder: "e.g. Captain, Midfielder" },
  { key: "grades", label: "Grade(s)", type: "text", placeholder: "e.g. 9, 10, 11, 12" },
  { key: "timeCommitment", label: "Time commitment", type: "text", placeholder: "e.g. 15 hrs/week" },
  { key: "achievements", label: "Achievements", type: "textarea", placeholder: "Awards, stats, team results", improvable: true },
];

const ACTIVITY_FIELDS: readonly FieldSchema[] = [
  { key: "activityName", label: "Activity name", type: "text", placeholder: "e.g. Robotics Club" },
  { key: "role", label: "Role", type: "text", placeholder: "e.g. President" },
  { key: "grades", label: "Grade(s)", type: "text", placeholder: "e.g. 10, 11, 12" },
  { key: "leadership", label: "Leadership role", type: "checkbox" },
  { key: "description", label: "Description", type: "textarea", placeholder: "What you did", improvable: true },
  { key: "impact", label: "Impact / achievements", type: "textarea", placeholder: "Measurable outcomes", improvable: true },
];

const SUMMER_FIELDS: readonly FieldSchema[] = [
  { key: "program", label: "Program / internship", type: "text", placeholder: "e.g. Research Internship" },
  { key: "organization", label: "Organization", type: "text", placeholder: "e.g. Stanford Lab" },
  { key: "duration", label: "Duration", type: "text", placeholder: "e.g. Summer 2024, 8 weeks" },
  { key: "collegeCredit", label: "Earned college credit", type: "checkbox" },
  { key: "description", label: "Description", type: "textarea", placeholder: "What you worked on and learned", improvable: true },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ResumePage() {
  const r = useResume();
  const [mode, setMode] = useState<"resume" | "activities">("resume");
  const [showPreview, setShowPreview] = useState(true);
  const [improvingKey, setImprovingKey] = useState<string | null>(null);
  // Pending Improve preview. AI rewrites can drop specific numbers / names
  // the user actually needs, so the field is no longer overwritten until
  // the user explicitly accepts the diff in <ResumeImproveDiff>.
  const [pendingImprove, setPendingImprove] = useState<ResumeImprovePending | null>(null);

  // ── Improve a field via AI ─────────────────────────────────────────────
  const handleImprove = useCallback(
    async (
      section: "awards" | "communityService" | "athletics" | "activities" | "summerExperience",
      id: string,
      fieldKey: string,
      currentText: string,
      fieldLabel?: string,
    ) => {
      if (!currentText.trim() || improvingKey) return;
      setImprovingKey(`${id}:${fieldKey}`);
      try {
        const res = await fetch("/api/resume-improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentText, mode: "description" }),
        });
        const data = await res.json();
        if (typeof data.improved === "string" && data.improved.trim().length > 0) {
          setPendingImprove({
            section,
            id,
            fieldKey,
            fieldLabel: fieldLabel ?? fieldKey,
            original: currentText,
            improved: data.improved,
          });
        }
      } catch {
        // silent — user can retry
      } finally {
        setImprovingKey(null);
      }
    },
    [improvingKey]
  );

  const acceptImprove = useCallback(() => {
    const p = pendingImprove;
    if (!p) return;
    const patch = { [p.fieldKey]: p.improved } as Record<string, string>;
    if (p.section === "awards") r.updateAward(p.id, patch);
    else if (p.section === "communityService") r.updateCommunityService(p.id, patch);
    else if (p.section === "athletics") r.updateAthletics(p.id, patch);
    else if (p.section === "activities") r.updateActivity(p.id, patch);
    else if (p.section === "summerExperience") r.updateSummerExperience(p.id, patch);
    setPendingImprove(null);
  }, [pendingImprove, r]);

  const rejectImprove = useCallback(() => setPendingImprove(null), []);

  if (!r.loaded) {
    return (
      <>
        <div className="min-h-[60dvh] flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)] print:py-0 print:max-w-none print:px-0">
        {/* Header */}
        <div className="mb-10 print:hidden">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
              <FileText className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.4em] text-text-secondary">
                Resume Helper
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={r.saveNow}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                  r.saveFlash
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-bg-inset text-text-secondary hover:bg-accent-soft hover:text-accent-text border border-border-hair"
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {r.saveFlash ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-bg-inset text-text-secondary hover:bg-accent-soft hover:text-accent-text border border-border-hair transition-[background-color,color] duration-200"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>
          <h1
            className="font-[family-name:var(--font-display)] tracking-[-0.012em] text-white leading-[0.95] mb-4"
            style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}
          >
            Build your college resume.
          </h1>
          <p className="max-w-xl text-lg text-text-secondary leading-relaxed">
            A clean, admissions-ready resume. Autofills from your GPA calculator, EC evaluator, and profile. Edit anything.
          </p>
        </div>

        {mode === "resume" && (
          <div className="print:hidden">
            <SectionNav
              sections={[
                { id: "resume-header", label: "Header" },
                { id: "resume-education", label: "Education" },
                { id: "resume-awards", label: "Awards", complete: r.resume.awards.length > 0 },
                { id: "resume-activities", label: "Activities", complete: r.resume.activities.length > 0 },
                { id: "resume-community", label: "Community" },
                { id: "resume-athletics", label: "Athletics" },
                { id: "resume-summer", label: "Summer" },
                { id: "resume-skills", label: "Skills" },
              ]}
            />
          </div>
        )}

        {/* Mode switcher */}
        <div className="mb-6 inline-flex rounded-full bg-bg-inset border border-border-hair p-1 print:hidden">
          <button
            onClick={() => setMode("resume")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-[background-color,color] duration-200 ${
              mode === "resume"
                ? "bg-bg-elevated text-white"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Resume mode
          </button>
          <button
            onClick={() => setMode("activities")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-[background-color,color] duration-200 ${
              mode === "activities"
                ? "bg-bg-elevated text-white"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Activities Helper
          </button>
        </div>

        {/* Import flash */}
        <AnimatePresence>
          {r.importFlash && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-xl border border-accent-line bg-accent-soft p-3 print:hidden"
            >
              <p className="text-[12px] text-accent-text">{r.importFlash}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        {mode === "resume" ? (
          <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
            {/* Editor column */}
            <div className="space-y-5 print:hidden">
              {/* Basic info */}
              <div id="resume-header" className="rounded-md bg-bg-surface border border-border-hair p-5 scroll-mt-32">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Header</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Your full name"
                      value={r.resume.basicInfo.name}
                      onChange={(e) => r.updateBasicInfo({ name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Email</label>
                    <input
                      type="email"
                      className={inputClass}
                      placeholder="you@school.edu"
                      value={r.resume.basicInfo.email}
                      onChange={(e) => r.updateBasicInfo({ email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Phone</label>
                    <input
                      type="tel"
                      className={inputClass}
                      placeholder="(555) 555-5555"
                      value={r.resume.basicInfo.phone}
                      onChange={(e) => r.updateBasicInfo({ phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Address (optional)</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="City, State"
                      value={r.resume.basicInfo.address}
                      onChange={(e) => r.updateBasicInfo({ address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">School</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Lincoln High School"
                      value={r.resume.basicInfo.school}
                      onChange={(e) => r.updateBasicInfo({ school: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Graduation year</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. 2026"
                      value={r.resume.basicInfo.graduationYear}
                      onChange={(e) => r.updateBasicInfo({ graduationYear: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div id="resume-education" className="scroll-mt-32">
                <ResumeSectionCard
                  title="Education"
                  entries={r.resume.education}
                  fields={EDUCATION_FIELDS}
                  onAdd={r.addEducation}
                  onUpdate={r.updateEducation}
                  onRemove={r.removeEducation}
                  onMove={r.moveEducation}
                />
              </div>

              <div id="resume-awards" className="scroll-mt-32">
                <ResumeSectionCard
                  title="Awards & Honors"
                  entries={r.resume.awards}
                  fields={AWARD_FIELDS}
                  onAdd={r.addAward}
                  onUpdate={r.updateAward}
                  onRemove={r.removeAward}
                  onMove={r.moveAward}
                  onImprove={(id, fk, val) => handleImprove("awards", id, fk, val, fieldLabelFor(AWARD_FIELDS, fk))}
                  improvingKey={improvingKey}
                  currentSection="awards"
                  onRecategorize={r.recategorizeActivity}
                />
              </div>

              <div id="resume-activities" className="scroll-mt-32">
                <ResumeSectionCard
                  title="Activities"
                  entries={r.resume.activities}
                  fields={ACTIVITY_FIELDS}
                  onAdd={r.addActivity}
                  onUpdate={r.updateActivity}
                  onRemove={r.removeActivity}
                  onMove={r.moveActivity}
                  onImprove={(id, fk, val) => handleImprove("activities", id, fk, val, fieldLabelFor(ACTIVITY_FIELDS, fk))}
                  improvingKey={improvingKey}
                  titleForEntry={(e) => e.activityName || "New activity"}
                  currentSection="activities"
                  onRecategorize={r.recategorizeActivity}
                  extraHeaderAction={
                    <button
                      onClick={r.importFromECs}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary px-3 py-1.5 text-xs font-semibold border border-border-hair transition-[background-color,color] duration-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Import from EC Evaluator
                    </button>
                  }
                />
              </div>

              <div id="resume-community" className="scroll-mt-32">
                <ResumeSectionCard
                  title="Community Service"
                  entries={r.resume.communityService}
                  fields={COMMUNITY_FIELDS}
                  onAdd={r.addCommunityService}
                  onUpdate={r.updateCommunityService}
                  onRemove={r.removeCommunityService}
                  onMove={r.moveCommunityService}
                  onImprove={(id, fk, val) => handleImprove("communityService", id, fk, val, fieldLabelFor(COMMUNITY_FIELDS, fk))}
                  improvingKey={improvingKey}
                  titleForEntry={(e) => e.organization || "New entry"}
                  currentSection="communityService"
                  onRecategorize={r.recategorizeActivity}
                />
              </div>

              <div id="resume-athletics" className="scroll-mt-32">
                <ResumeSectionCard
                  title="Athletics"
                  entries={r.resume.athletics}
                  fields={ATHLETICS_FIELDS}
                  onAdd={r.addAthletics}
                  onUpdate={r.updateAthletics}
                  onRemove={r.removeAthletics}
                  onMove={r.moveAthletics}
                  onImprove={(id, fk, val) => handleImprove("athletics", id, fk, val, fieldLabelFor(ATHLETICS_FIELDS, fk))}
                  improvingKey={improvingKey}
                  titleForEntry={(e) => e.sport || "New entry"}
                  currentSection="athletics"
                  onRecategorize={r.recategorizeActivity}
                />
              </div>

              <div id="resume-summer" className="scroll-mt-32">
                <ResumeSectionCard
                  title="Summer Experience"
                  entries={r.resume.summerExperience}
                  fields={SUMMER_FIELDS}
                  onAdd={r.addSummerExperience}
                  onUpdate={r.updateSummerExperience}
                  onRemove={r.removeSummerExperience}
                  onMove={r.moveSummerExperience}
                  onImprove={(id, fk, val) => handleImprove("summerExperience", id, fk, val, fieldLabelFor(SUMMER_FIELDS, fk))}
                  improvingKey={improvingKey}
                  titleForEntry={(e) => e.program || "New entry"}
                  currentSection="summerExperience"
                  onRecategorize={r.recategorizeActivity}
                />
              </div>

              {/* Skills */}
              <div id="resume-skills" className="rounded-md bg-bg-surface border border-border-hair p-5 scroll-mt-32">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Skills</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Languages</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Spanish (fluent), French (intermediate)"
                      value={r.resume.skills.languages}
                      onChange={(e) => r.updateSkills({ languages: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Technical</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Python, Adobe Photoshop, Arduino"
                      value={r.resume.skills.technical}
                      onChange={(e) => r.updateSkills({ technical: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Other</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Relevant skills not covered above"
                      value={r.resume.skills.other}
                      onChange={(e) => r.updateSkills({ other: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Reset */}
              <div className="flex justify-end">
                <button
                  onClick={r.resetResume}
                  className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary border border-border-hair rounded-lg px-3 py-1.5 hover:bg-bg-surface transition-[background-color,color] duration-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to autofilled
                </button>
              </div>
            </div>

            {/* Preview column */}
            <div className={`${showPreview ? "block" : "hidden"} lg:sticky lg:top-24 lg:self-start print:block print:static`}>
              <div className="flex items-center justify-between mb-3 print:hidden">
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium">Live preview</p>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-[color] duration-200 lg:hidden"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPreview ? "Hide" : "Show"}
                </button>
              </div>
              <ResumePreview resume={r.resume} />
            </div>

            {/* Mobile: toggle preview */}
            {!showPreview && (
              <button
                onClick={() => setShowPreview(true)}
                className="lg:hidden inline-flex items-center gap-1.5 justify-center w-full rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary px-4 py-3 text-sm font-semibold border border-border-hair transition-[background-color,color] duration-200 print:hidden"
              >
                <Eye className="w-4 h-4" />
                Show preview
              </button>
            )}
          </div>
        ) : (
          // ── Mode 2: Activities Helper ───────────────────────────────
          <ScrollReveal delay={0.05}>
            <div className="rounded-md bg-bg-surface border border-border-hair p-6 sm:p-8 max-w-2xl">
              <ActivitiesHelperPanel
                activities={r.resume.activities}
                onApply={r.replaceActivity}
              />
            </div>
          </ScrollReveal>
        )}
      </main>
      <ResumeImproveDiff
        pending={pendingImprove}
        onAccept={acceptImprove}
        onReject={rejectImprove}
      />
    </>
  );
}
