"use client";

import React from "react";
import { motion } from "motion/react";
import { Plus, Trash2, MessageSquare, Check } from "lucide-react";
import type { ECConversation } from "@/lib/extracurricular-types";

interface ECActivityListProps {
  readonly conversations: ECConversation[];
  readonly activeConvId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onAdd: () => void;
}

export const ECActivityList: React.FC<ECActivityListProps> = ({
  conversations,
  activeConvId,
  onSelect,
  onRemove,
  onAdd,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-semibold">
          Activities ({conversations.length})
        </h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-[background-color,color,border-color,opacity] duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Activity
        </button>
      </div>

      {conversations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-zinc-500 text-sm mb-3">No activities yet</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-[background-color,color,border-color,opacity] duration-200"
          >
            <Plus className="w-4 h-4" />
            Describe Your First Activity
          </button>
        </div>
      )}

      <div className="space-y-2">
        {conversations.map((conv) => {
          const isActive = conv.id === activeConvId;
          const msgCount = conv.messages.filter((m) => m.role === "user").length;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group relative rounded-xl border p-3 cursor-pointer transition-[background-color,color,border-color,opacity] duration-200 ${
                isActive
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {conv.done ? (
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-white truncate">
                      {conv.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>{msgCount} message{msgCount !== 1 ? "s" : ""}</span>
                    {conv.done && (
                      <span className="text-green-400/70">Ready to evaluate</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/15 text-zinc-500 hover:text-red-300 transition-[background-color,color,border-color,opacity] duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
