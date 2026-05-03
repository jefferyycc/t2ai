# Archived design docs

These files are pre-implementation thinking from before each milestone shipped. They are kept for portfolio context — to show how the design evolved — but they are not the current source of truth.

For current state, see:

- [`/ROADMAP.md`](../../../ROADMAP.md) — milestone status, deliverables, decisions log, and architecture diagram (Mermaid)
- [`/architecture.html`](../../../architecture.html) — polished portfolio render of the same architecture
- [`/README.md`](../../../README.md) — setup and usage

Where the archived docs differ from what shipped:

- `system-design.md` — anticipates a mobile (Expo) app, Inngest async jobs, and OpenTelemetry/Langfuse runtime tracing. None of these shipped. Mobile was dropped in favor of a responsive web app; squat analysis runs synchronously in the browser without an async job queue; Promptfoo replaced Langfuse for offline evals.
- `ai-runtime-architecture.md` — earliest sketch of provider routing. The shipped `src/lib/ai.ts` follows the same shape (fixture / Ollama / Gemini, env-routed) but the file is the truth.
- `product-overview.md` — original product thesis. Still accurate at a high level; details have moved into the README.
- `milestone-1-persistence-auth-plan.md` — implementation plan for M1. Superseded by what was built; see ROADMAP for the M1 summary.
