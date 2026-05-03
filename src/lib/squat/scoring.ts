/**
 * Deterministic squat scoring.
 *
 * Translates aggregate metrics into a 0–100 score and a three-tier label.
 * The score is the SOURCE OF TRUTH for the demo — the LLM only generates
 * coaching cues from these numbers, never adjusts the score itself.
 *
 * Each metric is normalized to 0–1 (1 = ideal), weighted, and summed. Then
 * confidence is folded in: low landmark visibility caps the score so a
 * murky video doesn't get inflated grades.
 */

import type {
  SquatAggregateMetrics,
  SquatScoreTier,
  SquatCue,
} from "@/lib/types";

type WeightedComponent = {
  name: keyof SquatAggregateMetrics | "overall";
  /** 0..1, 1 = perfect. */
  normalized: number;
  weight: number;
};

const WEIGHTS = {
  depth: 0.30,
  kneeTracking: 0.25,
  heelStability: 0.15,
  torsoLean: 0.15,
  tempo: 0.15,
} as const;

// ---------------------------------------------------------------------------
// Per-metric normalization
// ---------------------------------------------------------------------------

function normalizeDepth(meanDepthRatio: number, worstDepthRatio: number): number {
  // 1.0 = exactly parallel. <1.0 = above parallel (bad). >1.05 = below parallel (great).
  // Score the worst rep more harshly than the mean.
  const meanScore = clamp01((meanDepthRatio - 0.85) / 0.20); // 0.85 → 0, 1.05 → 1
  const worstScore = clamp01((worstDepthRatio - 0.80) / 0.25);
  return 0.5 * meanScore + 0.5 * worstScore;
}

function normalizeKneeTracking(mean: number, worst: number): number {
  // Already 0..1 from metrics; 1 = good alignment.
  return 0.5 * mean + 0.5 * worst;
}

function normalizeHeelStability(mean: number, worst: number): number {
  return 0.5 * mean + 0.5 * worst;
}

function normalizeTorsoLean(meanDeg: number, worstDeg: number): number {
  // Forward torso lean of 30–50° at the bottom is normal across squat
  // styles (low-bar back squat, longer femurs, average-or-worse ankle
  // mobility). Real form breakdown shows up beyond ~60°, and "the chest
  // collapses" is more of a worst-rep failure than a mean signal.
  // Mean: 30° → 1.0, 80° → 0.0. Worst: 35° → 1.0, 90° → 0.0.
  const meanScore = 1 - clamp01((meanDeg - 30) / 50);
  const worstScore = 1 - clamp01((worstDeg - 35) / 55);
  return 0.5 * meanScore + 0.5 * worstScore;
}

function normalizeTempo(meanRatio: number): number {
  // Ideal ratio: descent 1.5–2.5x ascent (controlled eccentric).
  // 1.0 = identical (ok), 2.0 = ideal, 4.0 = grinding too slow.
  if (meanRatio <= 0) return 0;
  const distance = Math.abs(Math.log(meanRatio) - Math.log(2));
  // log(2) ≈ 0.69; distance of 0 → 1, distance of 0.7 → 0.
  return clamp01(1 - distance / 0.7);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

// ---------------------------------------------------------------------------
// Cue generation (deterministic, ranked by severity)
// ---------------------------------------------------------------------------

function generateCues(components: WeightedComponent[]): SquatCue[] {
  // Pick the worst (lowest normalized) components and turn them into
  // human-readable hints. Cap at 3 to keep the LLM output focused.
  const sorted = [...components].sort((a, b) => a.normalized - b.normalized);
  const cues: SquatCue[] = [];

  for (const c of sorted) {
    if (cues.length >= 3) break;
    if (c.normalized >= 0.8) continue;
    const message = cueMessageFor(c.name, c.normalized);
    if (message) cues.push({ metric: c.name, message });
  }

  return cues;
}

function cueMessageFor(
  name: WeightedComponent["name"],
  normalized: number,
): string | null {
  const severity = normalized < 0.4 ? "major" : "moderate";

  switch (name) {
    case "meanDepthRatio":
    case "worstDepthRatio":
      return severity === "major"
        ? "Most reps stopped well above parallel — work on hitting depth before adding load."
        : "Depth was inconsistent — aim for hip crease level with the knee on every rep.";
    case "meanKneeTracking":
    case "worstKneeTracking":
      return severity === "major"
        ? "Knees drifted out of line with the ankles repeatedly — cue 'spread the floor' on the way down."
        : "Knee tracking wandered on a few reps — keep the knees stacked over the mid-foot.";
    case "meanHeelStability":
    case "worstHeelStability":
      return severity === "major"
        ? "Heels lifted at the bottom — try a small heel elevation or work on ankle mobility."
        : "Heels shifted slightly — keep your weight balanced through the whole foot.";
    case "meanTorsoLeanDeg":
    case "worstTorsoLeanDeg":
      return severity === "major"
        ? "Torso pitched forward sharply — keep the chest up and brace before the descent."
        : "Some forward lean appeared at the bottom — focus on staying tall through the hole.";
    case "meanTempoRatio":
      return severity === "major"
        ? "Tempo was rushed — aim for a controlled 2-3 second descent before driving up."
        : "Slow the descent slightly to keep tension and improve control.";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Top-level scoring
// ---------------------------------------------------------------------------

export type SquatScoreResult = {
  score: number;
  tier: SquatScoreTier;
  cues: SquatCue[];
};

export function scoreSquatPerformance(
  metrics: SquatAggregateMetrics,
  confidence: number,
): SquatScoreResult {
  const components: WeightedComponent[] = [
    {
      name: "meanDepthRatio",
      normalized: normalizeDepth(metrics.meanDepthRatio, metrics.worstDepthRatio),
      weight: WEIGHTS.depth,
    },
    {
      name: "meanKneeTracking",
      normalized: normalizeKneeTracking(metrics.meanKneeTracking, metrics.worstKneeTracking),
      weight: WEIGHTS.kneeTracking,
    },
    {
      name: "meanHeelStability",
      normalized: normalizeHeelStability(metrics.meanHeelStability, metrics.worstHeelStability),
      weight: WEIGHTS.heelStability,
    },
    {
      name: "meanTorsoLeanDeg",
      normalized: normalizeTorsoLean(metrics.meanTorsoLeanDeg, metrics.worstTorsoLeanDeg),
      weight: WEIGHTS.torsoLean,
    },
    {
      name: "meanTempoRatio",
      normalized: normalizeTempo(metrics.meanTempoRatio),
      weight: WEIGHTS.tempo,
    },
  ];

  const weightedSum = components.reduce(
    (sum, c) => sum + c.normalized * c.weight,
    0,
  );

  // Confidence cap: low visibility caps the score — a 0.5-confidence run
  // tops out at 75. A 0.0-confidence run tops out at 50.
  const confidenceCap = 0.5 + 0.5 * clamp01(confidence);

  const rawScore = Math.round(weightedSum * 100 * Math.min(1, confidenceCap / 1));
  const score = Math.max(0, Math.min(100, rawScore));

  const tier: SquatScoreTier =
    score >= 80 ? "good" : score >= 50 ? "needs_work" : "poor";

  return { score, tier, cues: generateCues(components) };
}
