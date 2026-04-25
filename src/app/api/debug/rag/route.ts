import { NextResponse } from "next/server";
import { previewKnowledgeChunks } from "@/lib/knowledge-store";

/**
 * Dev-only endpoint that exposes the RAG retrieval layer.
 *
 * Why this exists: milestone 3 added pgvector-backed retrieval, but the
 * retrieved chunks are only injected into LLM prompts — there's no way for
 * a developer (or an interviewer reviewing the project) to verify that
 * retrieval actually ran or to inspect what came back. This endpoint makes
 * the RAG layer observable.
 *
 * Gating: returns 404 in production. Set ALLOW_RAG_DEBUG_ENDPOINT=true to
 * enable in production explicitly (don't, unless you've put auth in front).
 *
 * GET  /api/debug/rag?q=...&limit=8
 * POST /api/debug/rag  body: { query: string, limit?: number }
 */

function endpointAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_RAG_DEBUG_ENDPOINT === "true";
}

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

function clampLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 8;
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}

export async function GET(request: Request) {
  if (!endpointAllowed()) return notFound();

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = clampLimit(url.searchParams.get("limit"));

  const preview = await previewKnowledgeChunks(query, limit);
  return NextResponse.json(preview);
}

export async function POST(request: Request) {
  if (!endpointAllowed()) return notFound();

  let body: { query?: unknown; limit?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query : "";
  const limit = clampLimit(body.limit);

  const preview = await previewKnowledgeChunks(query, limit);
  return NextResponse.json(preview);
}
