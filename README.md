# t2ai — Train Train AI

A local-first AI strength coaching app, built as a portfolio piece for AI engineering / applied AI roles. LLMs draft and explain; deterministic systems own safety, validation, and persistence; pgvector grounds coaching copy in retrieved knowledge; browser-side MediaPipe extracts squat landmarks for deterministic scoring with LLM-summarized cues.

Status: milestones 1–4 shipped, milestone 5 (portfolio polish) in progress. See [ROADMAP.md](./ROADMAP.md) for the full plan, decisions log, and architecture diagram.

## What this project demonstrates

- **Hybrid AI architecture** — rules decide, AI explains. Red-flag detection, equipment/limitation gating, plan repair, and squat scoring are all deterministic. The LLM only generates language.
- **Structured outputs with Zod validation** at every AI boundary, with a fixture provider for reproducible tests.
- **RAG over coaching knowledge** — pgvector + Ollama embeddings ground planner and swap explanations. Falls back to a deterministic ranker when retrieval is disabled or errors.
- **Multimodal pipeline** — browser-side MediaPipe Pose Landmarker extracts squat landmarks; pure-TS metric/scoring code produces a 0–100 score; the LLM only translates the numbers into 1–3 short cues.
- **Adaptation loop** — recent squat sessions feed back into plan generation as a low-weight context note, so depth or knee-tracking issues steer the next plan without overriding safety rules.
- **Provider routing** — Ollama (local), fixture (deterministic), and Gemini (cloud) selected by env, never silently. No hidden cloud calls.
- **LLM evaluation** — Promptfoo dataset of 35 cases covering onboarding extraction, plan generation, swap safety, readiness gating, RAG retrieval, and squat scoring.
- **Production patterns** — Supabase Postgres with RLS, dual-mode in-memory fallback, auth context plumbed through every API route.

## Architecture at a glance

```
Layer 01  Experience      Next.js dashboard, onboarding chat, swap UI
Layer 02  Application     /api/profile, /api/plan/{generate,adjust},
                          /api/exercises/swap, /api/readiness,
                          /api/squat/analyze, /api/debug/rag
Layer 03  Decision        readiness.ts, planner.ts, substitutions.ts,
                          squat/{metrics,scoring}.ts
                          (deterministic safety + plan repair + scoring)
Layer 04  AI Runtime      ai.ts (chat/structured), embeddings.ts (vectors)
                          providers: ollama | fixture | gemini
Layer 05  Knowledge       knowledge-store.ts (pgvector retrieval) ──┐
                          planning-knowledge.ts (deterministic) ────┴── shared
                          chunks in src/lib/data/knowledge-base.ts
Layer 06  Data            Supabase Postgres + RLS (profiles, plans,
                          plan_adjustments, readiness_checkins,
                          knowledge_chunks, squat_runs)
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

### 5. (Optional) Squat analyzer — milestone 4

The squat analyzer runs MediaPipe Pose Landmarker entirely in the browser and posts only the extracted metrics to the server. No setup is required beyond the dev server, but a few notes:

- The pose model file (`public/pose_landmarker_heavy.task`) is committed in the repo, so first-load works offline once the page is cached. The MediaPipe WASM still fetches from `storage.googleapis.com` on first load.
- Side-view squat clips work best — single person in frame, ideally H.264 / MP4. Sample clips live in `public/squat.mp4` and `public/correct_results.mp4`.
- Persisted reports (Supabase configured) feed back into plan generation as a low-weight context note. With Supabase off, the report still renders but doesn't influence subsequent plans.

## Running the app

```bash
npm run dev
# → http://localhost:3000
```

Onboarding chat is on the home page. Once you complete onboarding, the dashboard at `/dashboard` shows your generated plan, the readiness check-in card, and per-day workouts.

## Evaluation suite

Promptfoo drives 35 test cases across six datasets:

| Dataset | Cases | What it covers |
|---|---|---|
| `onboarding-extraction` | 8 | Profile fields parsed from natural-language messages |
| `plan-generation` | 8 | Day count, exercise caps, equipment/limitation filtering, goal-appropriate volume |
| `swap-safety` | 7 | Red-flag detection, validation gates, valid-swap path |
| `readiness-gating` | 5 | Pure `assessReadiness()` thresholds |
| `rag-retrieval` | 3 | Query builder, deterministic fallback ranking, RAG-off regression |
| `squat-metrics` | 4 | Score tier assignment, confidence cap, tempo normalization |

The fixture provider in `evals/providers/fixture-provider.mjs` routes every test through the running dev server in fixture mode. Readiness and the first two RAG cases are pure-JS and need no server.

```bash
# Terminal 1
AI_PROVIDER=fixture npm run dev

# Terminal 2
npm run eval
npm run eval:view   # opens the HTML report
```

To run cross-provider comparisons, uncomment the Ollama / Gemini providers in `evals/promptfooconfig.yaml`.

## Troubleshooting

**Landing page shows "AI provider is unreachable" or onboarding POSTs fail.**
The most likely cause is `AI_PROVIDER=ollama` (the default) with no Ollama running, or the configured models not pulled. Two fixes:

```bash
# Option A — switch to fixture mode (deterministic, no LLM):
AI_PROVIDER=fixture npm run dev

# Option B — run Ollama with the models from .env.example:
ollama serve
ollama pull llama3.2
ollama pull gemma3:4b
curl http://localhost:11434/api/tags    # verify models are present
```

The welcome message degrades to a static fallback when the LLM is unreachable, so the page still loads — but extraction (POST `/api/profile`) needs a working provider.

**`/api/debug/rag` returns `{ "enabled": false, "reason": "..." }`.**
RAG retrieval is gated on three things: `KNOWLEDGE_RAG_ENABLED=true`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. If any are missing, retrieval is disabled and the planner falls back to the deterministic ranker. Set them in `.env.local` and restart.

**`/api/debug/rag` returns `enabled: true` but no chunks.**
The `knowledge_chunks` table is empty. Run `npm run seed:knowledge` (or `npm run seed:knowledge:fixture` if Ollama isn't available). Verify Supabase has the migration applied — the RPC `match_knowledge_chunks` must exist.

**Squat analyzer fails with "Could not load video metadata".**
Some browsers can't read certain codecs. Try a different clip or transcode to H.264 / MP4. The PoseLandmarker WASM also needs internet on first load to fetch the model from `storage.googleapis.com`.

**Supabase persistence appears not to save.**
The dev server falls back to in-memory state when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are absent. Demo flows still work end-to-end, but reloading clears state. Add the env vars and apply the migrations to enable persistence.

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

Milestones 1–4 shipped. Milestone 5 (portfolio polish) in progress. See [ROADMAP.md](./ROADMAP.md) for the milestone table, deliverables, decisions log, and architecture diagram. A demo walkthrough lives in [docs/DEMO.md](./docs/DEMO.md).
