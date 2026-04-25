import { generateEmbedding } from "@/lib/embeddings";
import { formatPlanningKnowledge } from "@/lib/planning-knowledge";
import { logRagRetrieval, logRagDisabled } from "@/lib/rag-logger";
import type { Exercise, Profile } from "@/lib/types";

type KnowledgeChunk = {
  id: string;
  chunkType: string;
  title: string;
  body: string;
  similarity: number;
  metadata: Record<string, unknown>;
};

function isRagEnabled(): boolean {
  // RAG requires: KNOWLEDGE_RAG_ENABLED=true, SUPABASE_URL set, SUPABASE_ANON_KEY set
  return (
    process.env.KNOWLEDGE_RAG_ENABLED === "true" &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_ANON_KEY)
  );
}

async function queryKnowledgeChunks(
  queryText: string,
  limit: number = 8,
): Promise<KnowledgeChunk[]> {
  const embedding = await generateEmbedding(queryText);

  // Use Supabase RPC to do cosine similarity search
  // We need to call a Postgres function for this since PostgREST doesn't support vector ops directly
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge_chunks`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_embedding: JSON.stringify(embedding),
      match_count: limit,
      match_threshold: 0.5,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`Knowledge chunk query failed (${response.status}): ${body}`);
  }

  const rows = await response.json() as Array<{
    id: string;
    chunk_type: string;
    title: string;
    body: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>;

  return rows.map(row => ({
    id: row.id,
    chunkType: row.chunk_type,
    title: row.title,
    body: row.body,
    similarity: row.similarity,
    metadata: row.metadata,
  }));
}

function formatRetrievedKnowledge(chunks: KnowledgeChunk[]): string {
  return chunks
    .map(chunk => `- ${chunk.title}: ${chunk.body}`)
    .join("\n");
}

/**
 * Retrieve planning knowledge using RAG when available, falling back to
 * the deterministic planning-knowledge.ts when RAG is disabled or fails.
 */
export async function retrieveKnowledge(
  profile: Profile,
  availableExercises: Exercise[],
  context: { targetPrompt: string },
): Promise<string> {
  if (!isRagEnabled()) {
    logRagDisabled("KNOWLEDGE_RAG_ENABLED is not true or Supabase is not configured");
    return formatPlanningKnowledge(profile, availableExercises);
  }

  const queryText = buildQueryFromProfile(profile);
  const startTime = Date.now();

  try {
    const chunks = await queryKnowledgeChunks(queryText);
    const durationMs = Date.now() - startTime;

    logRagRetrieval({
      query: queryText,
      chunks: chunks.map(c => ({
        id: c.id,
        title: c.title,
        similarity: c.similarity,
        chunkType: c.chunkType,
      })),
      targetPrompt: context.targetPrompt,
      durationMs,
    });

    if (chunks.length === 0) {
      // No relevant chunks found — fall back to deterministic knowledge
      return formatPlanningKnowledge(profile, availableExercises);
    }

    return formatRetrievedKnowledge(chunks);
  } catch (error) {
    console.error("[RAG] Retrieval failed, falling back to deterministic knowledge:", error);
    return formatPlanningKnowledge(profile, availableExercises);
  }
}

function buildQueryFromProfile(profile: Profile): string {
  const parts: string[] = [];

  if (profile.workoutGoal) {
    parts.push(`goal: ${profile.workoutGoal.replace("_", " ")}`);
  }
  if (profile.experienceLevel) {
    parts.push(`experience: ${profile.experienceLevel}`);
  }
  if (profile.workoutDaysPerWeek) {
    parts.push(`${profile.workoutDaysPerWeek} days per week`);
  }
  if (profile.limitations.length > 0 && !profile.limitations.includes("none")) {
    parts.push(`limitations: ${profile.limitations.join(", ")}`);
  }

  return `workout planning for ${parts.join(", ")}`;
}

/**
 * Retrieve knowledge specifically for exercise swap/substitution context.
 */
export async function retrieveSwapKnowledge(
  exerciseName: string,
  reason: string,
): Promise<string | null> {
  if (!isRagEnabled()) return null;

  const queryText = `exercise swap for ${exerciseName}: ${reason}`;
  const startTime = Date.now();

  try {
    const chunks = await queryKnowledgeChunks(queryText, 4);
    const durationMs = Date.now() - startTime;

    logRagRetrieval({
      query: queryText,
      chunks: chunks.map(c => ({
        id: c.id,
        title: c.title,
        similarity: c.similarity,
        chunkType: c.chunkType,
      })),
      targetPrompt: "swap",
      durationMs,
    });

    if (chunks.length === 0) return null;

    return formatRetrievedKnowledge(chunks);
  } catch (error) {
    console.error("[RAG] Swap knowledge retrieval failed:", error);
    return null;
  }
}
