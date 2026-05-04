"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAtlasData } from "./use-atlas-data";
import { TOOL_ICON } from "./icons";
import {
  IconArrow,
  IconRefresh,
  IconSchool,
  IconSpark,
  IconUser,
} from "./icons";
import type { ActionItem, ShortlistEntry, ToolStatus } from "./types";
import "../dashboard-atlas.css";
import { getCachedRaw, setRaw, type CloudKey } from "@/lib/cloud-storage";

type Layout = "atlas" | "list";

const LAYOUT_STORAGE_KEY: CloudKey = "admitedge-profile-layout";

const TIER_META: Record<ShortlistEntry["tier"], { label: string; note: string }> = {
  unlikely: { label: "Unlikely", note: "<5% chance" },
  reach:    { label: "Reach",    note: "5–19%" },
  target:   { label: "Target",   note: "20–39%" },
  likely:   { label: "Likely",   note: "40–69%" },
  safety:   { label: "Safety",   note: "70%+" },
};

function studentInitials(name: string): string {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "—";
}

export function AtlasPage() {
  const data = useAtlasData();
  const [layout, setLayout] = useState<Layout>("atlas");
  const [focusToolId, setFocusToolId] = useState<string | null>(null);

  useEffect(() => {
    const saved = getCachedRaw(LAYOUT_STORAGE_KEY);
    if (saved === "atlas" || saved === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayout(saved);
    } else if (saved === "orbital") {
      // Orbital mode was dropped; migrate any persisted preference to atlas.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayout("atlas");
    }
  }, []);

  useEffect(() => {
    setRaw(LAYOUT_STORAGE_KEY, layout);
  }, [layout]);

  if (!data.loaded) {
    return (
      <div className="ae-root">
        <div className="ae-loading"><div className="ae-loading-spin" /></div>
      </div>
    );
  }

  const focused = focusToolId
    ? data.tools.find((x) => x.id === focusToolId) ?? data.tools[0]
    : data.tools.find((x) => x.state === "in-progress") ?? data.tools[0];

  const firstName = data.studentName ? data.studentName.split(" ")[0] : "";
  const isEmpty = !data.studentName && data.tools.every((t) => t.state === "untouched");

  return (
    <div className="ae-root" data-layout={layout}>
      <main id="main-content" className="ae-main">
        <Header data={data} firstName={firstName} isEmpty={isEmpty} />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -32 }}>
          <LayoutTweaks layout={layout} onChange={setLayout} />
        </div>

        {layout === "atlas" && (
          <AtlasLayout tools={data.tools} focused={focused} setFocusTool={setFocusToolId} />
        )}
        {layout === "list" && (
          <ListLayout tools={data.tools} setFocusTool={setFocusToolId} />
        )}

        {data.actions.length > 0 && <ActionQueue actions={data.actions} />}
        {data.shortlist.length > 0 && <Shortlist shortlist={data.shortlist} />}

        <Footer />
      </main>
    </div>
  );
}

// ── Layout tweaks ────────────────────────────────────────────────────
function LayoutTweaks({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  return (
    <div className="ae-tweaks" role="group" aria-label="Profile layout">
      {(["atlas", "list"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          className={`ae-tweak-btn ${layout === opt ? "is-active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt[0].toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────
interface HeaderProps {
  readonly data: ReturnType<typeof useAtlasData>;
  readonly firstName: string;
  readonly isEmpty: boolean;
}
function Header({ data, firstName, isEmpty }: HeaderProps) {
  const { snapshot, readiness, completedCount, inProgressCount, tools, studentSchool, studentGradYear, studentMajor, studentInterest } = data;
  return (
    <section className="ae-header">
      <div className="ae-header-meta">
        <div className="ae-eyebrow">
          <span className="ae-eyebrow-dot" /> Dashboard
        </div>
        <h1 className="ae-name">
          {isEmpty
            ? "Welcome."
            : firstName
            ? `${firstName}'s admissions year.`
            : "Your admissions year."}
        </h1>
        <p className="ae-tagline">
          {isEmpty ? (
            "Your stats and tool history live here. As you use AdmitEdge, this page becomes the single source of truth across every tool."
          ) : (
            <>
              {studentGradYear && <>Class of {studentGradYear}</>}
              {studentSchool && <> · {studentSchool}</>}
              {studentMajor && (
                <>
                  {" · Pursuing "}
                  <em>{studentMajor}</em>
                  {studentInterest && (
                    <>
                      {" with an interest in "}
                      <em>{studentInterest}</em>
                    </>
                  )}
                </>
              )}
              {!studentGradYear && !studentSchool && !studentMajor && (
                <>Add your basic info and intended major to personalize this view.</>
              )}
            </>
          )}
        </p>
        {!isEmpty && (
          <div style={{ marginTop: 16 }}>
            <Link href="/profile" className="ae-btn ae-btn-primary">
              <IconUser size={14} /> Edit your profile
              <IconArrow size={14} />
            </Link>
          </div>
        )}
      </div>

      {isEmpty ? (
        // Empty state — a 7-stat grid of "—" with a 0% readiness bar
        // told a brand new user nothing they could act on. Replace it
        // with a single concrete next-step above the fold; users with
        // any partial data fall through to the stat grid below.
        <EmptyHero />
      ) : (
        <div className="ae-header-grid">
          <Stat
            big
            label="Profile readiness"
            value={`${readiness}%`}
            caption={`${completedCount} of ${tools.length} tools complete · ${inProgressCount} in progress`}
            progress={readiness}
          />
          <Stat label="GPA, weighted" value={snapshot.gpaW} sub={snapshot.gpaUW !== "—" ? `${snapshot.gpaUW} unweighted` : ""} />
          {snapshot.sat !== "—" ? (
            <Stat
              label="SAT composite"
              value={snapshot.sat}
              sub={snapshot.satRW !== "—" || snapshot.satMath !== "—" ? `${snapshot.satRW} RW · ${snapshot.satMath} Math` : ""}
            />
          ) : (
            <Stat
              label="ACT composite"
              value={snapshot.act}
              sub={snapshot.act !== "—" ? "Average of E + M + R" : "Add SAT or ACT in Edit profile"}
            />
          )}
          <Stat
            label="AP scores"
            value={snapshot.apCount > 0 ? String(snapshot.apCount) : "—"}
            sub={snapshot.apCount > 0 ? `${snapshot.apFives}× 5 · avg ${snapshot.apAvg}` : ""}
          />
          <Stat label="Course rigor" value={snapshot.rigor} sub={snapshot.gpaW !== "—" ? "Auto from weighted GPA" : ""} />
          <Stat label="EC strength" value={snapshot.ecBand} sub={snapshot.ecBand !== "—" ? "From EC evaluator" : ""} />
          <Stat label="Essay grade" value={snapshot.essay} sub={snapshot.vspice !== "—" ? `VSPICE ${snapshot.vspice} / 24` : ""} />
        </div>
      )}
    </section>
  );
}

function EmptyHero() {
  return (
    <div className="ae-empty-hero">
      <div className="ae-empty-hero-text">
        <p className="ae-empty-eyebrow">First step</p>
        <h2 className="ae-empty-title">
          Start by pinning a few schools.
        </h2>
        <p className="ae-empty-sub">
          Every other tool — chance estimates, strategy, the application
          atlas — reads from your pinned list. Add 3-5 schools you&apos;re
          actually considering and the rest of this dashboard fills in.
        </p>
      </div>
      <div className="ae-empty-cta-row">
        <Link href="/colleges" className="ae-btn ae-btn-primary">
          <IconSchool size={14} /> Pin your first school
          <IconArrow size={14} />
        </Link>
        <Link href="/profile" className="ae-btn ae-btn-secondary">
          Or build your profile
          <IconArrow size={14} />
        </Link>
      </div>
    </div>
  );
}

interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly caption?: string;
  readonly progress?: number;
  readonly big?: boolean;
}
function Stat({ label, value, sub, caption, progress, big }: StatProps) {
  return (
    <div className={`ae-stat ${big ? "ae-stat-big" : ""}`}>
      <div className="ae-stat-label">{label}</div>
      <div className="ae-stat-value">{value}</div>
      {sub && <div className="ae-stat-sub">{sub}</div>}
      {caption && <div className="ae-stat-caption">{caption}</div>}
      {typeof progress === "number" && (
        <div className="ae-stat-bar">
          <div className="ae-stat-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

// ── Atlas layout ─────────────────────────────────────────────────────
interface LadderProps {
  readonly tools: readonly ToolStatus[];
  readonly focused: ToolStatus | undefined;
  readonly setFocusTool: (id: string) => void;
}
function AtlasLayout({ tools, focused, setFocusTool }: LadderProps) {
  return (
    <section className="ae-atlas">
      <div className="ae-atlas-head">
        <div>
          <div className="ae-section-eyebrow">Tools</div>
          <h2 className="ae-section-title">Where every tool stands</h2>
        </div>
        <div className="ae-section-aside">
          Click a tool. Numbers come from your last session.
        </div>
      </div>

      <div className="ae-atlas-body">
        <div className="ae-ladder">
          {tools.map((tool, i) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              index={i}
              active={focused?.id === tool.id}
              onClick={() => setFocusTool(tool.id)}
            />
          ))}
        </div>
        <div className="ae-ladder-detail">
          {focused && <ToolDetail tool={focused} />}
        </div>
      </div>
    </section>
  );
}

const STATE_META: Record<ToolStatus["state"], { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "is-complete" },
  "in-progress": { label: "In progress", cls: "is-progress" },
  untouched: { label: "Not started", cls: "is-untouched" },
};

interface ToolRowProps {
  readonly tool: ToolStatus;
  readonly index: number;
  readonly active: boolean;
  readonly onClick: () => void;
}
function ToolRow({ tool, index, active, onClick }: ToolRowProps) {
  const Ic = TOOL_ICON[tool.id];
  const meta = STATE_META[tool.state];
  return (
    <button
      type="button"
      className={`ae-tool-row ${active ? "is-active" : ""} ${meta.cls}`}
      onClick={onClick}
    >
      <div className="ae-tool-row-num">{String(index + 1).padStart(2, "0")}</div>
      <div className="ae-tool-row-icon">
        <Ic size={18} />
      </div>
      <div className="ae-tool-row-main">
        <div className="ae-tool-row-title">{tool.title}</div>
        <div className="ae-tool-row-blurb">{tool.blurb}</div>
      </div>
      <div className="ae-tool-row-metric">
        <div className="ae-tool-row-value">
          {tool.metric.value}
          <span className="ae-tool-row-scale">{tool.metric.scale}</span>
        </div>
        <div className="ae-tool-row-state">
          <span className="ae-state-dot" />
          {meta.label}
        </div>
      </div>
      <div className="ae-tool-row-progress">
        <div
          className="ae-tool-row-progress-fill"
          style={{ width: `${Math.max(2, tool.score * 100)}%` }}
        />
      </div>
    </button>
  );
}

function ToolDetail({ tool }: { tool: ToolStatus }) {
  const Ic = TOOL_ICON[tool.id];
  return (
    <div className="ae-detail">
      <div className="ae-detail-icon"><Ic size={22} /></div>
      <div className="ae-detail-eyebrow">{tool.state.replace("-", " ")}</div>
      <h3 className="ae-detail-title">{tool.title}</h3>
      <p className="ae-detail-blurb">{tool.blurb}</p>

      <div className="ae-detail-metric">
        <div className="ae-detail-value">
          {tool.metric.value}
          <span className="ae-detail-scale">{tool.metric.scale}</span>
        </div>
        <div className="ae-detail-caption">{tool.metric.caption}</div>
      </div>

      {tool.next && (
        <div className="ae-detail-next">
          <div className="ae-detail-next-label">
            <IconSpark size={11} /> Next move
          </div>
          <div className="ae-detail-next-text">{tool.next}</div>
        </div>
      )}

      <div className="ae-detail-cta">
        <Link href={tool.href} className="ae-btn ae-btn-primary">
          {tool.state === "untouched" ? "Get started" : `Open ${tool.label}`}
          <IconArrow size={14} />
        </Link>
      </div>
    </div>
  );
}

// Orbital layout dropped per CRITIQUE.md item #10. Geometry encoded a
// 3-bucket categorical (untouched / in-progress / complete) as radial
// distance — implying continuous precision the data didn't have. Atlas
// + List cover the use case; persisted "orbital" preferences are
// migrated to "atlas" in the load effect above.

// ── List layout ──────────────────────────────────────────────────────
function ListLayout({ tools, setFocusTool }: { tools: readonly ToolStatus[]; setFocusTool: (id: string) => void }) {
  return (
    <section className="ae-list">
      <div className="ae-atlas-head">
        <div>
          <div className="ae-section-eyebrow">Tools</div>
          <h2 className="ae-section-title">Tool log</h2>
        </div>
        <div className="ae-section-aside">Dense view of every tool&apos;s state.</div>
      </div>
      <div className="ae-list-table">
        <div className="ae-list-row ae-list-head">
          <div>#</div>
          <div>Tool</div>
          <div>Status</div>
          <div>Latest</div>
          <div>Score</div>
          <div>Readiness</div>
          <div></div>
        </div>
        {tools.map((tool, i) => {
          const Ic = TOOL_ICON[tool.id];
          return (
            <div key={tool.id} className={`ae-list-row ae-list-${tool.state}`}>
              <div className="ae-mono">{String(i + 1).padStart(2, "0")}</div>
              <div className="ae-list-tool">
                <div className="ae-list-tool-icon"><Ic size={14} /></div>
                <div>
                  <div className="ae-list-tool-name">{tool.title}</div>
                  <div className="ae-list-tool-blurb">{tool.blurb}</div>
                </div>
              </div>
              <div className="ae-list-status"><span className="ae-state-dot" />{tool.state.replace("-", " ")}</div>
              <div className="ae-list-latest">
                <span className="ae-list-latest-val">{tool.metric.value}</span>
                <span className="ae-list-latest-cap">{tool.metric.caption}</span>
              </div>
              <div className="ae-mono">{Math.round(tool.score * 100)}</div>
              <div className="ae-list-readiness">
                <div className="ae-list-readiness-bar"><div style={{ width: `${tool.score * 100}%` }} /></div>
              </div>
              <div>
                <Link href={tool.href} className="ae-list-open" onClick={() => setFocusTool(tool.id)}>
                  Open <IconArrow size={11} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Action queue ─────────────────────────────────────────────────────
function ActionQueue({ actions }: { actions: readonly ActionItem[] }) {
  return (
    <section className="ae-actions">
      <div className="ae-atlas-head">
        <div>
          <div className="ae-section-eyebrow">This week</div>
          <h2 className="ae-section-title">{actions.length === 1 ? "One thing" : `${actions.length} things`} that move your needle</h2>
        </div>
        <div className="ae-section-aside">Computed across every tool&apos;s current state.</div>
      </div>
      <div className="ae-actions-grid">
        {actions.map((a, i) => (
          <div key={`${a.title}-${i}`} className={`ae-action ae-action-${a.severity}`}>
            <div className="ae-action-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="ae-action-sev">
              <span className="ae-action-sev-dot" />
              {a.severity === "now" ? "Now" : a.severity === "soon" ? "This week" : "Later"}
            </div>
            <h3 className="ae-action-title">{a.title}</h3>
            <p className="ae-action-detail">{a.detail}</p>
            <Link href={a.href} className="ae-btn ae-btn-ghost ae-action-cta">
              {a.cta} <IconArrow size={12} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Shortlist ────────────────────────────────────────────────────────
function Shortlist({ shortlist }: { shortlist: readonly ShortlistEntry[] }) {
  const groups: Record<ShortlistEntry["tier"], ShortlistEntry[]> = {
    unlikely: [],
    reach: [],
    target: [],
    likely: [],
    safety: [],
  };
  for (const s of shortlist) groups[s.tier].push(s);
  // Render in lowest-chance-first order so Unlikely / Reach surface attention.
  const renderOrder: ShortlistEntry["tier"][] = ["unlikely", "reach", "target", "likely", "safety"];

  return (
    <section className="ae-shortlist">
      <div className="ae-atlas-head">
        <div>
          <div className="ae-section-eyebrow">College shortlist</div>
          <h2 className="ae-section-title">{shortlist.length} pinned · 5 tiers</h2>
        </div>
        <div className="ae-section-aside">Sourced from College List · ranked by chance</div>
      </div>
      <div className="ae-shortlist-grid">
        {renderOrder.map((tier) => {
          const schools = groups[tier];
          return (
            <div key={tier} className={`ae-tier ae-tier-${tier}`}>
              <div className="ae-tier-head">
                <div className="ae-tier-label">{TIER_META[tier].label}</div>
                <div className="ae-tier-count">{schools.length}</div>
                <div className="ae-tier-note">{TIER_META[tier].note}</div>
              </div>
              <div className="ae-tier-list">
                {schools.length === 0 ? (
                  <div className="ae-tier-empty">No {TIER_META[tier].label.toLowerCase()} schools pinned yet.</div>
                ) : (
                  schools.map((s) => (
                    <div key={s.name} className="ae-school">
                      <div className="ae-school-name">{s.name}</div>
                      <div className="ae-school-meta">
                        <span className="ae-school-loc">{s.location}</span>
                        <span className="ae-school-chance ae-mono">{s.chance}%</span>
                      </div>
                      <div className="ae-school-deadline">
                        <span className="ae-school-plan">{s.plan}</span>
                        <span>· {s.deadline}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="ae-footer">
      <div>
        <div className="ae-footer-eyebrow">AdmitEdge · Profile</div>
        <div className="ae-footer-tag">All your prep in one place. Synced across devices.</div>
      </div>
      <div className="ae-footer-cta">
        <Link href="/profile" className="ae-btn ae-btn-ghost">
          <IconRefresh size={13} /> Edit raw profile
        </Link>
        <Link href="/strategy" className="ae-btn ae-btn-primary">
          Open Strategy <IconArrow size={13} />
        </Link>
      </div>
    </footer>
  );
}
