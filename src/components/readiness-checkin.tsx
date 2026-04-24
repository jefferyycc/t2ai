"use client";

import { useState } from "react";
import { ReadinessLevel, ReadinessCheckIn, TimeOfDay } from "@/lib/readiness";

type ReadinessResult = {
  level: ReadinessLevel;
  checkIn: ReadinessCheckIn;
};

type Props = {
  initialResult?: ReadinessResult | null;
};

const levelConfig: Record<
  ReadinessLevel,
  { label: string; bg: string; border: string; text: string }
> = {
  green: {
    label: "Ready to train",
    bg: "bg-green-50",
    border: "border-green-400",
    text: "text-green-800",
  },
  yellow: {
    label: "Train with caution",
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    text: "text-yellow-800",
  },
  red: {
    label: "Rest recommended",
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-800",
  },
};

export function ReadinessCheckin({ initialResult = null }: Props) {
  const [result, setResult] = useState<ReadinessResult | null>(initialResult);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  const [soreness, setSoreness] = useState(3);
  const [energy, setEnergy] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeOfDay, soreness, energy }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      const data = (await response.json()) as ReadinessResult;
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const config = levelConfig[result.level];
    return (
      <section className="surface-card">
        <p className="eyebrow">Readiness</p>
        <h2 className="section-title">Today&apos;s check-in</h2>
        <div
          className={`mt-4 p-4 ${config.bg} border-l-4 ${config.border} ${config.text} rounded`}
        >
          <p className="font-semibold text-base">{config.label}</p>
          <p className="text-sm mt-1">
            Soreness: {result.checkIn.soreness}/10 &middot; Energy:{" "}
            {result.checkIn.energy}/10 &middot;{" "}
            {result.checkIn.timeOfDay.charAt(0).toUpperCase() +
              result.checkIn.timeOfDay.slice(1)}
          </p>
        </div>
        <button
          className="secondary-button mt-4"
          onClick={() => setResult(null)}
        >
          Re-check in
        </button>
      </section>
    );
  }

  return (
    <section className="surface-card">
      <p className="eyebrow">Readiness</p>
      <h2 className="section-title">How are you feeling?</h2>
      <p className="muted-copy">
        Rate your soreness and energy to get a quick readiness assessment before
        today&apos;s session.
      </p>
      <form onSubmit={handleSubmit} className="mt-4" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label className="meta-label" htmlFor="timeOfDay">
            Time of day
          </label>
          <select
            id="timeOfDay"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
            style={{
              display: "block",
              marginTop: "0.25rem",
              width: "100%",
              padding: "0.375rem 0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          >
            <option value="morning">Morning</option>
            <option value="midday">Midday</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div>
          <label className="meta-label" htmlFor="soreness">
            Muscle soreness: <strong>{soreness}</strong> / 10
          </label>
          <input
            id="soreness"
            type="range"
            min={1}
            max={10}
            value={soreness}
            onChange={(e) => setSoreness(Number(e.target.value))}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280" }}>
            <span>1 – None</span>
            <span>10 – Severe</span>
          </div>
        </div>

        <div>
          <label className="meta-label" htmlFor="energy">
            Energy level: <strong>{energy}</strong> / 10
          </label>
          <input
            id="energy"
            type="range"
            min={1}
            max={10}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280" }}>
            <span>1 – Exhausted</span>
            <span>10 – Energized</span>
          </div>
        </div>

        {error && (
          <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={submitting}
        >
          {submitting ? "Checking in…" : "Check in"}
        </button>
      </form>
    </section>
  );
}
