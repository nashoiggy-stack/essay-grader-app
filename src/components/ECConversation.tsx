"use client";

import React from "react";
import { motion } from "motion/react";
import type { ECConversation as ECConvType } from "@/lib/extracurricular-types";

interface ECConversationProps {
  readonly conversation: ECConvType;
  readonly chatInput: string;
  readonly chatLoading: boolean;
  readonly chatEndRef: React.RefObject<HTMLDivElement | null>;
  readonly onInputChange: (value: string) => void;
  readonly onSend: () => void;
  readonly onDone: () => void;
}

export const ECConversationPanel: React.FC<ECConversationProps> = ({
  conversation,
  chatInput,
  chatLoading,
  chatEndRef,
  onInputChange,
  onSend,
  onDone,
}) => {
  const isEmpty = conversation.messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 min-h-[300px] max-h-[500px]">
        {isEmpty && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm mb-2">Describe your activity</p>
            <p className="text-zinc-600 text-xs max-w-sm mx-auto">
              Tell me about an extracurricular — what you did, your role, how long you&apos;ve been involved.
              I&apos;ll ask follow-up questions to help evaluate it.
            </p>
          </div>
        )}

        {conversation.messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-white/10 text-white ml-12"
                : "border border-white/10 bg-white/[0.03] text-zinc-300 mr-12"
            }`}
          >
            {msg.content}
          </motion.div>
        ))}

        {chatLoading && (
          <div className="border border-white/10 bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-zinc-500 italic mr-12">
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
              Thinking...
            </motion.span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <textarea
          className="flex-1 rounded-xl bg-white/[0.03] border border-white/10 p-3 text-sm text-white placeholder-zinc-600 resize-none focus:border-white/20 focus:ring-1 focus:ring-white/10 focus:outline-none transition-[border-color,box-shadow,background-color,color,opacity] duration-200"
          rows={2}
          placeholder={isEmpty ? "Describe your activity..." : "Add more detail or answer questions..."}
          value={chatInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          disabled={conversation.done}
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={onSend}
            disabled={!chatInput.trim() || chatLoading || conversation.done}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-[border-color,box-shadow,background-color,color,opacity] duration-200"
          >
            Send
          </button>
          {conversation.messages.length >= 2 && !conversation.done && (
            <button
              onClick={onDone}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-[border-color,box-shadow,background-color,color,opacity] duration-200"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
