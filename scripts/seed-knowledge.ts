/**
 * seed-knowledge.ts
 *
 * Seed script for the fitness coaching app's RAG system.
 *
 * Sources of truth:
 *   - src/lib/data/knowledge-base.ts: planning rules, limitation guidance, splits
 *   - src/lib/data/exercises.ts:      exercise cues, substitution reasons
 *
 * This script imports those canonical lists, generates embeddings, and upserts
 * them into the Supabase `knowledge_chunks` table. The deterministic fallback
 * (planning-knowledge.ts) consumes the same definitions, so embedded chunks
 * cannot drift from what the fallback ranks.
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
// Imports
// ---------------------------------------------------------------------------
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads .env.local before any env reads happen in main(). Kept inside an async
 * function (rather than at module top level) because tsx transpiles this file
 * to CJS, which doesn't allow top-level await.
 */
async function loadDotenv(): Promise<void> {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.warn(
      `[warn] .env.local not found at ${envPath}. ` +
        "Create it with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).",
    );
    return;
  }
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
// Canonical knowledge sources (single source of truth, shared with fallback)
// ---------------------------------------------------------------------------

import {
  planningKnowledgeBase,
  type KnowledgeChunkType,
} from "@/lib/data/knowledge-base";
import { seedExercises, seedSubstitutions } from "@/lib/data/exercises";

interface KnowledgeChunk {
  id: string;
  chunk_type: KnowledgeChunkType;
  title: string;
  body: string;
  source_id: string | null;
  metadata: Record<string, unknown>;
}

interface KnowledgeChunkRow extends KnowledgeChunk {
  embedding: number[];
}

// ---------------------------------------------------------------------------
// Build chunks from canonical sources
// ---------------------------------------------------------------------------

const planningChunks: KnowledgeChunk[] = planningKnowledgeBase.map((chunk) => {
  const metadata: Record<string, unknown> = {};
  if (chunk.goals) metadata.goals = chunk.goals;
  if (chunk.experienceLevels) metadata.experienceLevels = chunk.experienceLevels;
  if (chunk.limitations) metadata.limitations = chunk.limitations;
  if (chunk.categories) metadata.categories = chunk.categories;
  if (chunk.minDays !== undefined) metadata.minDays = chunk.minDays;
  if (chunk.maxDays !== undefined) metadata.maxDays = chunk.maxDays;

  return {
    id: chunk.id,
    chunk_type: chunk.chunkType,
    title: chunk.title,
    body: chunk.body,
    source_id: null,
    metadata,
  };
});

const exerciseChunks: KnowledgeChunk[] = seedExercises.map((ex) => ({
  id: `exercise-cue-${ex.id}`,
  chunk_type: "exercise_cue",
  title: ex.name,
  body: ex.notes ?? "",
  source_id: ex.id,
  metadata: { category: ex.category, equipment: ex.equipment },
}));

const substitutionChunks: KnowledgeChunk[] = seedSubstitutions.map((sub) => ({
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
  const embedding = useFixture ? getFixtureEmbedding() : await getOllamaEmbedding(text);

  // Guard against silent dimension drift: the pgvector column is vector(384).
  // If OLLAMA_EMBED_MODEL is changed to a different model, the upsert would
  // fail with a confusing error — fail loud here instead.
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIMENSION}. ` +
        `Check OLLAMA_EMBED_MODEL — the schema is pinned to vector(${EMBEDDING_DIMENSION}).`,
    );
  }

  return embedding;
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

async function deleteStaleChunks(
  liveIds: string[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<number> {
  // Removes chunks whose IDs are no longer in the canonical sources.
  // Keeps the table aligned with code so a deleted planning rule stops
  // appearing in retrieval results.
  const endpoint =
    `${supabaseUrl}/rest/v1/knowledge_chunks?id=not.in.(${liveIds
      .map((id) => `"${id}"`)
      .join(",")})`;

  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "return=representation",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Supabase delete-stale failed ${res.status}: ${body}`);
  }

  const removed = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(removed) ? removed.length : 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await loadDotenv();

  const useFixture =
    process.argv.includes("--fixture") ||
    process.env.AI_PROVIDER === "fixture";
  const skipPrune = process.argv.includes("--no-prune");

  if (useFixture) {
    console.log("[info] Fixture mode — using zero-vector embeddings.");
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  console.log(`Seeding ${allChunks.length} knowledge chunks...`);

  let succeeded = 0;
  let failed = 0;

  for (const chunk of allChunks) {
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

  console.log(
    `\nUpsert: ${succeeded} chunks seeded.${failed > 0 ? ` ${failed} failed — see errors above.` : ""}`,
  );

  if (skipPrune) {
    console.log("[info] --no-prune set; skipping stale-chunk cleanup.");
    return;
  }

  try {
    const liveIds = allChunks.map((c) => c.id);
    const removed = await deleteStaleChunks(liveIds, supabaseUrl, supabaseKey);
    if (removed > 0) {
      console.log(`Pruned ${removed} stale chunks no longer present in code.`);
    } else {
      console.log("No stale chunks to prune.");
    }
  } catch (err) {
    console.warn(
      `[warn] Stale-chunk pruning failed: ${(err as Error).message}. ` +
        "Re-run with --no-prune to skip.",
    );
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
