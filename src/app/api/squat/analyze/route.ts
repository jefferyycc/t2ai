import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredData } from "@/lib/ai";
import { getServerUser, isAuthError } from "@/lib/auth";
import { saveSquatRun } from "@/lib/db";
import { scoreSquatPerformance } from "@/lib/squat/scoring";
import type { SquatCue, SquatRun } from "@/lib/types";

/**
 * Squat analysis API.
 *
 * Contract: the BROWSER runs MediaPipe and computes the metrics. This route
 * receives only the deterministic aggregate metrics — no raw video, no
 * landmark frames. The server then:
 *   1. Computes the score and tier (deterministic, source of truth).
 *   2. Asks the LLM to produce 2-3 short coaching cues from the metric
 *      summary. The LLM never sees raw landmarks and cannot adjust the score.
 *   3. Persists a SquatRun for adaptation in future plan generation.
 *
 * Why no raw frames: keeps the request small, removes a video upload path,
 * and makes the deterministic boundary obvious — the LLM only translates
 * already-validated numbers into language.
 */

const aggregateMetricsSchema = z.object({
  repCount: z.number().int().nonnegative(),
  meanDepthRatio: z.number(),
  worstDepthRatio: z.number(),
  meanKneeTracking: z.number(),
  worstKneeTracking: z.number(),
  meanHeelStability: z.number(),
  worstHeelStability: z.number(),
  meanTorsoLeanDeg: z.number(),
  worstTorsoLeanDeg: z.number(),
  meanTempoRatio: z.number(),
});

const requestSchema = z.object({
  source: z.enum(["upload", "webcam"]),
  metrics: aggregateMetricsSchema,
  confidence: z.number().min(0).max(1),
  durationSeconds: z.number().min(0),
});

const llmCueSchema = z.object({
  cues: z
    .array(
      z.object({
        focus: z.string().describe("Short label like 'depth' or 'knee tracking'."),
        message: z
          .string()
          .max(160)
          .describe("One short coaching sentence (under 25 words)."),
      }),
    )
    .max(3),
});

function buildLlmPrompt(input: {
  metrics: z.infer<typeof aggregateMetricsSchema>;
  score: number;
  tier: string;
  deterministicCues: SquatCue[];
}) {
  return `Squat session metrics:
- Reps: ${input.metrics.repCount}
- Depth ratio: mean ${input.metrics.meanDepthRatio.toFixed(2)}, worst ${input.metrics.worstDepthRatio.toFixed(2)} (1.0 = parallel)
- Knee tracking: mean ${input.metrics.meanKneeTracking.toFixed(2)}, worst ${input.metrics.worstKneeTracking.toFixed(2)} (1.0 = perfect alignment)
- Heel stability: mean ${input.metrics.meanHeelStability.toFixed(2)}, worst ${input.metrics.worstHeelStability.toFixed(2)} (1.0 = no rise)
- Torso lean: mean ${input.metrics.meanTorsoLeanDeg.toFixed(1)}°, worst ${input.metrics.worstTorsoLeanDeg.toFixed(1)}°
- Tempo ratio: ${input.metrics.meanTempoRatio.toFixed(2)} (descent / ascent; 2.0 = ideal)

Computed score: ${input.score} / 100 (${input.tier}).
Deterministic flags: ${
    input.deterministicCues.length === 0
      ? "none"
      : input.deterministicCues.map((c) => c.message).join(" | ")
  }

Write up to 3 short coaching cues. Anchor each cue to one of the deterministic flags above when possible. Do not contradict the score. Do not invent metrics that aren't listed.`;
}

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { source, metrics, confidence, durationSeconds } = parsed.data;

    // Deterministic score is the source of truth.
    const { score, tier, cues: deterministicCues } = scoreSquatPerformance(
      metrics,
      confidence,
    );

    // LLM provides language; falls back to deterministic cues on any failure.
    let cues: SquatCue[] = deterministicCues;
    try {
      const llm = await generateStructuredData({
        system:
          "You are a strength coach. Translate squat session metrics into 1-3 short, action-oriented cues. Keep each cue under 25 words. Do not invent numbers. Do not change the score.",
        prompt: buildLlmPrompt({ metrics, score, tier, deterministicCues }),
        schema: llmCueSchema,
      });

      if (llm.cues.length > 0) {
        cues = llm.cues.map((c) => ({
          metric: "overall",
          message: c.message,
        }));
      }
    } catch (error) {
      console.error("Squat coaching LLM failed, using deterministic cues", error);
    }

    const run: SquatRun = {
      id: crypto.randomUUID(),
      userId: user.id,
      source,
      repCount: metrics.repCount,
      score,
      tier,
      confidence,
      metrics,
      cues,
      durationSeconds,
      createdAt: new Date().toISOString(),
    };

    await saveSquatRun(run, user);

    return NextResponse.json({ run });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Squat analyze failed", error);
    return NextResponse.json(
      { error: "Failed to analyze squat session." },
      { status: 500 },
    );
  }
}
