"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card3D } from "./Card3D";
import { APP_CONFIG, LOADING_TEXT, UPLOAD_ACCEPT } from "@/data/mockData";

interface EssayInputProps {
  readonly essayText: string;
  readonly file: File | null;
  readonly dragging: boolean;
  readonly wordCount: number;
  readonly loading: boolean;
  readonly error: string;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onTextChange: (value: string) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDragLeave: () => void;
  readonly onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onOpenFilePicker: () => void;
  readonly onGrade: () => void;
  readonly onClear: () => void;
}

export const EssayInput: React.FC<EssayInputProps> = ({
  essayText, file, dragging, wordCount, loading, error,
  fileInputRef, onTextChange, onDrop, onDragOver, onDragLeave,
  onFileChange, onOpenFilePicker, onGrade, onClear,
}) => {
  const { min, max } = APP_CONFIG.idealWordRange;
  const inRange = wordCount >= min && wordCount <= max;

  return (
    <Card3D className="glass rounded-2xl p-6 sm:p-8" glowColor="rgba(99, 102, 241, 0.12)">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-zinc-300">Your essay</label>
        {essayText && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-xs font-mono px-2.5 py-1 rounded-full ${
              inRange
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
            }`}
          >
            {wordCount} words
            {inRange ? " — ideal" : wordCount < min ? ` — ${min - wordCount} short` : ` — ${wordCount - max} over`}
          </motion.span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none resize-y transition-all"
        rows={12}
        placeholder="Paste your Common App essay here..."
        value={essayText}
        onChange={(e) => onTextChange(e.target.value)}
      />

      {/* Drop zone */}
      <motion.div
        className={`mt-4 flex items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all cursor-pointer ${
          dragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onOpenFilePicker}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={onFileChange}
        />
        <p className="text-sm text-zinc-400">
          {file ? (
            <><span className="font-medium text-indigo-400">{file.name}</span> selected</>
          ) : (
            <><span className="font-medium text-indigo-400">Click to upload</span> or drag & drop PDF / Word doc</>
          )}
        </p>
      </motion.div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <motion.button
          onClick={onGrade}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 pointer-events-none"
            animate={{ backgroundPosition: loading ? ["0% 50%", "200% 50%"] : "0% 50%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: "200% 100%" }}
          />
          <span className="relative z-10 flex items-center gap-2">
            {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? "Analyzing..." : "Grade Essay"}
          </span>
        </motion.button>
        <button
          onClick={onClear}
          className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
        >
          Clear
        </button>
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 glass rounded-xl p-5 overflow-hidden animate-pulse-glow"
          >
            <p className="text-sm text-indigo-300 font-medium">{LOADING_TEXT}</p>
            <div className="mt-3 h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full bg-indigo-500/50 rounded-full shimmer w-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card3D>
  );
};
