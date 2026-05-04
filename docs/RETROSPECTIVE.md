# t2ai Retrospective

A short, honest look back at each milestone — what shipped, the most interesting design call, and what I'd do differently. Intended as a companion to [`/ROADMAP.md`](../ROADMAP.md) (which is forward-looking) and [`docs/DEMO.md`](./DEMO.md) (which walks through the product). This document is what I'd actually say in an interview.

For project context, see [`/README.md`](../README.md). For the canonical milestone status table and architecture diagram, see [`/ROADMAP.md`](../ROADMAP.md).

## Milestone 1 — Real Today Coach

**What problem it solved.** Move from a demo prototype that forgot you between sessions into a product that remembers your profile, your generated plan, and how you felt this morning. Replace LLM "improvise the workout" with deterministic plan repair and a readiness gate that LLMs don't get to override.

**Most interesting design call.** Dual-mode persistence. Every storage operation has a Supabase path AND an in-memory fallback selected by the presence of `SUPABASE_URL`/`SUPABASE_ANON_KEY`. This was load-bearing for everything that came after — because the dev loop and the eval suite never need credentials, the project ships demoable end-to-end with `cp .env.example .env.local && npm run dev`. Without dual-mode, every subsequent milestone would have needed a Supabase project to run.

**What I'd do differently.** Be more deliberate about reading the framework docs that ship with the project. During the M5 retrospective I misdiagnosed `src/proxy.ts` as a defective file because I was mentally on Next.js ≤15 (where the middleware convention is `middleware.ts` with `export function middleware()`). Next.js 16 deprecated that convention and renamed it to `proxy.ts` exporting `proxy()` — i.e., the original file was correct. The project's own `AGENTS.md` literally said "this is not the Next.js you know, read node_modules/next/dist/docs/ before writing any code"; I ignored that warning and produced a "fix" that landed a deprecation warning. The lesson is to trust the project's stated conventions over training-data assumptions, especially when an `AGENTS.md` flags version drift.

## Milestone 2 — Evals + Guardrails

**What problem it solved.** Make the AI layer's quality measurable before adding RAG. The instinct is to add the cool feature first (RAG, multimodal, agents) and bolt evals on later — at which point you're measuring a moving target and you don't actually know whether the new feature improved anything. Doing evals at M2 meant the M3 RAG decision was empirically defensible, not vibes-based.

**Most interesting design call.** Promptfoo over Langfuse. The original architecture doc called for Langfuse + OpenTelemetry runtime tracing. I swapped to Promptfoo because the actual job at M2 was offline pass/fail measurement against fixed cases, not production observability — and Promptfoo generates HTML reports I can drop in a portfolio README without standing up a hosted backend. Langfuse would be the right call later, when there's real production traffic to trace; at M2 it would have been infrastructure for its own sake.

**What I'd do differently.** Run cross-provider eval comparisons (fixture vs. Ollama vs. Gemini) at M2 instead of deferring to M5. The provider stubs are commented out in `evals/promptfooconfig.yaml` — uncommenting them takes seconds. The reason I deferred was time-on-the-day; the reason it bit me is that the cross-provider table is now the highest-leverage portfolio artifact I don't yet have. Cheap to run, high signal, exactly the kind of "show your work" data that hiring managers want.

## Milestone 3 — Small RAG

**What problem it solved.** Ground coaching explanations in retrieved knowledge instead of stuffing prompts with hardcoded planning lore. Before M3, `formatPlanningKnowledge()` shipped the same paragraph-of-cues to every prompt regardless of relevance. After M3, the planner embeds a query, cosine-searches a `knowledge_chunks` table (HNSW index on a 384-dim vector column), and only injects the top-K most relevant chunks. Same UX, smaller and more relevant prompt.

**Most interesting design call.** RAG is enhancement, not authority. The deterministic planner still owns plan repair, equipment filtering, and limitation gates. RAG only changes the *coaching copy* the LLM emits — it never gets to remove an exercise, override a red flag, or alter a set/rep prescription. This makes the whole feature safe to ship behind a single env flag (`KNOWLEDGE_RAG_ENABLED`) with a deterministic fallback ranker over the same shared chunk source. Worst case if RAG breaks: explanations are slightly less precise. The plan itself is unaffected.

**What I'd do differently.** Pick an embedding model with proper portability. `nomic-embed-text` was the right call for "local-first, fully offline" but it locks the project to Ollama. If I wanted to A/B against Gemini embeddings later, I'd need a re-seed and a dimension change (768 vs 384). Worth deciding upfront whether dimension/provider portability matters; I rushed past that decision.

## Milestone 4 — Squat Golden Demo

**What problem it solved.** Demonstrate multimodal AI integration end-to-end. Browser-side MediaPipe Pose Landmarker extracts landmarks from an uploaded squat clip, deterministic TS code computes rep metrics (depth, knee tracking, heel rise, torso lean, tempo) and produces a 0–100 score with a tier badge, then the LLM translates *only the structured numbers* into 1–3 coaching cues. The video itself never leaves the client.

**Most interesting design call.** The LLM never sees raw video or landmarks — only the deterministic metric struct. This is the strongest expression of the project's "rules decide, AI explains" thesis. If the model hallucinates, the hallucination is bounded to language; the score on the badge is computed in pure TypeScript. As a side effect, the API surface is tiny (one POST with a 200-line JSON metrics object), inference is fast (no vision-LM cost), and pipeline behavior is fully testable in Promptfoo without mocking video frames. The post-M5 follow-up commit added a view-aware knee-tracking signal and a torso-lean rescale once I noticed the original scoring was flagging biomechanically-correct squats as bad form.

**What I'd do differently.** Defend timestamp monotonicity from day one. MediaPipe's `PoseLandmarker` requires strictly-increasing timestamps across the cached landmarker's lifetime. Initial M4 worked because I only analyzed one video per page load. The bug surfaced when a second video started at `t=0` and threw "Packet timestamp mismatch." The post-M4 fix (`lastDetectTimestampMs`) clamps upward per-instance — straightforward to write *if you already know about the constraint*. Lesson: when wrapping a stateful library, read its lifecycle docs before assuming "fresh per-call" semantics.

## Milestone 5 — Portfolio Polish

**What problem it solved.** Make the project legible to someone who's never seen it before, in less than 10 minutes. Consolidate the planning sprawl (one canonical ROADMAP with an embedded Mermaid diagram, plus the existing `architecture.html` as the showcase render), archive pre-implementation design docs that no longer match shipped state, and write a step-by-step demo script with architectural callouts. Reviewers can now form an opinion from `README.md` alone — they don't have to clone and run.

**Most interesting design call.** Two surfaces, one source of truth. The architecture lives once in ROADMAP's Mermaid block (renders on GitHub, version-controllable, no drift from prose). The styled `architecture.html` is a portfolio render of the same architecture, with an HTML-comment header explicitly stating it mirrors ROADMAP. Engineers reading the repo see Mermaid first; recruiters scanning a portfolio link see the styled page. Both audiences get what they want without duplicating the source of truth.

**What I'd do differently.** Run the deferred items inside M5 instead of deferring them. The cross-provider eval table, the latency/cost benchmark, and a 2-minute screen recording would all have been higher-leverage than the doc cleanup work that filled most of M5. The reason I deferred was honest scope cutting — they each need real Ollama/Gemini runs and recording time — but with hindsight, the polished docs were already 80% there from earlier milestones, and the missing artifacts are what would actually move a hiring manager. Polish surface area was over-invested; demonstration data was under-invested.

## Cross-cutting observations

A few patterns that became clear only by looking at all five milestones together.

**The deterministic-core-with-AI-skin pattern paid off every milestone.** M1's red-flag detection, M2's rules-as-eval-cases, M3's "RAG enhances explanation, never overrides safety," M4's "LLM only sees the metric struct" — every milestone reinforced that boundary, and every milestone's safety story benefited from it. If I were to compress the project to one design principle for an interview, it's this one.

**Evals moved from "thing I'll add later" to "thing I run before the first commit on a feature."** After M2, I stopped writing AI features without writing the eval cases first. The 4 squat-metrics cases in M4 were drafted *before* the scoring code, and they caught the torso-lean miscalibration the moment I tried to ship.

**Documentation drift is the most expensive kind of debt.** The §2 audit caught: the M4 ROADMAP section still listed `/api/video/analyze` (the actual route is `/api/squat/analyze`), Layer 05 referenced `pose_runs and rep_metrics tables` (the actual table is `squat_runs`), and "Supabase Storage for videos" (Storage was never used). All three were planning-doc artifacts that survived because nobody re-read the doc against the code. The M5 Mermaid I added had its own version of the same bug. Lesson: any time a milestone closes, do an explicit doc-vs-code reconciliation pass — it takes 20 minutes and catches drift while the context is still fresh.

**The portfolio polish pass surfaced more product issues than I expected.** §1 found dead code (`src/app/squat-ai/page.tsx`), §2 found doc/code drift, §6 found gaps in the architecture diagram (no `auth.ts` node, no in-memory fallback labeling), §7 found 4 unused exports. None of these blocks the demo, but cumulatively they'd shape an interviewer's confidence. Worth a follow-up cleanup commit before sharing the repo publicly. The pass also produced a false positive — `src/proxy.ts` was flagged as a defective filename when it was actually the correct Next.js 16 convention; that misdiagnosis is the most useful retrospective lesson on its own (see M1 above).
