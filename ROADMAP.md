# t2ai Milestones

Unified execution plan for the t2ai AI strength coaching portfolio project. Aggregated from the original product roadmap, the 5-milestone portfolio plan, and the system architecture document.

## Assumptions

- Available time: roughly 10-20 hours/week.
- Primary goal: a strong portfolio piece for AI engineer / applied AI / agentic systems roles.
- Web-only (no mobile app). Phone-first UX is achieved through responsive design, not Expo.
- Observability: Promptfoo for evals. Langfuse/OTel deferred unless time allows.
- LLMs draft and explain. Deterministic code decides safety, validity, and persistence.

## Portfolio story

I built a local-first AI strength coach. LLMs handle language and structured drafts, deterministic systems own safety and adaptation, MediaPipe handles pose signals, Supabase persists user state and vector knowledge, and evals measure whether the AI layer behaves.

## Milestone overview

| # | Name | Status | Key deliverables |
|---|------|--------|-----------------|
| 1 | Real Today Coach | Done | Supabase persistence, profile/plan tables, today dashboard, readiness check-in, safe exercise swap, Ollama coaching copy |
| 2 | Evals + Guardrails | Done | 28 Promptfoo eval cases, fixture provider, 4 eval datasets, safety guardrail coverage |
| 3 | Small RAG | Done | pgvector knowledge chunks, Ollama embeddings, retrieval-grounded plan/swap explanations, developer debug logs |
| 4 | Squat Golden Demo | Done | Browser-side MediaPipe, deterministic rep metrics, LLM feedback summary, feedback influences future plan notes |
| 5 | Portfolio Polish | Next | Clean README, architecture diagram, eval results, latency/cost notes, demo script |

---

## Milestone 1: Real Today Coach — done

Goal: move from demo prototype to a product that remembers who the user is.

### Deliverables

- Supabase persistence with RLS policies on all tables (profiles, training_plans, plan_adjustments, readiness_checkins).
- Profile and plan tables matching TypeScript types, with dual-mode fallback (in-memory when Supabase is not configured).
- Today dashboard showing the current workout deterministically, profile summary, and weekly split.
- Readiness check-in: time of day, soreness 1-10, energy 1-10. Pure `assessReadiness()` function gates to green/yellow/red. API route, Supabase migration, dashboard UI card.
- Safe exercise swap with deterministic validation: category match, equipment compatibility, limitation constraints, red-flag symptom detection.
- Ollama coaching copy via provider-routed AI runtime (ollama/fixture/gemini) with Zod validation, timeouts, and fixture fallback for tests.

### Key files

- `supabase/migrations/0001_training_state.sql`, `0002_readiness_checkins.sql`
- `src/lib/readiness.ts`, `src/lib/db.ts`, `src/lib/supabase-store.ts`
- `src/lib/planner.ts`, `src/lib/substitutions.ts`, `src/lib/ai.ts`
- `src/app/dashboard/page.tsx`, `src/components/dashboard-overview.tsx`, `src/components/readiness-checkin.tsx`
- `src/app/api/readiness/route.ts`, `src/app/api/exercises/swap/route.ts`, `src/app/api/plan/adjust/route.ts`

### Architecture layers touched

- Layer 01 (Experience): Dashboard, readiness check-in card
- Layer 02 (Application): /api/readiness, /api/exercises/swap, /api/plan/adjust
- Layer 03 (Decision): readiness.ts, planner.ts, substitutions.ts
- Layer 04 (AI Runtime): ai.ts with ollama/fixture/gemini providers
- Layer 05 (Data): Supabase Postgres with in-memory fallback

---

## Milestone 2: Evals + Guardrails — done

Goal: prove the AI layer behaves. Make quality measurable before adding RAG.

### Deliverables

- 28 eval cases across 4 datasets using Promptfoo.
- Onboarding extraction (7 cases): tests keyword extraction from natural language user messages covering explicit profiles, vague input, edge cases.
- Plan generation (8 cases): tests structural correctness — day counts, exercise caps for short sessions, equipment/limitation filtering, goal-appropriate volume.
- Swap safety (7 cases): tests red-flag guardrails — sharp pain, chest pain, dizzy, injured, shortness of breath all rejected; valid requests pass.
- Readiness gating (5 cases): pure function tests for `assessReadiness()`, no server needed. Updated eval case count: 1 additional onboarding case added during setup.
- Custom fixture provider (`evals/providers/fixture-provider.mjs`) routing to app API endpoints.
- Provider stubs for Ollama and Gemini ready to uncomment for cross-provider comparison.

### Key files

- `evals/promptfooconfig.yaml`
- `evals/providers/fixture-provider.mjs`
- `evals/datasets/onboarding-extraction.yaml`
- `evals/datasets/plan-generation.yaml`
- `evals/datasets/swap-safety.yaml`
- `evals/datasets/readiness-gating.yaml`
- `evals/README.md`

### How to run

```bash
# Terminal 1: start dev server in fixture mode
AI_PROVIDER=fixture npm run dev

# Terminal 2: run evals
npm run eval

# View results
npm run eval:view
```

### Decision: Promptfoo over Langfuse

The original ROADMAP.md and architecture.html called for Langfuse tracing. We chose Promptfoo instead because it is purpose-built for LLM evals, generates portfolio-friendly HTML reports, and does not require a hosted tracing backend. Langfuse can be added later for runtime observability if needed.

---

## Milestone 3: Small RAG — done

Goal: ground coaching explanations in retrieved knowledge rather than relying on prompt-only context.

### Deliverables

- Supabase pgvector extension enabled. `knowledge_chunks` table with vector(384) embeddings, chunk types (exercise_cue, substitution, limitation, planning), and metadata.
- Ollama embeddings via `nomic-embed-text` with fixture fallback (deterministic zero-vector for tests).
- Seed script that reads existing planning-knowledge chunks, exercise notes, and substitution reasons, generates embeddings, and upserts into the knowledge_chunks table.
- Retrieval function: embed query → cosine similarity search → return ranked chunks.
- Planner integration: replace hardcoded `formatPlanningKnowledge()` with RAG retrieval. Fall back to deterministic knowledge when pgvector is not configured.
- Swap/adjust integration: inject retrieved cue/limitation chunks into coaching copy prompts.
- Developer debug logger: records which chunks were retrieved, similarity scores, and which prompt they were injected into. Server console output in dev mode.

### Design constraints

- RAG enhances explanations but never overrides the deterministic safety layer. The planner still repairs plans the same way.
- Embedding provider follows the same routing pattern as ai.ts: ollama default, fixture for tests.
- The existing planning-knowledge.ts continues to work as fallback when Supabase/pgvector is unavailable.

### Key files

- `supabase/migrations/0003_knowledge_vectors.sql` — pgvector(384), HNSW cosine index, `match_knowledge_chunks` RPC, RLS with public-read policy
- `src/lib/embeddings.ts` — Ollama nomic-embed-text + fixture provider
- `src/lib/knowledge-store.ts` — cosine retrieval + deterministic fallback + `previewKnowledgeChunks` for the debug endpoint
- `src/lib/rag-logger.ts` — dev-mode chunk/score logging
- `src/lib/data/knowledge-base.ts` — single source of truth for planning chunks (consumed by both fallback and seed script)
- `scripts/seed-knowledge.ts` — embeds + upserts; prunes stale chunks; validates embedding dimension before insert
- `src/app/api/debug/rag/route.ts` — dev-only retrieval inspection endpoint
- `evals/datasets/rag-retrieval.yaml` — 3 cases covering query builder, fallback ranking, RAG-off regression
- `src/lib/planner.ts`, `src/lib/substitutions.ts`, `src/app/api/plan/adjust/route.ts` — call `retrieveKnowledge` / `retrieveSwapKnowledge` with graceful fallback
- `.env.example`, `package.json`, `README.md` — RAG configuration and setup story

---

## Milestone 4: Squat Golden Demo — done

Goal: demonstrate multimodal AI integration with a real analysis pipeline. This is the portfolio centerpiece.

### Deliverables

- Browser-side MediaPipe Pose Landmarker extracting landmarks from uploaded squat video (side view, single person).
- Deterministic rep metrics computed from landmarks: rep count, squat depth, knee tracking proxy, heel rise proxy, torso lean, tempo.
- Confidence thresholds and a three-tier scoring system (good/needs work/poor) matching the design system.
- LLM summary: Ollama generates 2-3 coaching cues from the structured metrics only (no raw video access). Deterministic scores are the source of truth.
- Saved feedback report persisted to Supabase.
- Adaptation hook: feedback report can influence future plan notes (e.g., "squat depth was limited last session — consider box squats"). This closes the adaptation loop without requiring a full separate milestone.

### Design constraints

- Pose extraction and scoring stay deterministic. The LLM only translates numbers into language.
- Side-view squat only. Single person in frame. One analysis per video.
- Start with uploaded videos, not live camera.

### Architecture layers touched

- Layer 01 (Experience): Upload UI, results view with score badges
- Layer 02 (Application): /api/video/analyze
- Layer 03 (Decision): Rep metric computation, scoring rules
- Layer 04 (AI Runtime): LLM summarizes structured metrics into cues
- Layer 05 (Data): Supabase Storage for videos, pose_runs and rep_metrics tables

---

## Milestone 5: Portfolio Polish — next

Goal: make the project impressive for interviews and demos.

### Deliverables

- Clean README with setup instructions, architecture overview, and screenshots.
- Architecture diagram (update architecture.html with current state — all planned items should reflect built status).
- Eval results: screenshots of Promptfoo report, pass/fail summary, cross-provider comparison if Ollama/Gemini runs exist.
- Latency/cost note: fixture vs Ollama vs Gemini comparison for key flows (plan generation, coaching copy, embeddings).
- Demo script: step-by-step walkthrough that an interviewer can follow or watch in a recorded video.
- Update ROADMAP.md status column to reflect final state.

---

## Decisions log

| Decision | Chosen | Alternatives considered | Rationale |
|----------|--------|------------------------|-----------|
| Eval tooling | Promptfoo | Langfuse, Vitest, Braintrust | Purpose-built for LLM evals, generates HTML reports, no hosted backend needed |
| Milestone order | Persistence → Evals → RAG | RAG → Evals (ROADMAP.md original) | Need evals in place to measure whether RAG improves output quality |
| Mobile | Skip (web-only) | Expo React Native | Dilutes AI portfolio story, adds 1-2 weeks without demonstrating AI skills |
| Squat scope | Combined golden demo | Split into analysis + adaptation | Tighter demo moment, closes adaptation loop in one milestone |
| Readiness check-in | Simple gating (green/yellow/red) | LLM-explained adjustments | Fastest to build, demonstrates deterministic safety without LLM dependency |
| Embedding model | Ollama nomic-embed-text | Gemini embeddings | Consistent with local-first story, fully offline |

---

## What this project demonstrates

When executed through milestone 5, t2ai shows these AI-job-relevant skills:

- AI product design: hybrid architecture where rules decide, AI explains
- RAG architecture: pgvector retrieval grounding coaching explanations
- Structured outputs and validation: Zod schemas at every AI boundary
- LLM evaluation: Promptfoo datasets measuring extraction, planning, and safety
- Multimodal ML integration: MediaPipe pose landmarks → deterministic scoring → LLM coaching cues
- Provider routing and cost awareness: fixture/Ollama/Gemini with explicit selection
- Production patterns: auth, persistence, RLS, dual-mode fallback, red-flag safety gates
