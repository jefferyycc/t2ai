/**
 * seed-knowledge.ts
 *
 * Seed script for the fitness coaching app's RAG system.
 * Reads knowledge from inline planning rules, exercise cues, and substitution
 * reasons, then upserts them into the Supabase `knowledge_chunks` table with
 * vector embeddings.
 *
 * Usage:
 *   npx tsx scripts/seed-knowledge.ts
 *   npx tsx scripts/seed-knowledge.ts --fixture   # zero-vector embeddings, no Ollama needed
 *
 * Required env vars (loaded from .env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (preferred — bypasses RLS)
 *   SUPABASE_ANON_KEY          (fallback if service role key is absent)
 *
 * Optional env vars:
 *   OLLAMA_BASE_URL     (default: http://localhost:11434/v1)
 *   OLLAMA_EMBED_MODEL  (default: nomic-embed-text)
 *   OLLAMA_TIMEOUT_MS   (default: 30000)
 *   AI_PROVIDER=fixture (same effect as --fixture flag)
 */

// ---------------------------------------------------------------------------
// dotenv bootstrap — must happen before any env reads
// ---------------------------------------------------------------------------
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.warn(
    `[warn] .env.local not found at ${envPath}. ` +
      "Create it with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).",
  );
} else {
  // dotenv is a dev dependency; if it's missing the error message says how to fix it.
  try {
    const { config } = await import("dotenv");
    config({ path: envPath });
  } catch {
    console.error(
      '[error] Could not load dotenv. Run: npm install --save-dev dotenv\n' +
      '        Then retry: npx tsx scripts/seed-knowledge.ts',
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChunkType =
  | "planning_rule"
  | "limitation_guidance"
  | "split_pattern"
  | "exercise_cue"
  | "substitution_reason";

interface KnowledgeChunk {
  id: string;
  chunk_type: ChunkType;
  title: string;
  body: string;
  source_id: string | null;
  metadata: Record<string, unknown>;
}

interface KnowledgeChunkRow extends KnowledgeChunk {
  embedding: number[];
}

// ---------------------------------------------------------------------------
// Knowledge sources
// ---------------------------------------------------------------------------

// 1. Planning knowledge — inlined from src/lib/planning-knowledge.ts
//    (the array is private there so we duplicate it here)

const planningChunks: KnowledgeChunk[] = [
  // Goal-based rules → planning_rule
  {
    id: "strength-basics",
    chunk_type: "planning_rule",
    title: "Strength planning baseline",
    body: "For strength goals, keep the exercise menu tight, place the most demanding compound lifts first, favor 3 to 5 work sets, and usually keep reps between 4 and 8 with longer rest periods.",
    source_id: null,
    metadata: { goals: ["strength"] },
  },
  {
    id: "hypertrophy-basics",
    chunk_type: "planning_rule",
    title: "Hypertrophy planning baseline",
    body: "For hypertrophy, distribute volume across the week, use 3 to 4 work sets on most exercises, and keep most reps between 6 and 12 while balancing presses, pulls, squat patterns, hinges, and single-leg work.",
    source_id: null,
    metadata: { goals: ["hypertrophy"] },
  },
  {
    id: "fat-loss-basics",
    chunk_type: "planning_rule",
    title: "General fitness and fat loss baseline",
    body: "For general fitness or fat loss, keep sessions efficient, bias toward full-body coverage, use stable movements the user can recover from, and avoid highly specialized split days unless weekly frequency is high.",
    source_id: null,
    metadata: { goals: ["fat_loss", "general_fitness"] },
  },
  // Experience-level rules → planning_rule
  {
    id: "beginner-stability",
    chunk_type: "planning_rule",
    title: "Beginner stability rule",
    body: "For beginners, prefer stable and easy-to-learn movements, avoid overloading every pattern in the same session, and repeat core movement patterns weekly so technique can improve.",
    source_id: null,
    metadata: { experienceLevels: ["beginner"] },
  },
  {
    id: "intermediate-balance",
    chunk_type: "planning_rule",
    title: "Intermediate balance rule",
    body: "For intermediate lifters, keep weekly balance across squat, hinge, horizontal press, horizontal pull, vertical pull, single-leg, and core patterns while allowing one or two emphasis patterns based on goal.",
    source_id: null,
    metadata: { experienceLevels: ["intermediate", "advanced"] },
  },
  // Limitation rules → limitation_guidance
  {
    id: "shoulder-rule",
    chunk_type: "limitation_guidance",
    title: "Shoulder limitation rule",
    body: "If the user has shoulder limitations, avoid overhead pressing, keep pressing angles more stable, and favor horizontal pushes plus rows and pulldowns that do not provoke overhead discomfort.",
    source_id: null,
    metadata: {
      limitations: ["shoulders"],
      categories: ["push_vertical", "push_horizontal", "pull_horizontal", "pull_vertical"],
    },
  },
  {
    id: "lower-back-rule",
    chunk_type: "limitation_guidance",
    title: "Lower-back limitation rule",
    body: "If the user has lower-back limitations, keep hinge volume conservative, favor supported or machine-based posterior chain work, and avoid pairing multiple high-fatigue trunk-loading exercises in one session.",
    source_id: null,
    metadata: {
      limitations: ["lower_back"],
      categories: ["hinge", "pull_horizontal", "core"],
    },
  },
  {
    id: "knee-rule",
    chunk_type: "limitation_guidance",
    title: "Knee limitation rule",
    body: "If the user has knee limitations, favor supported squat patterns, controlled range of motion, stable single-leg work only when tolerated, and avoid filling a session with multiple knee-dominant movements.",
    source_id: null,
    metadata: {
      limitations: ["knees"],
      categories: ["squat", "single_leg"],
    },
  },
  {
    id: "wrist-rule",
    chunk_type: "limitation_guidance",
    title: "Wrist limitation rule",
    body: "If the user has wrist limitations, avoid exercises that require long periods of wrist extension and prefer machine pressing, dumbbell variations with neutral grip, or forearm-based core work.",
    source_id: null,
    metadata: {
      limitations: ["wrists"],
      categories: ["push_horizontal", "core"],
    },
  },
  // Session-length and split rules → planning_rule / split_pattern
  {
    id: "short-session-rule",
    chunk_type: "planning_rule",
    title: "Short session rule",
    body: "For shorter sessions, keep each day to about 4 or 5 exercises, cover the main patterns first, and avoid adding low-value accessories that crowd out the primary work.",
    source_id: null,
    metadata: {},
  },
  {
    id: "two-day-split",
    chunk_type: "split_pattern",
    title: "Two-day split pattern",
    body: "For two training days, default to full-body sessions with one squat pattern, one hinge or single-leg pattern, one press, one pull, and one core movement each day.",
    source_id: null,
    metadata: { minDays: 2, maxDays: 2 },
  },
  {
    id: "three-day-split",
    chunk_type: "split_pattern",
    title: "Three-day split pattern",
    body: "For three training days, use either three full-body sessions or a lower, upper, full-body rhythm so every week still touches the main movement patterns at least once.",
    source_id: null,
    metadata: { minDays: 3, maxDays: 3 },
  },
  {
    id: "four-day-split",
    chunk_type: "split_pattern",
    title: "Four-day split pattern",
    body: "For four training days, an upper/lower split is usually the cleanest default. Each lower day should separate squat and hinge emphasis, and each upper day should balance pressing and pulling.",
    source_id: null,
    metadata: { minDays: 4, maxDays: 4 },
  },
  {
    id: "five-day-split",
    chunk_type: "split_pattern",
    title: "Five-day split pattern",
    body: "For five training days, use a structured mix of lower, upper push, upper pull, lower, and full-body or accessory work so fatigue stays manageable.",
    source_id: null,
    metadata: { minDays: 5, maxDays: 5 },
  },
];

// 2. Exercise cues — inlined from src/lib/data/exercises.ts

interface ExerciseRaw {
  id: string;
  name: string;
  category: string;
  equipment: string[];
  notes: string;
}

const exercises: ExerciseRaw[] = [
  { id: "squat", name: "Goblet Squat", category: "squat", equipment: ["dumbbells"], notes: "Stable squat pattern that is easy to coach and good for moderate loads." },
  { id: "leg-press", name: "Leg Press", category: "squat", equipment: ["gym_machines"], notes: "Supported lower-body press that reduces balance demands and is easy to scale." },
  { id: "box-squat", name: "Box Squat", category: "squat", equipment: ["bodyweight", "barbell", "dumbbells"], notes: "Controlled squat variation that can reduce depth demands and improve consistency." },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "hinge", equipment: ["barbell", "dumbbells"], notes: "Posterior-chain hinge that works well when the user tolerates trunk loading." },
  { id: "hip-thrust", name: "Hip Thrust", category: "hinge", equipment: ["barbell", "dumbbells", "gym_machines"], notes: "Glute-focused hinge with less lower-back demand than many deadlift variations." },
  { id: "hamstring-curl", name: "Hamstring Curl", category: "hinge", equipment: ["gym_machines", "resistance_bands"], notes: "Supported hamstring movement that is useful when hinge fatigue needs to stay low." },
  { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", category: "push_horizontal", equipment: ["dumbbells"], notes: "Stable horizontal press that fits hypertrophy and general strength work." },
  { id: "push-up", name: "Push-Up", category: "push_horizontal", equipment: ["bodyweight"], notes: "Simple pressing pattern that is efficient when bodyweight work is tolerated." },
  { id: "machine-chest-press", name: "Machine Chest Press", category: "push_horizontal", equipment: ["gym_machines"], notes: "Guided press that is easy to progress and easier on balance demands." },
  { id: "dumbbell-overhead-press", name: "Dumbbell Overhead Press", category: "push_vertical", equipment: ["dumbbells"], notes: "Vertical press for users who tolerate overhead work and want shoulder strength." },
  { id: "landmine-press", name: "Landmine Press", category: "push_vertical", equipment: ["barbell"], notes: "Pressing pattern with a more angled path than a strict overhead press." },
  { id: "lateral-raise", name: "Lateral Raise", category: "push_vertical", equipment: ["dumbbells", "resistance_bands"], notes: "Light accessory raise that should stay secondary to compound pressing." },
  { id: "chest-supported-row", name: "Chest-Supported Row", category: "pull_horizontal", equipment: ["dumbbells", "gym_machines"], notes: "Supported upper-back row that keeps the torso stable." },
  { id: "seated-cable-row", name: "Seated Cable Row", category: "pull_horizontal", equipment: ["gym_machines"], notes: "Consistent cable row that is easy to scale and recover from." },
  { id: "lat-pulldown", name: "Lat Pulldown", category: "pull_vertical", equipment: ["gym_machines"], notes: "Classic vertical pull for lat strength when cable equipment is available." },
  { id: "band-lat-pulldown", name: "Band Lat Pulldown", category: "pull_vertical", equipment: ["resistance_bands"], notes: "Simple home-friendly vertical pull alternative when a cable stack is unavailable." },
  { id: "split-squat", name: "Split Squat", category: "single_leg", equipment: ["bodyweight", "dumbbells"], notes: "Unilateral lower-body movement that builds stability and control." },
  { id: "step-up", name: "Step-Up", category: "single_leg", equipment: ["bodyweight", "dumbbells"], notes: "Lower-body movement that is easy to load lightly and keep stable." },
  { id: "dead-bug", name: "Dead Bug", category: "core", equipment: ["bodyweight"], notes: "Core stability drill with low spinal loading and clear progressions." },
  { id: "plank", name: "Plank", category: "core", equipment: ["bodyweight"], notes: "Simple trunk endurance movement that fits most sessions when wrists tolerate it." },
];

const exerciseChunks: KnowledgeChunk[] = exercises.map((ex) => ({
  id: `exercise-cue-${ex.id}`,
  chunk_type: "exercise_cue",
  title: ex.name,
  body: ex.notes,
  source_id: ex.id,
  metadata: { category: ex.category, equipment: ex.equipment },
}));

// 3. Substitution reasons — inlined from src/lib/data/exercises.ts

interface SubstitutionRaw {
  id: string;
  sourceExerciseId: string;
  substituteExerciseId: string;
  reason: string;
}

const substitutions: SubstitutionRaw[] = [
  { id: "sub-1", sourceExerciseId: "dumbbell-overhead-press", substituteExerciseId: "incline-dumbbell-press", reason: "Works pressing muscles without loading the shoulder overhead." },
  { id: "sub-2", sourceExerciseId: "romanian-deadlift", substituteExerciseId: "hamstring-curl", reason: "Reduces hinge demand when the lower back needs less loading." },
  { id: "sub-3", sourceExerciseId: "split-squat", substituteExerciseId: "leg-press", reason: "Provides a more stable lower-body option if single-leg work is uncomfortable." },
  { id: "sub-4", sourceExerciseId: "push-up", substituteExerciseId: "machine-chest-press", reason: "Avoids prolonged wrist extension while keeping horizontal pressing volume." },
  { id: "sub-5", sourceExerciseId: "squat", substituteExerciseId: "leg-press", reason: "Offers a supported squat pattern when the user wants less balance demand." },
  { id: "sub-6", sourceExerciseId: "lat-pulldown", substituteExerciseId: "band-lat-pulldown", reason: "Keeps vertical pulling when cable equipment is unavailable." },
];

const substitutionChunks: KnowledgeChunk[] = substitutions.map((sub) => ({
  id: `substitution-${sub.id}`,
  chunk_type: "substitution_reason",
  title: `Substitute ${sub.sourceExerciseId} → ${sub.substituteExerciseId}`,
  body: sub.reason,
  source_id: sub.id,
  metadata: {
    sourceExerciseId: sub.sourceExerciseId,
    substituteExerciseId: sub.substituteExerciseId,
  },
}));

// ---------------------------------------------------------------------------
// All chunks combined
// ---------------------------------------------------------------------------

const allChunks: KnowledgeChunk[] = [
  ...planningChunks,
  ...exerciseChunks,
  ...substitutionChunks,
];

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

const EMBEDDING_DIMENSION = 384;

function getFixtureEmbedding(): number[] {
  return new Array(EMBEDDING_DIMENSION).fill(0);
}

function getOllamaNativeBaseUrl(): string {
  const rawBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error(`Invalid OLLAMA_BASE_URL "${rawBaseUrl}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OLLAMA_BASE_URL must use http or https.");
  }
  // Strip the /v1 OpenAI-compat suffix so we can reach native Ollama endpoints.
  url.pathname = url.pathname.replace(/\/v1\/?$/, "");
  return url.toString().replace(/\/$/, "");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const race = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Embeddings request timed out after ${timeoutMs}ms.`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, race]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function getOllamaEmbedding(text: string): Promise<number[]> {
  const baseUrl = getOllamaNativeBaseUrl();
  const model = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
  const timeoutMs = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS ?? "30000", 10);

  const fetchEmbedding = fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      throw new Error(`Ollama embeddings request failed ${res.status}: ${body}`);
    }
    const data = (await res.json()) as { embedding?: number[] };
    if (!Array.isArray(data.embedding)) {
      throw new Error("Ollama response did not contain an embedding array.");
    }
    return data.embedding;
  });

  return withTimeout(fetchEmbedding, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000);
}

async function generateEmbedding(text: string, useFixture: boolean): Promise<number[]> {
  if (useFixture) return getFixtureEmbedding();
  return getOllamaEmbedding(text);
}

// ---------------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------------

function getSupabaseConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    console.error("[error] SUPABASE_URL is not set.");
    process.exit(1);
  }

  // Prefer service role key (bypasses RLS); fall back to anon key.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!key) {
    console.error(
      "[error] Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is set.",
    );
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[warn] SUPABASE_SERVICE_ROLE_KEY not found — using SUPABASE_ANON_KEY. " +
        "RLS policies may block the upsert.",
    );
  }

  return { url, key };
}

async function upsertChunk(
  row: KnowledgeChunkRow,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<void> {
  const endpoint = `${supabaseUrl}/rest/v1/knowledge_chunks`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Supabase upsert failed ${res.status}: ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const useFixture =
    process.argv.includes("--fixture") ||
    process.env.AI_PROVIDER === "fixture";

  if (useFixture) {
    console.log("[info] Fixture mode — using zero-vector embeddings.");
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  console.log(`Seeding ${allChunks.length} knowledge chunks...`);

  let succeeded = 0;
  let failed = 0;

  for (const chunk of allChunks) {
    // Generate embedding
    let embedding: number[];
    try {
      console.log(`Generating embedding for: ${chunk.title}...`);
      embedding = await generateEmbedding(chunk.body, useFixture);
    } catch (err) {
      console.error(
        `  [error] Failed to embed "${chunk.title}": ${(err as Error).message}`,
      );
      failed++;
      continue;
    }

    // Upsert to Supabase
    try {
      console.log(`  Upserting to Supabase...`);
      await upsertChunk({ ...chunk, embedding }, supabaseUrl, supabaseKey);
      succeeded++;
    } catch (err) {
      console.error(
        `  [error] Failed to upsert "${chunk.title}": ${(err as Error).message}`,
      );
      failed++;
    }
  }

  console.log(`\nDone. ${succeeded} chunks seeded.${failed > 0 ? ` ${failed} failed — see errors above.` : ""}`);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
