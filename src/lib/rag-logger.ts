type RagLogEntry = {
  query: string;
  chunks: Array<{
    id: string;
    title: string;
    similarity: number;
    chunkType: string;
  }>;
  targetPrompt: string; // e.g. "planner", "swap", "adjust"
  durationMs: number;
};

const isDev = process.env.NODE_ENV !== "production";
const isVerbose = process.env.KNOWLEDGE_RAG_DEBUG === "true";

export function logRagRetrieval(entry: RagLogEntry): void {
  if (!isDev) return;

  // Always log a one-line summary in dev
  console.log(`[RAG] ${entry.targetPrompt}: ${entry.chunks.length} chunks retrieved in ${entry.durationMs}ms`);

  if (!isVerbose) return;

  // Verbose: log each chunk with score
  console.log(`[RAG] Query: "${entry.query.slice(0, 100)}..."`);
  for (const chunk of entry.chunks) {
    console.log(`  [${chunk.chunkType}] ${chunk.title} (similarity: ${chunk.similarity.toFixed(4)})`);
  }
  console.log(`[RAG] ---`);
}

export function logRagDisabled(reason: string): void {
  if (!isDev) return;
  console.log(`[RAG] Disabled: ${reason}`);
}
