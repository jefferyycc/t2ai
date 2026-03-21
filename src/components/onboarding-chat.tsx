"use client";

import Link from "next/link";
import { useState } from "react";
import { OnboardingDraft, OnboardingResponse } from "@/lib/types";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const initialDraft: OnboardingDraft = {
  limitations: [],
};

export function OnboardingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "tell me your work out goal, how many training days per week, workout duration for each session, experience level, and injuries or limitations to avoid",
    },
  ]);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages((current) => [...current, { role: "user", text: userText }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          draft,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const data = (await response.json()) as OnboardingResponse;
      setDraft(data.draft);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.assistantMessage },
      ]);
      setComplete(data.planGenerated);
    } catch {
      setError("Something went wrong while saving your profile. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="surface-card full-height-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">AI onboarding</p>
          <h2 className="section-title-lg">Build your first plan in one chat.</h2>
        </div>
      </div>

      <div className="chat-thread">
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
        {isLoading ? <p className="status-text">Generating your next step...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          className="text-input"
          rows={4}
          placeholder="Example: My goal is strength. I can train 4 days a week for 45 minutes. I’m intermediate and want to avoid shoulder pain."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="chat-actions">
          <button className="primary-button" disabled={isLoading || !input.trim()} type="submit">
            {isLoading ? "Saving..." : "Send"}
          </button>
          {complete ? (
            <Link className="secondary-button" href="/dashboard">
              Open dashboard
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}
