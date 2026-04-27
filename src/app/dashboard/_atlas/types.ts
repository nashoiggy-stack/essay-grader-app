import type { ToolIconKey } from "./icons";

export type ToolState = "complete" | "in-progress" | "untouched";

export interface ToolStatus {
  readonly id: ToolIconKey;
  readonly label: string;
  readonly title: string;
  readonly blurb: string;
  readonly href: string;
  readonly state: ToolState;
  readonly metric: { readonly value: string; readonly scale: string; readonly caption: string };
  readonly next: string | null;
  readonly score: number;
}

export interface ActionItem {
  readonly severity: "now" | "soon" | "later";
  readonly title: string;
  readonly detail: string;
  readonly cta: string;
  readonly href: string;
}

export interface ShortlistEntry {
  readonly name: string;
  readonly location: string;
  readonly tier: "reach" | "target" | "likely" | "safety";
  readonly chance: number;
  readonly plan: string;
  readonly deadline: string;
}
