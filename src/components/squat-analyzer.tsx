"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SquatRun } from "@/lib/types";
import { analyzeFrames } from "@/lib/squat/metrics";

type Status =
  | { kind: "idle" }
  | { kind: "loading-model" }
  | { kind: "extracting"; progress: number }
  | { kind: "scoring" }
  | { kind: "done"; run: SquatRun }
  | { kind: "error"; message: string };

export function SquatAnalyzer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Revoke blob URLs on unmount.
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      abortRef.current?.abort();
    };
  }, [videoUrl]);

  const onFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setStatus({ kind: "idle" });
    },
    [],
  );

  const startAnalysis = useCallback(async () => {
    if (!videoRef.current || !videoUrl) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      setStatus({ kind: "loading-model" });

      // Dynamically import so MediaPipe / WASM only loads when needed.
      const { processVideo } = await import("@/lib/squat/landmarks");

      // Wait for metadata so we know the duration.
      const video = videoRef.current;
      if (video.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            video.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          const onError = () => {
            video.removeEventListener("error", onError);
            reject(new Error("Could not load video metadata."));
          };
          video.addEventListener("loadedmetadata", onLoaded);
          video.addEventListener("error", onError);
        });
      }

      setStatus({ kind: "extracting", progress: 0 });
      const frames = await processVideo(video, {
        sampleRate: 10,
        signal: controller.signal,
        onProgress: (p) => setStatus({ kind: "extracting", progress: p }),
      });

      setStatus({ kind: "scoring" });
      const analysis = analyzeFrames(frames);

      const response = await fetch("/api/squat/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "upload",
          metrics: analysis.aggregate,
          confidence: analysis.confidence,
          durationSeconds: analysis.durationSeconds,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${response.status}`);
      }

      const { run } = (await response.json()) as { run: SquatRun };
      setStatus({ kind: "done", run });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Analysis failed.",
      });
    }
  }, [videoUrl]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setStatus({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [videoUrl]);

  return (
    <section className="surface-card" style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <p className="eyebrow">Squat Form Analyzer</p>
          <h2 className="section-title-lg">Upload a side-view squat clip</h2>
        </div>
        {(videoUrl || status.kind !== "idle") && (
          <button onClick={reset} className="text-link">Reset</button>
        )}
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={onFileChange}
        style={{ display: "block" }}
      />

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          muted
          playsInline
          style={{ width: "100%", borderRadius: 12, background: "#0b1120" }}
        />
      )}

      {videoUrl && status.kind === "idle" && (
        <button onClick={startAnalysis} className="primary-button">
          Run analysis
        </button>
      )}

      {status.kind === "loading-model" && (
        <p className="muted-copy">Loading MediaPipe pose model…</p>
      )}

      {status.kind === "extracting" && (
        <p className="muted-copy">
          Extracting pose landmarks: {Math.round(status.progress * 100)}%
        </p>
      )}

      {status.kind === "scoring" && (
        <p className="muted-copy">Scoring metrics and asking the coach…</p>
      )}

      {status.kind === "error" && (
        <p style={{ color: "#dc2626" }}>Error: {status.message}</p>
      )}

      {status.kind === "done" && <SquatResult run={status.run} />}
    </section>
  );
}

function SquatResult({ run }: { run: SquatRun }) {
  const tierColor =
    run.tier === "good" ? "#16a34a" : run.tier === "needs_work" ? "#d97706" : "#dc2626";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Score</p>
          <p style={{ fontSize: 48, fontWeight: 700, color: tierColor, margin: 0 }}>
            {run.score}
            <span style={{ fontSize: 18, fontWeight: 500, color: "#475569" }}>/100</span>
          </p>
          <p className="muted-copy" style={{ textTransform: "capitalize" }}>
            {run.tier.replace("_", " ")} · {run.repCount} reps · confidence {(run.confidence * 100).toFixed(0)}%
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="eyebrow">Duration</p>
          <p style={{ fontSize: 24, margin: 0 }}>{run.durationSeconds.toFixed(1)}s</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <Metric label="Depth" value={run.metrics.meanDepthRatio} fmt={(v) => v.toFixed(2)} hint="1.0 = parallel" />
        <Metric label="Knee tracking" value={run.metrics.meanKneeTracking} fmt={(v) => v.toFixed(2)} hint="1.0 = aligned" />
        <Metric label="Heel stability" value={run.metrics.meanHeelStability} fmt={(v) => v.toFixed(2)} hint="1.0 = no rise" />
        <Metric label="Torso lean" value={run.metrics.meanTorsoLeanDeg} fmt={(v) => `${v.toFixed(0)}°`} hint="lower is better" />
        <Metric label="Tempo (descent/ascent)" value={run.metrics.meanTempoRatio} fmt={(v) => v.toFixed(1)} hint="2.0 = ideal" />
      </div>

      {run.cues.length > 0 && (
        <div>
          <p className="eyebrow">Coaching cues</p>
          <ul style={{ paddingLeft: 18, margin: "8px 0 0", display: "grid", gap: 6 }}>
            {run.cues.map((cue, i) => (
              <li key={i}>{cue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  fmt,
  hint,
}: {
  label: string;
  value: number;
  fmt: (v: number) => string;
  hint: string;
}) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, border: "1px solid #e2e8f0" }}>
      <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0" }}>{fmt(value)}</p>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{hint}</p>
    </div>
  );
}
