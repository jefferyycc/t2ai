# t2ai — Train Train AI

A local-first AI strength coaching app, built as a portfolio piece for AI engineering / applied AI roles. LLMs draft and explain; deterministic systems own safety, validation, and persistence; pgvector grounds coaching copy in retrieved knowledge; MediaPipe (in milestone 4) handles pose signals.

This README covers the current state through milestone 3. See [ROADMAP.md](./ROADMAP.md) for the full milestone plan.

## What this project demonstrates

- **Hybrid AI architecture** — rules decide, AI explains. Red-flag detection, equipment/limitation gating, and plan repair are all deterministic. The LLM only generates language.
- **Structured outputs with Zod validation** at every AI boundary, with a fixture provider for reproducible tests.
- **RAG over coaching knowledge** — pgvector + Ollama embeddings ground planner and swap explanations. Falls back to a deterministic ranker when retrieval is disabled or errors.
- **Provider routing** — Ollama (local), fixture (deterministic), and Gemini (cloud) selected by env, never silently. No hidden cloud calls.
- **LLM evaluation** — Promptfoo dataset of 31 cases covering onboarding extraction, plan generation, swap safety, readiness gating, and RAG retrieval.
- **Production patterns** — Supabase Postgres with RLS, dual-mode in-memory fallback, auth context plumbed through every API route.

## Architecture at a glance

```
Layer 01  Experience      Next.js dashboard, onboarding chat, swap UI
Layer 02  Application     /api/onboard, /api/plan/{generate,adjust},
                          /api/exercises/swap, /api/readiness, /api/debug/rag
Layer 03  Decision        readiness.ts, planner.ts, substitutions.ts
                          (deterministic safety + plan repair)
Layer 04  AI Runtime      ai.ts (chat/structured), embeddings.ts (vectors)
                          providers: ollama | fixture | gemini
Layer 05  Knowledge       knowledge-store.ts (pgvector retrieval) ──┐
                          planning-knowledge.ts (deterministic) ────┴── shared
                          chunks in src/lib/data/knowledge-base.ts
Layer 06  Data            Supabase Postgres + RLS (profiles, plans,
                          plan_adjustments, readiness_checkins,
                          knowledge_chunks)
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

The defaults run the app in demo mode (in-memory state, fixture LLM, RAG off). The minimum for a useful local run is to set an `AI_PROVIDER`:

- `AI_PROVIDER=fixture` — no LLM, deterministic responses. Best for UI work and tests.
- `AI_PROVIDER=ollama` — local Ollama. Set `OLLAMA_BASE_URL` (default `http://localhost:11434/v1`) and pull the models referenced in `.env.example`.
- `AI_PROVIDER=gemini` — cloud Gemini. Set `GOOGLE_GENERATIVE_AI_API_KEY`.

### 3. (Optional) Persistence with Supabase

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`, then apply the migrations from `supabase/migrations/` in order. RLS is enabled on every table; policies restrict access to the authenticated user (or to `anon` for the public knowledge base).

### 4. (Optional) Enable RAG — milestone 3

RAG is off by default. To enable:

1. Apply migration `0003_knowledge_vectors.sql` (creates the `vector` extension, the `knowledge_chunks` table, the HNSW cosine index, and the `match_knowledge_chunks` RPC).
2. Make sure Ollama is running with `nomic-embed-text` available (`ollama pull nomic-embed-text`).
3. Seed the knowledge base:
   ```bash
   npm run seed:knowledge          # uses Ollama for real embeddings
   npm run seed:knowledge:fixture  # zero-vector embeddings, no Ollama needed
   ```
   The seed script reads from the canonical chunk definitions in `src/lib/data/knowledge-base.ts` and `src/lib/data/exercises.ts`, so the embedded knowledge cannot drift from what the deterministic fallback ranks. Re-running the script upserts changes and prunes chunks no longer present in code (pass `--no-prune` to skip cleanup).
4. Set `KNOWLEDGE_RAG_ENABLED=true` in `.env.local`.

To verify retrieval is working, hit the dev-only debug endpoint:

```bash
curl 'http://localhost:3000/api/debug/rag?q=shoulder%20limitation%20hypertrophy' | jq
# → { "enabled": true, "query": "...", "chunks": [...], "durationMs": 42 }
```

The endpoint returns 404 in production unless `ALLOW_RAG_DEBUG_ENDPOINT=true` is set.

For verbose retrieval logs in the server console:

```bash
KNOWLEDGE_RAG_DEBUG=true npm run dev
```

## Running the app

```bash
npm run dev
# → http://localhost:3000
```

Onboarding chat is on the home page. Once you complete onboarding, the dashboard at `/dashboard` shows your generated plan, the readiness check-in card, and per-day workouts.

## Evaluation suite

Promptfoo drives 31 test cases across five datasets:

| Dataset | Cases | What it covers |
|---|---|---|
| `onboarding-extraction` | 8 | Profile fields parsed from natural-language messages |
| `plan-generation` | 8 | Day count, exercise caps, equipment/limitation filtering, goal-appropriate volume |
| `swap-safety` | 7 | Red-flag detection, validation gates, valid-swap path |
| `readiness-gating` | 5 | Pure `assessReadiness()` thresholds |
| `rag-retrieval` | 3 | Query builder, deterministic fallback ranking, RAG-off regression |

The fixture provider in `evals/providers/fixture-provider.mjs` routes every test through the running dev server in fixture mode. Readiness and the first two RAG cases are pure-JS and need no server.

```bash
# Terminal 1
AI_PROVIDER=fixture npm run dev

# Terminal 2
npm run eval
npm run eval:view   # opens the HTML report
```

To run cross-provider comparisons, uncomment the Ollama / Gemini providers in `evals/promptfooconfig.yaml`.

## Project layout

```
src/app/                Next.js app router (dashboard, onboarding, API routes)
src/components/         React UI
src/lib/                Domain logic
  ai.ts                 LLM provider routing (chat + structured outputs)
  auth.ts               Supabase auth context
  db.ts                 Persistence facade with in-memory fallback
  embeddings.ts         Ollama / fixture embedding routing
  knowledge-store.ts    pgvector retrieval + deterministic fallback
  planner.ts            Plan generation + repair
  planning-knowledge.ts Deterministic ranker over the shared knowledge base
  rag-logger.ts         Dev-mode retrieval logging
  readiness.ts          Pure assessReadiness() function
  substitutions.ts      Equipment/limitation-aware swap engine
  data/
    exercises.ts        Canonical exercise + substitution catalog
    knowledge-base.ts   Canonical planning-knowledge chunks (shared)
  supabase-store.ts     Supabase persistence implementation
scripts/
  seed-knowledge.ts     Embeds and upserts the knowledge base into pgvector
supabase/migrations/    Schema + RLS + RPCs
evals/                  Promptfoo configuration and datasets
```

## Milestone status

| # | Name | Status |
|---|---|---|
| 1 | Real Today Coach | Done |
| 2 | Evals + Guardrails | Done |
| 3 | Small RAG | Done |
| 4 | Squat Golden Demo | Planned |
| 5 | Portfolio Polish | Planned |

See [ROADMAP.md](./ROADMAP.md) for milestone deliverables and decisions.
