/**
 * Promptfoo custom provider for the AI strength coaching app in fixture mode.
 *
 * This provider routes test calls to the running Next.js dev server.
 * It does NOT call any live LLM — fixture mode deterministically returns
 * structured responses based on keyword matching, so evals are reproducible.
 *
 * Prerequisites:
 *   Start the dev server in fixture mode before running evals:
 *     AI_PROVIDER=fixture npm run dev
 *
 * The provider inspects `context.vars.endpoint` to decide which API route to
 * call.  Supported values:
 *   - "onboarding"  → POST /api/onboard
 *   - "plan"        → POST /api/plan/generate  (or similar plan endpoint)
 *   - "adjust"      → POST /api/plan/adjust
 *   - "swap"        → POST /api/exercises/swap
 *   - "readiness"   → pure JS assertion, no HTTP call needed
 *
 * When endpoint is not set the provider falls back to sending `prompt` as a
 * plain onboarding message.
 */

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export const id = "fixture-provider";

/**
 * Main entry point called by Promptfoo for every test case.
 *
 * @param {string} prompt  - The rendered prompt string (may be JSON or plain text).
 * @param {object} context - Promptfoo context including vars, provider config, etc.
 * @returns {{ output: string }}
 */
export async function callApi(prompt, context) {
  const vars = context?.vars ?? {};
  const endpoint = vars.endpoint ?? "onboarding";

  try {
    switch (endpoint) {
      case "onboarding":
        return await callOnboarding(vars, prompt);

      case "adjust":
        return await callAdjust(vars, prompt);

      case "swap":
        return await callSwap(vars, prompt);

      case "readiness":
        // Readiness is a pure function — no HTTP needed.
        // Assertions in the dataset use type:javascript directly.
        return { output: JSON.stringify({ note: "readiness uses javascript assertions" }) };

      default:
        return { output: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }) };
    }
  } catch (err) {
    // Surface connection errors clearly so the user knows to start the dev server.
    const message =
      err.cause?.code === "ECONNREFUSED"
        ? `Could not reach ${BASE_URL}. Start the dev server: AI_PROVIDER=fixture npm run dev`
        : err.message;

    return { output: JSON.stringify({ error: message }) };
  }
}

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function callOnboarding(vars, prompt) {
  // vars.message overrides the raw prompt string.
  const message = vars.message ?? prompt;
  const draft = vars.draft ?? {
    workoutGoal: null,
    workoutDaysPerWeek: null,
    workoutDurationMinutes: null,
    experienceLevel: null,
    limitations: null,
  };

  const res = await fetch(`${BASE_URL}/api/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, draft }),
  });

  const json = await res.json();
  return { output: JSON.stringify(json) };
}

async function callAdjust(vars, prompt) {
  const message = vars.message ?? prompt;

  const res = await fetch(`${BASE_URL}/api/plan/adjust`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Tests that exercise the red-flag / validation path do not need a real
      // auth session because the red-flag check runs before DB access.
      // For full integration tests set EVAL_COOKIE env var.
      ...(process.env.EVAL_COOKIE ? { Cookie: process.env.EVAL_COOKIE } : {}),
    },
    body: JSON.stringify({ message }),
  });

  const json = await res.json();
  return { output: JSON.stringify(json) };
}

async function callSwap(vars, prompt) {
  const message = vars.message ?? prompt;

  const res = await fetch(`${BASE_URL}/api/exercises/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EVAL_COOKIE ? { Cookie: process.env.EVAL_COOKIE } : {}),
    },
    body: JSON.stringify({
      dayId: vars.dayId ?? "eval-day-id",
      exerciseId: vars.exerciseId ?? "eval-exercise-id",
      message,
      ...(vars.acceptSubstituteId ? { acceptSubstituteId: vars.acceptSubstituteId } : {}),
    }),
  });

  const json = await res.json();
  return { output: JSON.stringify(json) };
}
