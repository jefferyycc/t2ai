"use client";

import { useState } from "react";
import { SwapResponse, WorkoutDay } from "@/lib/types";

type SwapChatProps = {
  day: WorkoutDay;
};

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

export function SwapChat({ day }: SwapChatProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    day.exercises[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Choose an exercise, tell me what you want to change, and I will suggest a valid substitute based on your plan constraints.",
    },
  ]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<SwapResponse["suggestions"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(day);
  const [error, setError] = useState<string | null>(null);

  async function requestSwap() {
    if (!selectedExerciseId || !input.trim()) return;

    const exercise = currentDay.exercises.find((item) => item.id === selectedExerciseId);
    if (!exercise) return;

    setMessages((current) => [...current, { role: "user", text: input.trim() }]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/exercises/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayId: currentDay.id,
          exerciseId: exercise.id,
          message: input.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to suggest swap");
      }

      const data = (await response.json()) as SwapResponse;
      setSuggestions(data.suggestions);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.assistantMessage },
      ]);
      setInput("");
    } catch {
      setError("Swap suggestions are unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function acceptSwap(substituteExerciseId: string) {
    if (!selectedExerciseId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/exercises/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayId: currentDay.id,
          exerciseId: selectedExerciseId,
          acceptSubstituteId: substituteExerciseId,
          message: "Accept this substitution.",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply swap");
      }

      const data = (await response.json()) as SwapResponse;

      if (data.updatedDay) {
        setCurrentDay(data.updatedDay);
      }

      setSuggestions([]);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.assistantMessage },
      ]);
    } catch {
      setError("Could not apply the substitution.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="workout-grid">
      <section className="surface-card">
        <p className="eyebrow">Workout day</p>
        <h1 className="section-title-lg">{currentDay.title}</h1>
        <p className="muted-copy">{currentDay.focus}</p>
        {currentDay.exercises.length === 0 ? (
          <p className="empty-state">No exercises were generated for this day.</p>
        ) : (
          <div className="exercise-stack">
            {currentDay.exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className={`exercise-card ${selectedExerciseId === exercise.id ? "exercise-card-active" : ""}`}
                onClick={() => setSelectedExerciseId(exercise.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="exercise-name">{exercise.name}</p>
                    {exercise.isUpdated && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 animate-pulse">
                        ADJUSTED
                      </span>
                    )}
                  </div>
                  <p className="muted-copy">
                    {exercise.sets} sets x {exercise.reps}
                  </p>
                </div>
                <span className="exercise-rest">{exercise.restSeconds}s rest</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card">
        <p className="eyebrow">Swap coach</p>
        <h2 className="section-title">Modify this workout day</h2>
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
        </div>

        {suggestions.length > 0 ? (
          <div className="suggestion-stack">
            {suggestions.map((suggestion) => (
              <div className="suggestion-card" key={suggestion.exerciseId}>
                <div>
                  <p className="exercise-name">{suggestion.name}</p>
                  <p className="muted-copy">{suggestion.reason}</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => acceptSwap(suggestion.exerciseId)}
                  type="button"
                >
                  Accept swap
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="chat-form">
          <textarea
            className="text-input"
            rows={4}
            placeholder="Example: I don’t like this movement because it bothers my shoulders and I want something more stable."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            className="primary-button"
            disabled={isLoading || !selectedExerciseId || !input.trim()}
            onClick={requestSwap}
            type="button"
          >
            {isLoading ? "Working..." : "Ask for substitute"}
          </button>
        </div>
      </section>
    </div>
  );
}
