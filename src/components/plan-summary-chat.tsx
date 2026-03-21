"use client";

import { useState, useEffect } from "react";
import { WorkoutPlan } from "@/lib/types";

type PlanSummaryChatProps = {
  planId: string;
};

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type AdjustResponse = {
  assistantMessage: string;
  updatedPlan: WorkoutPlan | null;
  error?: string;
};

export function PlanSummaryChat({ planId }: PlanSummaryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Do you want to adjust or swap out any exercises?",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const storageKey = `plan_adjustment_messages_${planId}`;

  useEffect(() => {
    setIsMounted(true);
    // Load from localStorage only once on mount or when planId changes
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    
    // Default message if no history for this plan
    setMessages([
      {
        role: "assistant",
        text: "Do you want to adjust or swap out any exercises?",
      }
    ]);
  }, [storageKey]);

  // Sync with localStorage on changes, but only after mounting
  useEffect(() => {
    if (isMounted && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, isMounted, storageKey]);

  async function requestAdjustment() {
    if (!input.trim()) return;

    setMessages((current) => [...current, { role: "user", text: input.trim() }]);
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plan/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process adjustment");
      }

      const data = (await response.json()) as AdjustResponse;
      
      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.updatedPlan) {
        setMessages((current) => [
          ...current,
          { role: "assistant", text: data.assistantMessage },
          { role: "assistant", text: "✅ Your plan has been adjusted. Check the breakdown above!" }
        ]);
        
        // Use a slight delay before reload to let user see the checkmark message
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setMessages((current) => [
          ...current,
          { role: "assistant", text: data.assistantMessage },
        ]);
      }
    } catch {
      setError("Plan adjustments are unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="surface-card">
      <p className="eyebrow">Adjustments</p>
      <h2 className="section-title">Modify your plan</h2>
      
      <div className="chat-thread compact-thread">
        {isMounted && messages.map((message, index) => (
          <div
            className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : ""}`}
            key={`${message.role}-${index}`}
          >
            <span className="chat-role">
              {message.role === "user" ? "You" : "Coach"}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {isLoading && <p className="status-text">Processing your request...</p>}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="chat-form" style={{ marginTop: '1rem' }}>
        <textarea
          className="text-input"
          rows={3}
          placeholder="Example: Can you swap goblet squats with something else?"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (input.trim() && !isLoading) {
                requestAdjustment();
              }
            }
          }}
        />
        <button
          className="primary-button mt-2"
          disabled={isLoading || !input.trim()}
          onClick={requestAdjustment}
          type="button"
        >
          {isLoading ? "Working..." : "Ask coach"}
        </button>
      </div>
    </section>
  );
}