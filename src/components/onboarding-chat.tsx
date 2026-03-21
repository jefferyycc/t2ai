"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingDraft, OnboardingResponse } from "@/lib/types";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const initialDraft: OnboardingDraft = {
  limitations: [],
};

export function OnboardingChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [input, setInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    let cancelled = false;

    async function loadInitialMessage() {
      try {
        const response = await fetch("/api/profile");

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Failed to load the onboarding coach.");
        }

        const data = (await response.json()) as { assistantMessage: string };

        if (!cancelled) {
          setMessages([{ role: "assistant", text: data.assistantMessage }]);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load the onboarding coach.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void loadInitialMessage();

    return () => {
      cancelled = true;
    };
  }, [isMounted]);

  useEffect(() => {
    if (complete) {
      if (countdown <= 0) {
        router.push("/dashboard");
        return;
      }
      
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [complete, countdown, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() || isLoading || isInitializing) return;

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
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to save profile");
      }

      const data = (await response.json()) as OnboardingResponse;
      setDraft(data.draft);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.assistantMessage },
      ]);
      setComplete(data.planGenerated);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving your profile. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="surface-card full-height-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">AI onboarding</p>
          <h2 className="section-title-lg">Build your training plan in one chat</h2>
        </div>
      </div>

      {!isMounted ? (
        <div className="chat-thread">
          <p className="status-text">Loading chat...</p>
        </div>
      ) : (
        <>
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
            {isInitializing || isLoading ? (
              <p className="status-text">Generating your next step...</p>
            ) : null}
            {complete ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 text-center my-4 animate-pulse">
                <p className="font-semibold text-lg">🎉 Your plan is ready!</p>
                <p className="text-sm opacity-90">Redirecting to your dashboard in {countdown} seconds...</p>
              </div>
            ) : null}
            {error ? <p className="error-text">{error}</p> : null}
          </div>

          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea
              className="text-input"
              rows={4}
              placeholder="Example: My goal is strength. I can train 4 days a week for 45 minutes. I’m intermediate and want to avoid shoulder pain."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (input.trim() && !isLoading && !isInitializing) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }
              }}
            />
            <div className="chat-actions">
              <button
                className="primary-button"
                disabled={isInitializing || isLoading || !input.trim()}
                type="submit"
              >
                {isLoading ? "Saving..." : "Send"}
              </button>
              {complete ? (
                <Link className="secondary-button" href="/dashboard">
                  Open dashboard
                </Link>
              ) : null}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
