"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  ResumeData,
  BasicInfo,
  EducationEntry,
  AwardEntry,
  CommunityServiceEntry,
  AthleticsEntry,
  ActivityEntry,
  SummerExperienceEntry,
  SkillsData,
} from "@/lib/resume-types";
import { EMPTY_RESUME, RESUME_STORAGE_KEY, generateResumeId } from "@/lib/resume-types";
import { buildInitialResume, importFromECEvaluator } from "@/lib/resume-import";

// ── List-section keys (everything except basicInfo / skills) ────────────────

type ListSectionKey =
  | "education"
  | "awards"
  | "communityService"
  | "athletics"
  | "activities"
  | "summerExperience";

type EntryByKey = {
  education: EducationEntry;
  awards: AwardEntry;
  communityService: CommunityServiceEntry;
  athletics: AthleticsEntry;
  activities: ActivityEntry;
  summerExperience: SummerExperienceEntry;
};

// ── Hook ────────────────────────────────────────────────────────────────────

export function useResume() {
  const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME);
  const [loaded, setLoaded] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [importFlash, setImportFlash] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(RESUME_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as ResumeData;
        setResume(parsed);
      } else {
        // Seed from profile/GPA calc on first load
        setResume(buildInitialResume(EMPTY_RESUME));
      }
    } catch {
      setResume(EMPTY_RESUME);
    }
    setLoaded(true);
  }, []);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
      } catch { /* ignore quota errors */ }
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [resume, loaded]);

  // ── Basic info ────────────────────────────────────────────────────────────
  const updateBasicInfo = useCallback((patch: Partial<BasicInfo>) => {
    setResume((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, ...patch } }));
  }, []);

  // ── Skills ────────────────────────────────────────────────────────────────
  const updateSkills = useCallback((patch: Partial<SkillsData>) => {
    setResume((prev) => ({ ...prev, skills: { ...prev.skills, ...patch } }));
  }, []);

  // ── Generic list-section operations ───────────────────────────────────────
  function addEntry<K extends ListSectionKey>(section: K, entry: EntryByKey[K]) {
    setResume((prev) => ({
      ...prev,
      [section]: [...prev[section], entry],
    }));
  }

  function updateEntry<K extends ListSectionKey>(
    section: K,
    id: string,
    patch: Partial<EntryByKey[K]>
  ) {
    setResume((prev) => ({
      ...prev,
      [section]: prev[section].map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    }));
  }

  function removeEntry<K extends ListSectionKey>(section: K, id: string) {
    setResume((prev) => ({
      ...prev,
      [section]: prev[section].filter((e) => e.id !== id),
    }));
  }

  function moveEntry<K extends ListSectionKey>(
    section: K,
    id: string,
    direction: "up" | "down"
  ) {
    setResume((prev) => {
      const list = [...prev[section]];
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...prev, [section]: list };
    });
  }

  // ── Section-specific add shortcuts ────────────────────────────────────────

  const addEducation = useCallback(() => {
    addEntry("education", {
      id: generateResumeId(),
      school: "",
      graduationDate: "",
      gpa: "",
    });
  }, []);

  const addAward = useCallback(() => {
    addEntry("awards", {
      id: generateResumeId(),
      name: "",
      grades: "",
      description: "",
    });
  }, []);

  const addCommunityService = useCallback(() => {
    addEntry("communityService", {
      id: generateResumeId(),
      organization: "",
      role: "",
      grades: "",
      description: "",
      timeCommitment: "",
    });
  }, []);

  const addAthletics = useCallback(() => {
    addEntry("athletics", {
      id: generateResumeId(),
      sport: "",
      level: "",
      position: "",
      grades: "",
      achievements: "",
      timeCommitment: "",
    });
  }, []);

  const addActivity = useCallback(() => {
    addEntry("activities", {
      id: generateResumeId(),
      activityName: "",
      role: "",
      grades: "",
      description: "",
      leadership: false,
      impact: "",
    });
  }, []);

  const addSummerExperience = useCallback(() => {
    addEntry("summerExperience", {
      id: generateResumeId(),
      program: "",
      organization: "",
      duration: "",
      description: "",
      collegeCredit: false,
    });
  }, []);

  // ── Import from EC Evaluator ──────────────────────────────────────────────

  const importFromECs = useCallback(() => {
    const result = importFromECEvaluator(resume.activities);
    if (result.importedCount === 0) {
      setImportFlash(
        result.skippedCount > 0
          ? `No new activities — ${result.skippedCount} were already imported.`
          : "No activities found in EC Evaluator."
      );
    } else {
      setResume((prev) => ({
        ...prev,
        activities: [...prev.activities, ...result.activities],
      }));
      setImportFlash(
        `Imported ${result.importedCount} new activit${result.importedCount === 1 ? "y" : "ies"}` +
          (result.skippedCount > 0 ? ` (${result.skippedCount} duplicates skipped)` : "")
      );
    }
    setTimeout(() => setImportFlash(null), 4000);
  }, [resume.activities]);

  // ── Save manually (explicit button) ───────────────────────────────────────

  const saveNow = useCallback(() => {
    try {
      localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
      return true;
    } catch {
      return false;
    }
  }, [resume]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetResume = useCallback(() => {
    setResume(buildInitialResume(EMPTY_RESUME));
    try {
      localStorage.removeItem(RESUME_STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  // ── Replace a single activity entry (used by Activities Helper Mode) ──────

  const replaceActivity = useCallback(
    (id: string, patch: Partial<ActivityEntry>) => {
      updateEntry("activities", id, patch);
    },
    []
  );

  return {
    resume,
    loaded,
    saveFlash,
    importFlash,
    updateBasicInfo,
    updateSkills,
    // Education
    addEducation,
    updateEducation: (id: string, patch: Partial<EducationEntry>) =>
      updateEntry("education", id, patch),
    removeEducation: (id: string) => removeEntry("education", id),
    moveEducation: (id: string, dir: "up" | "down") =>
      moveEntry("education", id, dir),
    // Awards
    addAward,
    updateAward: (id: string, patch: Partial<AwardEntry>) =>
      updateEntry("awards", id, patch),
    removeAward: (id: string) => removeEntry("awards", id),
    moveAward: (id: string, dir: "up" | "down") =>
      moveEntry("awards", id, dir),
    // Community Service
    addCommunityService,
    updateCommunityService: (id: string, patch: Partial<CommunityServiceEntry>) =>
      updateEntry("communityService", id, patch),
    removeCommunityService: (id: string) => removeEntry("communityService", id),
    moveCommunityService: (id: string, dir: "up" | "down") =>
      moveEntry("communityService", id, dir),
    // Athletics
    addAthletics,
    updateAthletics: (id: string, patch: Partial<AthleticsEntry>) =>
      updateEntry("athletics", id, patch),
    removeAthletics: (id: string) => removeEntry("athletics", id),
    moveAthletics: (id: string, dir: "up" | "down") =>
      moveEntry("athletics", id, dir),
    // Activities
    addActivity,
    updateActivity: (id: string, patch: Partial<ActivityEntry>) =>
      updateEntry("activities", id, patch),
    removeActivity: (id: string) => removeEntry("activities", id),
    moveActivity: (id: string, dir: "up" | "down") =>
      moveEntry("activities", id, dir),
    replaceActivity,
    // Summer Experience
    addSummerExperience,
    updateSummerExperience: (id: string, patch: Partial<SummerExperienceEntry>) =>
      updateEntry("summerExperience", id, patch),
    removeSummerExperience: (id: string) => removeEntry("summerExperience", id),
    moveSummerExperience: (id: string, dir: "up" | "down") =>
      moveEntry("summerExperience", id, dir),
    // Meta
    importFromECs,
    saveNow,
    resetResume,
  };
}
