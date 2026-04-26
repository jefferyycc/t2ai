import Link from "next/link";
import { SquatAnalyzer } from "@/components/squat-analyzer";

export const dynamic = "force-dynamic";

export default function SquatPage() {
  return (
    <main className="page-shell">
      <div className="page-actions">
        <Link className="text-link" href="/dashboard">
          Back to dashboard
        </Link>
      </div>

      <section className="hero-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="hero-copy">
          <p className="eyebrow">Milestone 4 — Golden Demo</p>
          <h1 className="section-title-xl">Squat form analysis</h1>
          <p className="hero-description">
            Upload a side-view squat clip. MediaPipe extracts pose landmarks in
            your browser, deterministic code computes per-rep metrics and a
            score, and the LLM only translates the numbers into 1–3 short
            coaching cues. The score is never adjusted by the model.
          </p>
          <p className="muted-copy">
            Best results: phone in landscape, one person in frame, full body
            visible from the side, even lighting.
          </p>
        </div>
      </section>

      <SquatAnalyzer />
    </main>
  );
}
