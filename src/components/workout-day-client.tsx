"use client";

import { useState } from "react";

import {
  VideoAnalysis,
  WorkoutDay,
  WorkoutExercise,
  WorkoutSession,
} from "@/lib/types";

type WorkoutDayClientProps = {
  day: WorkoutDay;
  initialExercises: WorkoutExercise[];
  initialSessions: WorkoutSession[];
};

export function WorkoutDayClient({
  day,
  initialExercises,
  initialSessions,
}: WorkoutDayClientProps) {
  const [exercises, setExercises] = useState(initialExercises);
  const [sessions, setSessions] = useState(initialSessions);
  const [swapTargetId, setSwapTargetId] = useState(initialExercises[0]?.id ?? "");
  const [swapFeedback, setSwapFeedback] = useState(
    "I want a machine or easier-setup alternative.",
  );
  const [swapResponse, setSwapResponse] = useState("");
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [logging, setLogging] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  async function handleSwap() {
    setSwapResponse("");
    const response = await fetch("/api/exercises/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutExerciseId: swapTargetId,
        feedback: swapFeedback,
      }),
    });

    const data = await response.json();
    setSwapResponse(data.assistantMessage ?? data.error ?? "No response.");

    if (data.updatedExercise) {
      setExercises((current) =>
        current.map((item) =>
          item.id === data.updatedExercise.id ? data.updatedExercise : item,
        ),
      );
    }
  }

  async function handleAnalyzeVideo() {
    if (!videoFile) {
      setAnalysisStatus("Choose a short side-view squat or deadlift video first.");
      return;
    }

    setAnalysisStatus("Uploading and analyzing...");

    const formData = new FormData();
    formData.append("file", videoFile);

    const uploadResponse = await fetch("/api/upload/video", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      setAnalysisStatus(uploadData.error ?? "Unable to upload the video.");
      return;
    }

    const analysisResponse = await fetch("/api/analysis/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: uploadData.upload.id,
        exerciseType: "squat",
      }),
    });
    const analysisData = await analysisResponse.json();

    if (!analysisResponse.ok) {
      setAnalysisStatus(analysisData.error ?? "Unable to analyze the video.");
      return;
    }

    setAnalysis(analysisData.analysis);
    setAnalysisStatus("Analysis ready.");
  }

  async function handleSaveSession() {
    setLogging(true);
    setSessionMessage("");

    const payload = {
      workoutDayId: day.id,
      summary: `${day.label} completed with ${exercises.length} tracked exercises.`,
      overallRpe: 7.5,
      setLogs: exercises.slice(0, 3).map((exercise) => ({
        workoutExerciseId: exercise.id,
        weightKg: 40,
        repsCompleted: 10,
        rpe: 7.5,
      })),
    };

    const response = await fetch("/api/session/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setSessionMessage(data.error ?? "Unable to save this session.");
      setLogging(false);
      return;
    }

    setSessions((current) => [data.session, ...current]);
    setSessionMessage("Session saved. Head back to the dashboard to refresh the plan.");
    setLogging(false);
  }

  return (
    <main className="page-shell">
      <section className="content-wrap">
        <div className="hero-copy compact-hero">
          <div>
            <p className="label">{day.label}</p>
            <h1 className="dashboard-title">{day.focus}</h1>
            <p className="hero-description">{day.notes}</p>
          </div>
          <div className="metric-card wide-metric">
            <span className="metric-label">Target duration</span>
            <strong>{day.durationMinutes} min</strong>
          </div>
        </div>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <p className="section-title">Workout details</p>
            <div className="workout-list">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="workout-item">
                  <div>
                    <strong>{exercise.order}. {exercise.exerciseName}</strong>
                    <p className="subtle-copy">{exercise.cue}</p>
                  </div>
                  <div className="workout-meta">
                    <span>{exercise.sets} sets</span>
                    <span>{exercise.reps}</span>
                    <span>{exercise.restSeconds}s rest</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <p className="section-title">Swap an exercise in chat</p>
            <label className="field">
              <span className="field-label">Exercise</span>
              <select
                className="field-input"
                value={swapTargetId}
                onChange={(event) => setSwapTargetId(event.target.value)}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.exerciseName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">What do you want to change?</span>
              <textarea
                className="field-input field-textarea"
                value={swapFeedback}
                onChange={(event) => setSwapFeedback(event.target.value)}
              />
            </label>
            <button className="primary-button" type="button" onClick={handleSwap}>
              Ask for a swap
            </button>
            {swapResponse ? <p className="body-copy swap-response">{swapResponse}</p> : null}
          </div>

          <div className="dashboard-card">
            <p className="section-title">Video analysis workflow</p>
            <p className="body-copy">
              MVP supports side-view squat or deadlift clips only. Analysis is
              mocked deterministically for hackathon stability.
            </p>
            <input
              className="field-input"
              type="file"
              accept="video/*"
              onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
            />
            <button className="primary-button" type="button" onClick={handleAnalyzeVideo}>
              Upload and analyze
            </button>
            {analysisStatus ? <p className="body-copy">{analysisStatus}</p> : null}
            {analysis ? (
              <div className="analysis-card">
                <p className="subtle-copy">
                  Rep count {analysis.repCount} • Form score {analysis.formScore}
                  {" "}• Confidence {(analysis.confidenceScore * 100).toFixed(0)}%
                </p>
                <ul className="simple-list">
                  {analysis.feedbackBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p className="body-copy">{analysis.nextSetRecommendation}</p>
              </div>
            ) : null}
          </div>

          <div className="dashboard-card">
            <p className="section-title">Session logging</p>
            <p className="body-copy">
              Save a quick session summary with conservative placeholder set logs
              for the MVP flow.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={handleSaveSession}
              disabled={logging}
            >
              {logging ? "Saving..." : "Save session"}
            </button>
            {sessionMessage ? <p className="body-copy">{sessionMessage}</p> : null}
            {sessions.length > 0 ? (
              <ul className="simple-list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    {session.summary}{" "}
                    <span className="subtle-copy">
                      {new Date(session.completedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">No saved sessions for this workout day yet.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
