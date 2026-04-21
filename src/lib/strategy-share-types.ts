// Shared between client + server for the strategy share flow.

import type { StrategyResult, StrategyAnalysis } from "./strategy-types";

export interface StrategyShareSnapshot {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
  readonly profileMeta: {
    readonly graduationYear: string | null;
    readonly intendedMajor: string | null;
    readonly pinnedNames: readonly string[];
    readonly pinnedPlans: Record<string, string | undefined>;
  };
  readonly capturedAt: number;
}

export interface StrategyShareRow {
  readonly token: string;
  readonly url: string;
  readonly createdAt: string;     // ISO
  readonly expiresAt: string;     // ISO
}
