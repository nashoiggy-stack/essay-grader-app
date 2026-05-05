"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { StrategyCard } from "@/components/StrategyCard";
import { ActionChecklist } from "@/components/ActionChecklist";
import { useActionChecklist } from "@/hooks/useActionChecklist";
import type { StrategyResult } from "@/lib/strategy-types";

export function ActionPlanCard({ result }: { readonly result: StrategyResult }) {
  const bullets = result.actionPlan.bullets ?? [];
  const { isDone, toggle, completedCount } = useActionChecklist(
    result.generatedAt,
    bullets.length,
  );

  return (
    <StrategyCard
      icon={<CheckCircle2 className="w-4 h-4" />}
      title="Action Plan"
      strength="neutral"
      headline={`${completedCount} of ${bullets.length} done`}
      defaultExpanded
      emphasize
      rightSlot={
        bullets.length > 0 ? (
          <span className="inline-flex items-center text-[11px] font-mono tabular-nums text-accent-text">
            {completedCount}/{bullets.length}
          </span>
        ) : null
      }
    >
      <div className="space-y-4 pt-3">
        {result.actionPlan.body && (
          <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
            {result.actionPlan.body}
          </p>
        )}
        <ActionChecklist items={bullets} isDone={isDone} onToggle={toggle} />
      </div>
    </StrategyCard>
  );
}
