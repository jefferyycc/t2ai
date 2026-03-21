"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkoutPlan } from "@/lib/types";

type PlanSummaryChatProps = {};

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type AdjustResponse = {
  assistantMessage: string;
  updatedPlan: WorkoutPlan | null;
  error?: string;
};

export function PlanSummaryChat({}: PlanSummaryChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Do you want to adjust or swap out any exercises?",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // router.refresh() tells Next.js to fetch the latest server data (the new plan) 
        // without losing the current client component state (the chat history).
        router.refresh(); 
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
        {messages.map((message, index) => (
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