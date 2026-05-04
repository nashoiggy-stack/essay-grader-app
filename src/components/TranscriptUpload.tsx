"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { setItemAndNotify } from "@/lib/sync-event";

interface TranscriptUploadProps {
  /** Called after localStorage has been updated so the iframe can reload */
  readonly onSuccess?: () => void;
}

type Status = "idle" | "uploading" | "success" | "error";

export const TranscriptUpload: React.FC<TranscriptUploadProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setFileNames(files.map((f) => f.name));
    setStatus("uploading");
    setMessage(
      files.length === 1
        ? "Reading your transcript..."
        : `Reading ${files.length} transcripts and merging...`
    );

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/parse-transcript", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to parse transcript.");
        return;
      }

      if (!data.years || data.years.length === 0) {
        setStatus("error");
        setMessage("No grades found in the document(s).");
        return;
      }

      // Persist through cloud-storage; setItemAndNotify also dispatches the
      // "profile-source-updated" event the iframe and downstream hooks listen
      // for, so a single call covers both the cache write and the wake-up.
      setItemAndNotify("gpa-calc-v1", JSON.stringify(data));

      const totalClasses = data.years.reduce(
        (sum: number, y: { rows: unknown[] }) => sum + y.rows.length,
        0
      );
      setStatus("success");
      setMessage(`Extracted ${totalClasses} classes across ${data.years.length} year${data.years.length > 1 ? "s" : ""}. Reloading calculator...`);

      setTimeout(() => {
        onSuccess?.();
      }, 800);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleUpload(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) handleUpload(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const statusIcon = {
    idle: <Upload className="w-5 h-5" />,
    uploading: <Loader2 className="w-5 h-5 animate-spin" />,
    success: <CheckCircle2 className="w-5 h-5 text-tier-safety-fg" />,
    error: <AlertCircle className="w-5 h-5 text-tier-unlikely-fg" />,
  }[status];

  const statusBorder = {
    idle: "border-border-hair hover:border-accent-line",
    uploading: "border-accent-line",
    success: "border-tier-safety-fg/40",
    error: "border-tier-unlikely-fg/40",
  }[status];

  return (
    <div className="mb-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        className={`cursor-pointer rounded-md bg-bg-surface border ${statusBorder} p-6 transition-colors duration-200`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={status === "uploading"}
        />
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-md bg-bg-inset border border-border-hair flex items-center justify-center text-text-secondary">
            {statusIcon}
          </div>
          <div className="flex-1 min-w-0">
            {status === "idle" && (
              <>
                <p className="text-sm font-semibold text-text-primary mb-0.5">Upload your transcript(s)</p>
                <p className="text-xs text-text-muted">
                  PDF or image — upload one or more files and we'll merge them automatically
                </p>
              </>
            )}
            {status === "uploading" && (
              <>
                <p className="text-sm font-semibold text-accent-text mb-0.5 truncate">
                  {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files: ${fileNames.join(", ")}`}
                </p>
                <p className="text-xs text-text-secondary">{message}</p>
              </>
            )}
            {status === "success" && (
              <>
                <p className="text-sm font-semibold text-tier-safety-fg mb-0.5">Transcript read successfully</p>
                <p className="text-xs text-text-secondary">{message}</p>
              </>
            )}
            {status === "error" && (
              <>
                <p className="text-sm font-semibold text-tier-unlikely-fg mb-0.5">Couldn't read transcript</p>
                <p className="text-xs text-text-secondary">{message}</p>
              </>
            )}
          </div>
          {status === "idle" && (
            <FileText className="flex-shrink-0 w-5 h-5 text-text-faint" strokeWidth={1.5} />
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-text-faint text-center">
        Experimental — review the extracted grades and edit if needed.
      </p>
    </div>
  );
};
