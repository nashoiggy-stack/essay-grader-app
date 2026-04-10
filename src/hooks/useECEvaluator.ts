"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ECConversation,
  ECMessage,
  ProfileEvaluation,
} from "@/lib/extracurricular-types";
import { EC_STORAGE_KEY, EC_ACTIVITIES_KEY } from "@/lib/extracurricular-types";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function deriveTitle(messages: ECMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Activity";
  const words = first.content.split(/\s+/).slice(0, 6).join(" ");
  return words.length < first.content.length ? `${words}...` : words;
}

export function useECEvaluator() {
  const [conversations, setConversations] = useState<ECConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [result, setResult] = useState<ProfileEvaluation | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved activities from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EC_ACTIVITIES_KEY);
      if (raw) {
        const saved: ECConversation[] = JSON.parse(raw);
        if (saved.length > 0) setConversations(saved);
      }
      const resultRaw = localStorage.getItem(EC_STORAGE_KEY);
      if (resultRaw) setResult(JSON.parse(resultRaw));
    } catch {
      // ignore
    }
  }, []);

  // Save activities to localStorage on change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(EC_ACTIVITIES_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) ?? null;

  const startNewActivity = useCallback(() => {
    const id = generateId();
    const newConv: ECConversation = { id, messages: [], done: false, title: "New Activity" };
    setConversations((prev) => [...prev, newConv]);
    setActiveConvId(id);
    setChatInput("");
  }, []);

  const selectActivity = useCallback((id: string) => {
    setActiveConvId(id);
    setChatInput("");
  }, []);

  const removeActivity = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) setActiveConvId(null);
  }, [activeConvId]);

  const markDone = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: true } : c))
    );
    setActiveConvId(null);
  }, []);

  const reopenActivity = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: false } : c))
    );
    setActiveConvId(id);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !activeConvId || chatLoading) return;

    const userMsg: ECMessage = { role: "user", content: chatInput.trim() };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConvId) return c;
        const updatedMessages = [...c.messages, userMsg];
        return {
          ...c,
          messages: updatedMessages,
          title: c.messages.length === 0 ? deriveTitle(updatedMessages) : c.title,
        };
      })
    );
    setChatInput("");
    setChatLoading(true);

    try {
      const conv = conversations.find((c) => c.id === activeConvId);
      const history = conv ? [...conv.messages, userMsg] : [userMsg];
      const allActivities = conversations.map((c) => ({
        title: c.title,
        done: c.done,
      }));

      const res = await fetch("/api/ec-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: history.slice(0, -1), // don't double-send the last message
          allActivities,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        const assistantMsg: ECMessage = { role: "assistant", content: data.reply };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, messages: [...c.messages, assistantMsg] }
              : c
          )
        );
      }
    } catch {
      const errorMsg: ECMessage = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
      );
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatInput, activeConvId, chatLoading, conversations]);

  const evaluate = useCallback(async () => {
    const doneConvs = conversations.filter((c) => c.done && c.messages.length > 0);
    if (doneConvs.length === 0) return;

    setEvaluating(true);
    setEvalError("");

    try {
      const res = await fetch("/api/ec-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations: doneConvs }),
      });

      const data = await res.json();

      if (data.error) {
        setEvalError(data.error);
        return;
      }

      setResult(data.result);
      localStorage.setItem(EC_STORAGE_KEY, JSON.stringify(data.result));
    } catch {
      setEvalError("Failed to evaluate. Please try again.");
    } finally {
      setEvaluating(false);
    }
  }, [conversations]);

  const resetAll = useCallback(() => {
    setConversations([]);
    setActiveConvId(null);
    setResult(null);
    setChatInput("");
    setEvalError("");
    localStorage.removeItem(EC_ACTIVITIES_KEY);
    localStorage.removeItem(EC_STORAGE_KEY);
  }, []);

  const doneCount = conversations.filter((c) => c.done).length;

  return {
    conversations,
    activeConversation,
    activeConvId,
    chatInput,
    chatLoading,
    evaluating,
    evalError,
    result,
    doneCount,
    chatEndRef,
    setChatInput,
    startNewActivity,
    selectActivity,
    removeActivity,
    markDone,
    reopenActivity,
    sendMessage,
    evaluate,
    resetAll,
  };
}
