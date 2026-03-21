"use client";

import Link from "next/link";
import { useState } from "react";

import { DashboardSnapshot, DaysPerWeek, EquipmentType, ExperienceLevel } from "@/lib/types";

type HomeClientProps = {
  initialSnapshot: DashboardSnapshot;
};

const equipmentOptions: Array<{ label: string; value: EquipmentType }> = [
  { label: "Bodyweight", value: "bodyweight" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Barbell", value: "barbell" },
  { label: "Gym machines", value: "gym-machines" },
  { label: "Resistance bands", value: "resistance-bands" },
  { label: "Cable", value: "cable" },
];

export function HomeClient({ initialSnapshot }: HomeClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: snapshot.activeUser?.name ?? "Jeff",
    goal:
      snapshot.activeProfile?.goal ??
      "Build muscle while keeping body fat in check and making workouts easier to sustain.",
    daysPerWeek: (snapshot.activeProfile?.daysPerWeek ?? 4) as DaysPerWeek,
    durationMinutes: snapshot.activeProfile?.durationMinutes ?? 50,
    experienceLevel:
      (snapshot.activeProfile?.experienceLevel ?? "intermediate") as ExperienceLevel,
    injuries: snapshot.activeProfile?.injuries.join(", ") ?? "right shoulder irritation",
    workoutPreferences:
      snapshot.activeProfile?.workoutPreferences ??
      "I like upper/lower splits, machine + dumbbell options, and fast substitutions when something feels off.",
    equipmentAccess:
      snapshot.activeProfile?.equipmentAccess ??
      snapshot.importedDemoData.preferredEquipment,
  });

  async function refreshSnapshot() {
    const response = await fetch("/api/app-state");
    const data = (await response.json()) as DashboardSnapshot;
    setSnapshot(data);
  }

  function toggleEquipment(value: EquipmentType) {
    setForm((current) => ({
      ...current,
      equipmentAccess: current.equipmentAccess.includes(value)
        ? current.equipmentAccess.filter((item) => item !== value)
        : [...current.equipmentAccess, value],
    }));
  }

  async function handleGeneratePlan() {
    try {
      setStatus("saving");
      setError("");

      const profileResponse = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          goal: form.goal,
          daysPerWeek: form.daysPerWeek,
          durationMinutes: form.durationMinutes,
          experienceLevel: form.experienceLevel,
          injuries: form.injuries
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          equipmentAccess: form.equipmentAccess,
          workoutPreferences: form.workoutPreferences,
        }),
      });

      if (!profileResponse.ok) {
        const data = await profileResponse.json();
        throw new Error(data.error ?? "Unable to save profile.");
      }

      const planResponse = await fetch("/api/plan/generate", { method: "POST" });
      if (!planResponse.ok) {
        const data = await planResponse.json();
        throw new Error(data.error ?? "Unable to generate plan.");
      }

      await refreshSnapshot();
      setStatus("idle");
    } catch (caughtError) {
      setStatus("error");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate the plan right now.",
      );
    }
  }

  return (
    <main className="page-shell">
      <section className="content-wrap">
        <div className="hero-copy">
          <p className="label">Train Train (T2AI)</p>
          <h1 className="hero-title">
            Personalized workouts powered by real training history, recovery
            signals, and Gemini.
          </h1>
          <p className="hero-description">
            T2AI uses imported Hevy and Oura history to build a personalized
            plan, adjust exercises through chat, add conservative movement
            analytics for squat and deadlift clips, and guide your next block
            without drifting into medical advice.
          </p>
        </div>

        <div className="two-column-grid">
          <section className="builder-panel">
            <div className="panel-header">
              <div>
                <p className="chat-heading">Chat onboarding</p>
                <p className="chat-subheading">
                  Start with the coach prompt, fill in your profile, and T2AI
                  will generate a first weekly plan.
                </p>
              </div>
              {snapshot.planBundle ? (
                <Link className="secondary-button inline-button" href="/dashboard">
                  Open dashboard
                </Link>
              ) : null}
            </div>

            <div className="chat-thread">
              <div className="chat-bubble assistant-bubble">
                <p className="message-role">T2AI</p>
                <p>
                  I pulled your recent Hevy and Oura history into demo mode.
                  Tell me your current goal, schedule, training background, and
                  anything I should avoid.
                </p>
              </div>
              <div className="chat-bubble user-bubble">
                <p className="message-role">You</p>
                <p>
                  I want a plan that fits my current schedule, respects my
                  limitations, and still lets me progress.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  className="field-input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field-label">Goal</span>
                <textarea
                  className="field-input field-textarea"
                  value={form.goal}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, goal: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field-label">Workout days / week</span>
                <select
                  className="field-input"
                  value={form.daysPerWeek}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      daysPerWeek: Number(event.target.value) as DaysPerWeek,
                    }))
                  }
                >
                  <option value={3}>3 days</option>
                  <option value={4}>4 days</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Session duration</span>
                <select
                  className="field-input"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                >
                  <option value={45}>45 min</option>
                  <option value={50}>50 min</option>
                  <option value={60}>60 min</option>
                  <option value={75}>75 min</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Experience</span>
                <select
                  className="field-input"
                  value={form.experienceLevel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      experienceLevel: event.target.value as ExperienceLevel,
                    }))
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Injuries / limitations to avoid</span>
                <input
                  className="field-input"
                  value={form.injuries}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, injuries: event.target.value }))
                  }
                  placeholder="shoulder irritation, lower back sensitivity"
                />
              </label>

              <label className="field field-span-2">
                <span className="field-label">Workout preferences</span>
                <textarea
                  className="field-input field-textarea"
                  value={form.workoutPreferences}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workoutPreferences: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="equipment-group">
              <p className="field-label">Equipment access</p>
              <div className="chip-row">
                {equipmentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip ${
                      form.equipmentAccess.includes(option.value) ? "chip-active" : ""
                    }`}
                    onClick={() => toggleEquipment(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={handleGeneratePlan}
                disabled={status === "saving"}
              >
                {status === "saving" ? "Generating..." : "Generate weekly plan"}
              </button>
              {snapshot.planBundle ? (
                <Link className="secondary-button inline-button" href="/dashboard">
                  View dashboard
                </Link>
              ) : null}
            </div>
          </section>

          <section className="dashboard-card">
            <p className="section-title">Imported data snapshot</p>
            <ul className="simple-list">
              <li>
                Real workout history imported from Hevy with{" "}
                {snapshot.importedDemoData.workoutHistory.length} recent sessions
                in the active 30-day window.
              </li>
              <li>
                Real Oura readiness / sleep / activity history from the last{" "}
                {snapshot.importedDemoData.recent30Days.length} days.
              </li>
              <li>
                Top recent exercises:{" "}
                {snapshot.importedDemoData.rollingSummary.topExercisesLast14Days.join(
                  ", ",
                )}
              </li>
              <li>Apple Health is unavailable in this MVP.</li>
              <li>
                Video analysis uses a lightweight heuristic layer with a
                conservative deterministic fallback.
              </li>
            </ul>

            <div className="metric-grid">
              <div className="metric-card">
                <span className="metric-label">Readiness avg</span>
                <strong>{snapshot.importedDemoData.rollingSummary.last7DayReadinessAvg ?? "--"}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Sleep avg</span>
                <strong>{snapshot.importedDemoData.rollingSummary.last7DaySleepAvg ?? "--"}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">14-day training</span>
                <strong>{snapshot.importedDemoData.rollingSummary.last14DayTrainingFrequency}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Volume trend</span>
                <strong>{snapshot.importedDemoData.rollingSummary.recentVolumeTrend}</strong>
              </div>
            </div>

            <div className="source-note-list">
              {snapshot.importedDemoData.sourceNotes.map((note) => (
                <p key={note} className="source-note">
                  {note}
                </p>
              ))}
            </div>
          </section>
        </div>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <p className="section-title">Generated split</p>
            {snapshot.planBundle ? (
              <ul className="split-list">
                {snapshot.planBundle.days.map((day) => (
                  <li key={day.id}>
                    <span>{day.label}</span>
                    <span>{day.focus}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">
                Generate a profile to see the weekly plan and workout-day links.
              </p>
            )}
          </div>

          <div className="dashboard-card">
            <p className="section-title">Suggested plan bias</p>
            <p className="body-copy">
              {snapshot.importedDemoData.rollingSummary.suggestedPlanBias}
            </p>
          </div>

          <div className="dashboard-card">
            <p className="section-title">What T2AI supports</p>
            <ul className="simple-list">
              <li>Chat onboarding and weekly plan generation</li>
              <li>Workout-day detail pages with sets, reps, and rest</li>
              <li>Chat-based exercise swaps with valid substitutions</li>
              <li>Squat / deadlift movement analytics with dashboard history</li>
              <li>Session logging and plan refresh</li>
            </ul>
          </div>

          <div className="dashboard-card">
            <p className="section-title">Example user journey</p>
            <ol className="simple-list numbered-list">
              <li>Complete onboarding in chat and generate the first plan.</li>
              <li>Open a workout day and swap one movement through chat.</li>
              <li>Upload a side-view squat or deadlift clip.</li>
              <li>Log the session and refresh the next block.</li>
            </ol>
          </div>
        </section>
      </section>
    </main>
  );
}
