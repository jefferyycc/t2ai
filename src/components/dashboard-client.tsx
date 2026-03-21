"use client";

import Link from "next/link";
import { useState } from "react";

import { DashboardSnapshot } from "@/lib/types";

type DashboardClientProps = {
  initialSnapshot: DashboardSnapshot;
};

export function DashboardClient({ initialSnapshot }: DashboardClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshState() {
    const response = await fetch("/api/app-state");
    const data = (await response.json()) as DashboardSnapshot;
    setSnapshot(data);
  }

  async function handleRefreshPlan() {
    setRefreshing(true);
    setMessage("");

    const response = await fetch("/api/plan/refresh", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Unable to refresh the plan yet.");
      setRefreshing(false);
      return;
    }

    setMessage(data.update.summary);
    await refreshState();
    setRefreshing(false);
  }

  return (
    <main className="page-shell">
      <section className="content-wrap">
        <div className="hero-copy compact-hero">
          <div>
            <p className="label">Dashboard</p>
            <h1 className="dashboard-title">T2AI performance cockpit</h1>
            <p className="hero-description">
              Your plan is grounded in imported Hevy + Oura history and adapted
              conservatively with deterministic rules.
            </p>
          </div>
          <div className="button-row">
            <Link className="secondary-button inline-button" href="/">
              Back to onboarding
            </Link>
            <button
              className="primary-button"
              type="button"
              onClick={handleRefreshPlan}
              disabled={refreshing || !snapshot.planBundle}
            >
              {refreshing ? "Refreshing..." : "Refresh plan"}
            </button>
          </div>
        </div>

        {message ? <p className="success-text">{message}</p> : null}

        <section className="dashboard-grid">
          <div className="dashboard-card dashboard-card-highlight">
            <p className="section-title">Movement analytics</p>
            {snapshot.recentAnalyses[0] ? (
              <div className="analysis-card compact-analysis-card">
                <p className="subtle-copy">
                  Latest check: {snapshot.recentAnalyses[0].exerciseType} •{" "}
                  {snapshot.recentAnalyses[0].method} • confidence{" "}
                  {(snapshot.recentAnalyses[0].confidenceScore * 100).toFixed(0)}%
                </p>
                <div className="signal-grid">
                  <div className="signal-card">
                    <span className="metric-label">Form score</span>
                    <strong>{snapshot.recentAnalyses[0].formScore}/100</strong>
                  </div>
                  <div className="signal-card">
                    <span className="metric-label">Depth</span>
                    <strong>{snapshot.recentAnalyses[0].movementSignals.depth}</strong>
                  </div>
                  <div className="signal-card">
                    <span className="metric-label">Next set</span>
                    <strong>{snapshot.recentAnalyses[0].nextSetRecommendation}</strong>
                  </div>
                </div>
                <p className="body-copy">{snapshot.recentAnalyses[0].coachSummary}</p>
                <Link
                  className="secondary-button inline-button"
                  href={`/workout/${snapshot.recentAnalyses[0].workoutDayId}`}
                >
                  Reopen workout day
                </Link>
              </div>
            ) : (
              <p className="empty-text">
                No movement analysis yet. Upload a side-view squat or deadlift
                clip from a workout day to populate this module.
              </p>
            )}
          </div>

          <div className="dashboard-card">
            <p className="section-title">Current plan</p>
            {snapshot.planBundle ? (
              <>
                <p className="body-copy">{snapshot.planBundle.plan.summary}</p>
                <ul className="split-list">
                  {snapshot.planBundle.days.map((day) => (
                    <li key={day.id}>
                      <div>
                        <strong>{day.label}</strong>
                        <p className="subtle-copy">{day.focus}</p>
                      </div>
                      <Link className="card-link" href={`/workout/${day.id}`}>
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="empty-text">
                No plan yet. Go back to onboarding and generate one first.
              </p>
            )}
          </div>

          <div className="dashboard-card">
            <p className="section-title">Real-data overview</p>
            <div className="metric-grid">
              <div className="metric-card">
                <span className="metric-label">14-day training</span>
                <strong>{snapshot.importedDemoData.rollingSummary.last14DayTrainingFrequency}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Readiness avg</span>
                <strong>{snapshot.importedDemoData.rollingSummary.last7DayReadinessAvg ?? "--"}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Sleep avg</span>
                <strong>{snapshot.importedDemoData.rollingSummary.last7DaySleepAvg ?? "--"}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Volume trend</span>
                <strong>{snapshot.importedDemoData.rollingSummary.recentVolumeTrend}</strong>
              </div>
            </div>
            <p className="body-copy">
              Preferred split inferred from history:{" "}
              <strong>{snapshot.importedDemoData.preferredSplit}</strong>
            </p>
            <p className="body-copy">
              Top recent exercises:{" "}
              {snapshot.importedDemoData.rollingSummary.topExercisesLast14Days.join(", ")}
            </p>
          </div>

          <div className="dashboard-card">
            <p className="section-title">Recent sessions</p>
            {snapshot.recentSessions.length > 0 ? (
              <ul className="simple-list">
                {snapshot.recentSessions.map((session) => (
                  <li key={session.id}>
                    <div className="session-history-item">
                      <span>
                        {session.summary}{" "}
                        <span className="subtle-copy">
                          {new Date(session.completedAt).toLocaleDateString()}
                        </span>
                      </span>
                      {session.analysisSummary ? (
                        <span className="session-analysis-tag">
                          Form {session.analysisFormScore}/100 • {session.analysisSummary}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">
                No saved sessions yet. Log one from a workout day page.
              </p>
            )}
          </div>

          <div className="dashboard-card">
            <p className="section-title">Recent video analyses</p>
            {snapshot.recentAnalyses.length > 0 ? (
              <ul className="simple-list">
                {snapshot.recentAnalyses.map((analysis) => (
                  <li key={analysis.id}>
                    <div className="session-history-item">
                      <span>
                        <strong>{analysis.exerciseType}</strong> • {analysis.method} • form
                        score {analysis.formScore} / 100 • confidence{" "}
                        {(analysis.confidenceScore * 100).toFixed(0)}%
                      </span>
                      <Link
                        className="card-link"
                        href={`/workout/${analysis.workoutDayId}`}
                      >
                        Open workout
                      </Link>
                    </div>
                    <div className="analysis-summary-block">
                      <span>{analysis.movementSignals.depth}</span>
                      <span>{analysis.movementSignals.torsoControl}</span>
                      <span>{analysis.nextSetRecommendation}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">
                No analysis yet. Upload a side-view squat or deadlift clip from
                a workout day.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
