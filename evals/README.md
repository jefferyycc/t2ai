# Evals — AI Strength Coach (Milestone 2)

Promptfoo evaluation suite covering the four AI-powered features of the app.

## What each dataset tests

| File | Feature | Cases | Server needed? |
|---|---|---|---|
| `datasets/onboarding-extraction.yaml` | Profile extraction from natural language | 7 | Yes |
| `datasets/plan-generation.yaml` | Plan structure, limitation filtering, volume rules | 8 | Yes |
| `datasets/swap-safety.yaml` | Red-flag rejection, valid swap response shape | 7 | Yes |
| `datasets/readiness-gating.yaml` | `assessReadiness()` thresholds (pure function) | 5 | No |

**Total: 27 cases**

### Onboarding extraction
Verifies the fixture-mode parser (`getFixtureOnboarding` in `src/lib/ai.ts`) correctly
extracts `workoutGoal`, `workoutDaysPerWeek`, `workoutDurationMinutes`, `experienceLevel`,
and `limitations` from varied natural-language messages.

### Plan generation
Verifies the deterministic repair layer in `src/lib/planner.ts`:
- Correct day count for the requested schedule
- Exercises per day capped by session duration (`getExerciseTargetCount`)
- Forbidden exercises excluded based on limitations (`filterExercises`)
- Set counts consistent with the training goal (`clampSets`)

### Swap safety
Verifies the guardrails in `src/app/api/plan/adjust/route.ts`:
- `hasTrainingRedFlag` rejects messages containing danger keywords (`sharp pain`,
  `chest pain`, `dizzy`, `shortness of breath`, `injured`, etc.)
- Valid requests return an `assistantMessage` with no error

### Readiness gating
Directly tests the `assessReadiness()` pure function from `src/lib/readiness.ts`
using inline JavaScript assertions — no server or LLM required.

## Running evals

### Prerequisites

1. Install dependencies (already done if you ran `npm install`):
   ```
   npm install
   ```

2. For API-based tests (onboarding, plan, swap, adjust), start the dev server in fixture mode:
   ```
   AI_PROVIDER=fixture npm run dev
   ```
   Leave this running in a separate terminal.

3. Readiness gating tests run without a server.

### Run all evals

```bash
npm run eval
# or directly:
npx promptfoo eval --config evals/promptfooconfig.yaml
```

### View results in the browser

```bash
npm run eval:view
```

This opens an interactive report at `http://localhost:15500`.

### Run a single dataset

```bash
npx promptfoo eval --config evals/promptfooconfig.yaml --filter-pattern "readiness"
```

## Adding providers for cross-provider comparison

The `evals/promptfooconfig.yaml` file has commented-out provider blocks for
Ollama and Gemini. To enable them:

**Ollama (local LLM):**
1. Install and start Ollama: `ollama serve`
2. Pull a model: `ollama pull llama3.2`
3. Start the app with Ollama: `AI_PROVIDER=ollama npm run dev`
4. Uncomment the `ollama` provider block in `promptfooconfig.yaml`

**Gemini:**
1. Obtain a Google Generative AI API key
2. Set `export GOOGLE_GENERATIVE_AI_API_KEY=your_key`
3. Start the app: `AI_PROVIDER=gemini npm run dev`
4. Uncomment the `gemini` provider block in `promptfooconfig.yaml`

When multiple providers are active, Promptfoo runs each test case against all
providers and displays a side-by-side comparison in the report.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `AI_PROVIDER` | Set to `fixture` when running evals | `ollama` |
| `APP_BASE_URL` | Base URL of the running dev server | `http://localhost:3000` |
| `EVAL_COOKIE` | Session cookie for authenticated endpoints | _(empty)_ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Required for Gemini provider | _(none)_ |
