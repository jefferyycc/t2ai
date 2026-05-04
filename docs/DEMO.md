# t2ai demo walkthrough

A step-by-step tour of the product an interviewer (or recruiter) can follow in ~10 minutes. Each step calls out **what to look at on screen** and **what it demonstrates architecturally**, so the demo doubles as the explanation.

For project context, see [README.md](../README.md) and [ROADMAP.md](../ROADMAP.md).

## Recommended setup

The fastest path for a clean demo is fixture mode — deterministic, no API keys, no Ollama, no Supabase. Everything renders end-to-end and you can talk through architecture without worrying about model latency or flakiness.

```bash
# 1. Install + env
npm install
cp .env.example .env.local
# In .env.local set:
#   AI_PROVIDER=fixture

# 2. Run
npm run dev
# → http://localhost:3000
```

If you want to show a real LLM during the demo, switch `AI_PROVIDER` to `ollama` (with `ollama serve` running and the models pulled — see README) or `gemini` (with `GOOGLE_GENERATIVE_AI_API_KEY` set). The walkthrough below works identically across providers.

To show RAG retrieval in the planner explanation, additionally set `KNOWLEDGE_RAG_ENABLED=true`, point `SUPABASE_URL`/`SUPABASE_ANON_KEY` at a project with the migrations applied, and run `npm run seed:knowledge:fixture` once. Skip this for the minimum demo — the deterministic fallback ranker kicks in automatically.

## The walkthrough

### 1. Onboarding chat (≈90 s)

**Where:** `http://localhost:3000` (landing page).

**Do:** Type a natural-language profile description, e.g.
> "Intermediate lifter, 3 days a week, dumbbells and a bench at home. Goal is hypertrophy. Avoid heavy overhead pressing — old shoulder issue."

**Look at:** the assistant extracts goal, frequency, equipment, and limitations into structured profile fields.

**Architecturally this shows:**
- Structured extraction at an AI boundary (Zod-typed output, fixture-replayable).
- The same `/api/profile` POST returns the parsed profile regardless of provider — fixture / Ollama / Gemini are interchangeable.
- No silent cloud calls: provider selection comes from `AI_PROVIDER`, not from a hidden fallback.

### 2. Generated plan + dashboard (≈90 s)

**Where:** `/dashboard` (you'll land here after onboarding finishes).

**Do:** Scroll the today card, the weekly split, and tap into one of the days.

**Look at:**
- Today's workout selected deterministically from the generated plan.
- Equipment and limitation filters were applied — no overhead-press exercises if you said "shoulder issue."
- Day cap honored (≈3 exercises for short sessions).

**Architecturally this shows:**
- LLM drafts the plan; deterministic `planner.ts` repairs and validates it. If the LLM emits something invalid (extra exercises, wrong equipment), the planner fixes it before persistence.
- Plan generation is tested by 8 Promptfoo cases — see `evals/datasets/plan-generation.yaml`.

### 3. Readiness check-in (≈45 s)

**Where:** the readiness card on `/dashboard`.

**Do:** Submit "morning, soreness 7, energy 4." Then submit "morning, soreness 2, energy 8" to compare.

**Look at:** the response shifts between green / yellow / red and the today recommendation reflects the gate.

**Architecturally this shows:**
- Pure deterministic function (`assessReadiness()`). No LLM call. Five Promptfoo cases assert the thresholds directly.
- This is the "rules decide, AI explains" pattern at its simplest: no ambiguity about what the system will recommend on a low-readiness day.

### 4. Safe exercise swap (≈90 s)

**Where:** open a workout day → tap an exercise → use the swap chat.

**Do (positive case):** "Can I swap barbell back squat for goblet squat?"
**Do (red-flag case):** "I have sharp pain in my knee — can I do this anyway?"

**Look at:** the safe substitution returns a swap with reasoning. The red-flag prompt is rejected by the safety gate before the LLM ever sees it.

**Architecturally this shows:**
- Deterministic red-flag detection (sharp pain, chest pain, dizzy, injured, shortness of breath) gates the request before any AI call.
- Equipment / limitation / category compatibility is checked in code, not by the model.
- 7 Promptfoo cases in `evals/datasets/swap-safety.yaml` assert each red flag rejects and the valid path passes.

### 5. RAG-grounded explanation (optional, ≈45 s)

**Where:** any planner or swap explanation, with `KNOWLEDGE_RAG_ENABLED=true`.

**Do:** in a separate terminal, hit the dev-only debug endpoint:

```bash
curl 'http://localhost:3000/api/debug/rag?q=shoulder%20limitation%20hypertrophy' | jq
```

**Look at:** ranked knowledge chunks with cosine similarity scores.

**Architecturally this shows:**
- pgvector retrieval grounding the coaching copy. Embeddings via Ollama `nomic-embed-text` (or fixture zero-vectors for tests).
- Graceful fallback: if Supabase isn't configured or RAG is off, `planning-knowledge.ts` returns a deterministic ranking from the same shared chunk source. The user-visible behavior degrades softly.

### 6. Squat analyzer (the centerpiece, ≈3 min)

**Where:** `/squat` (or `/squat-ai`).

**Do:** Upload `public/squat.mp4` (a sample side-view squat clip ships with the repo). Wait ~5–10 s for MediaPipe to extract landmarks in-page.

**Look at:**
- A 0–100 score with good / needs work / poor tier.
- Per-metric breakdown: depth, knee tracking proxy, heel rise proxy, torso lean, tempo.
- 1–3 LLM-generated coaching cues at the bottom.

**Architecturally this shows:**
- Multimodal AI integration: browser-side MediaPipe Pose Landmarker extracts landmarks; only the structured landmarks are POSTed to `/api/squat/analyze`. The video never leaves the client.
- The LLM only sees deterministic metrics — it never gets raw video or landmarks. It translates numbers into language, nothing more.
- 4 Promptfoo cases in `evals/datasets/squat-metrics.yaml` cover score-tier assignment, confidence cap, and tempo normalization.
- Adaptation loop: with Supabase configured, the saved report becomes a low-weight context note in the next plan generation ("squat depth was limited last session — consider box squats").

### 7. Evals (≈90 s — optional but high-impact)

**Where:** terminal.

**Do:**

```bash
# Terminal 1 — dev server in fixture mode
AI_PROVIDER=fixture npm run dev

# Terminal 2 — run all 34 cases
npm run eval
npm run eval:view   # opens the HTML report
```

**Look at:** the Promptfoo HTML report — pass/fail per case across 6 datasets.

**Architecturally this shows:**
- LLM evaluation as a first-class part of the project, not an afterthought.
- The fixture provider routes through the running dev server, so the evals exercise the real API surface (validation, safety gates, persistence) — not a stub.

## Talking points for the architecture conversation

If the interviewer wants to dig into design choices, the four worth volunteering:

1. **Hybrid architecture — rules decide, AI explains.** Every safety-critical decision (red flags, equipment filtering, plan repair, squat scoring) lives in deterministic code. The LLM owns language and structured drafting. Boundary is enforced by Zod at every AI call.
2. **Dual-mode by design.** Every external dependency has a deterministic fallback: no Supabase → in-memory state; no Ollama → fixture provider; no pgvector → ranker over the same shared chunk source. The demo runs end-to-end with zero credentials.
3. **Provider routing is explicit.** `AI_PROVIDER` is the only knob. Cloud is never a silent fallback — `src/lib/ai.ts` rejects non-localhost Ollama URLs to keep dev traffic off the public internet.
4. **Evals before RAG.** Promptfoo went in at M2, before retrieval went in at M3 — so we could measure whether RAG actually improved output quality rather than asserting it.

## Closing

This walkthrough mirrors the milestone structure in [ROADMAP.md](../ROADMAP.md): M1 ships the dashboard + safety gates (steps 1–4), M2 ships the evals (step 7), M3 grounds explanations in RAG (step 5), M4 is the squat analyzer (step 6), and M5 — the polish you're reading now — makes all of it presentable.
