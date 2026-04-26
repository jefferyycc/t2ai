/**
 * Pure, deterministic squat metric computation.
 *
 * Inputs: an array of pose-landmark frames (from MediaPipe Pose Landmarker).
 * Outputs: per-rep metrics + aggregates.
 *
 * NO LLM IS INVOLVED HERE. This file owns the source of truth for what
 * counts as a rep, how depth is measured, and what "knees caved in" means.
 * The LLM in the API route only translates these numbers into language.
 *
 * Coordinate system: MediaPipe normalizes (x, y) to [0, 1] of the frame, with
 * +y pointing DOWN (image coordinates). So a higher hip means a SMALLER y.
 *
 * Side-view assumption: the user is standing in profile to the camera. We
 * pick the side with higher mean visibility for the joints we care about.
 */

import type {
  FrameLandmarks,
  PoseLandmark,
  RepMetrics,
  SquatAggregateMetrics,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// MediaPipe Pose landmark indices (subset we use)
// Reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------
export const POSE_INDEX = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT: 31,
  RIGHT_FOOT: 32,
} as const;

const VISIBILITY_THRESHOLD = 0.5;
/**
 * Frames per second we assume when timestamps are not provided. MediaPipe
 * normally returns timestampMs from the video element; this fallback keeps
 * the algorithm usable in tests where timestamps are synthesized.
 */
const FALLBACK_FPS = 30;

// ---------------------------------------------------------------------------
// Side selection (left vs right of body)
// ---------------------------------------------------------------------------

type Side = "left" | "right";

type SideJoints = {
  shoulder: PoseLandmark;
  hip: PoseLandmark;
  knee: PoseLandmark;
  ankle: PoseLandmark;
  heel: PoseLandmark;
};

function joints(frame: FrameLandmarks, side: Side): SideJoints | null {
  const lm = frame.landmarks;
  const idx = side === "left"
    ? {
        shoulder: POSE_INDEX.LEFT_SHOULDER,
        hip: POSE_INDEX.LEFT_HIP,
        knee: POSE_INDEX.LEFT_KNEE,
        ankle: POSE_INDEX.LEFT_ANKLE,
        heel: POSE_INDEX.LEFT_HEEL,
      }
    : {
        shoulder: POSE_INDEX.RIGHT_SHOULDER,
        hip: POSE_INDEX.RIGHT_HIP,
        knee: POSE_INDEX.RIGHT_KNEE,
        ankle: POSE_INDEX.RIGHT_ANKLE,
        heel: POSE_INDEX.RIGHT_HEEL,
      };

  const shoulder = lm[idx.shoulder];
  const hip = lm[idx.hip];
  const knee = lm[idx.knee];
  const ankle = lm[idx.ankle];
  const heel = lm[idx.heel];

  if (!shoulder || !hip || !knee || !ankle || !heel) return null;
  return { shoulder, hip, knee, ankle, heel };
}

function meanVisibility(frame: FrameLandmarks, side: Side): number {
  const sj = joints(frame, side);
  if (!sj) return 0;
  return (
    (sj.shoulder.visibility +
      sj.hip.visibility +
      sj.knee.visibility +
      sj.ankle.visibility +
      sj.heel.visibility) /
    5
  );
}

/**
 * Pick which side of the body has the better view across the clip. Side-view
 * footage usually has one side's joints visible and the other occluded.
 */
export function pickDominantSide(frames: FrameLandmarks[]): Side {
  let leftSum = 0;
  let rightSum = 0;
  for (const f of frames) {
    leftSum += meanVisibility(f, "left");
    rightSum += meanVisibility(f, "right");
  }
  return rightSum >= leftSum ? "right" : "left";
}

// ---------------------------------------------------------------------------
// Confidence: fraction of frames with usable joint visibility
// ---------------------------------------------------------------------------

export function computeConfidence(frames: FrameLandmarks[], side: Side): number {
  if (frames.length === 0) return 0;
  let usable = 0;
  for (const f of frames) {
    if (meanVisibility(f, side) >= VISIBILITY_THRESHOLD) usable++;
  }
  return usable / frames.length;
}

// ---------------------------------------------------------------------------
// Rep detection
// ---------------------------------------------------------------------------

/**
 * A rep is detected when the dominant-side hip Y reaches a local maximum
 * (lowest body position in image coords) bracketed by minima (standing tall).
 * Standing = small hip Y; bottom = large hip Y. We use a hysteresis around
 * the inter-frame range so noisy frames don't false-trigger.
 */
type Phase = { startIdx: number; bottomIdx: number; endIdx: number };

export function detectReps(frames: FrameLandmarks[], side: Side): Phase[] {
  if (frames.length < 5) return [];

  // Build hip-Y series, masking frames where the side isn't visible.
  const hipY: Array<number | null> = frames.map((f) => {
    const sj = joints(f, side);
    if (!sj || sj.hip.visibility < VISIBILITY_THRESHOLD) return null;
    return sj.hip.y;
  });

  const valid = hipY.filter((v): v is number => v !== null);
  if (valid.length < 5) return [];

  const minY = Math.min(...valid);
  const maxY = Math.max(...valid);
  const range = maxY - minY;
  if (range < 0.05) return []; // basically standing still

  // Threshold for "in the bottom of a rep" — a fraction below the standing line.
  const bottomThreshold = minY + range * 0.6;
  const standingThreshold = minY + range * 0.2;

  const phases: Phase[] = [];
  let state: "standing" | "descending" | "bottomed" | "ascending" = "standing";
  let startIdx = 0;
  let bottomIdx = 0;
  let bottomY = -Infinity;

  for (let i = 0; i < hipY.length; i++) {
    const y = hipY[i];
    if (y === null) continue;

    switch (state) {
      case "standing":
        if (y > standingThreshold) {
          state = "descending";
          startIdx = i;
          bottomY = y;
          bottomIdx = i;
        }
        break;
      case "descending":
        if (y > bottomY) {
          bottomY = y;
          bottomIdx = i;
        }
        if (y >= bottomThreshold) {
          state = "bottomed";
        } else if (y < standingThreshold) {
          // Bailed out before reaching depth — discard.
          state = "standing";
        }
        break;
      case "bottomed":
        if (y > bottomY) {
          bottomY = y;
          bottomIdx = i;
        }
        if (y < bottomThreshold) {
          state = "ascending";
        }
        break;
      case "ascending":
        if (y < standingThreshold) {
          phases.push({ startIdx, bottomIdx, endIdx: i });
          state = "standing";
          bottomY = -Infinity;
        }
        break;
    }
  }

  return phases;
}

// ---------------------------------------------------------------------------
// Per-rep metric computation
// ---------------------------------------------------------------------------

function angleDeg(vx: number, vy: number, wx: number, wy: number): number {
  const dot = vx * wx + vy * wy;
  const magV = Math.hypot(vx, vy);
  const magW = Math.hypot(wx, wy);
  if (magV === 0 || magW === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magV * magW)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function durationMs(frames: FrameLandmarks[], a: number, b: number): number {
  if (a === b) return 0;
  const ta = frames[a]?.timestampMs;
  const tb = frames[b]?.timestampMs;
  if (typeof ta === "number" && typeof tb === "number") return Math.max(0, tb - ta);
  // Fallback: assume FALLBACK_FPS.
  return ((b - a) * 1000) / FALLBACK_FPS;
}

function metricsForRep(
  frames: FrameLandmarks[],
  side: Side,
  phase: Phase,
  repIndex: number,
): RepMetrics | null {
  const startJoints = joints(frames[phase.startIdx], side);
  const bottomJoints = joints(frames[phase.bottomIdx], side);

  if (!startJoints || !bottomJoints) return null;

  // Depth ratio: hip-knee vertical distance compared to femur length at start.
  // Standing femur length is hip→knee distance. At bottom, hipY should be at or
  // below kneeY for parallel. Ratio = (hipY - kneeY) / femurLength + 1.
  const standingFemur = Math.hypot(
    startJoints.knee.x - startJoints.hip.x,
    startJoints.knee.y - startJoints.hip.y,
  );

  const hipKneeDelta = bottomJoints.hip.y - bottomJoints.knee.y;
  // hipY > kneeY means hip is below knee in image coords (parallel or below).
  const depthRatio = standingFemur > 0
    ? 1 + hipKneeDelta / standingFemur
    : 0;

  // Knee tracking proxy: lateral position of knee vs ankle at bottom.
  // In a pure side view, |knee.x - ankle.x| should be small. Larger values
  // mean the camera is catching valgus or knee drift.
  const kneeTrackingScore =
    standingFemur > 0
      ? 1 - Math.min(1, Math.abs(bottomJoints.knee.x - bottomJoints.ankle.x) / standingFemur)
      : 0;

  // Heel stability: vertical displacement of heel from start to bottom.
  // Less is better. Normalize by femur length.
  const heelStability =
    standingFemur > 0
      ? 1 -
        Math.min(
          1,
          Math.abs(bottomJoints.heel.y - startJoints.heel.y) / standingFemur,
        )
      : 0;

  // Torso lean: angle of shoulder→hip vector from vertical at bottom.
  const torsoVecX = bottomJoints.shoulder.x - bottomJoints.hip.x;
  const torsoVecY = bottomJoints.shoulder.y - bottomJoints.hip.y;
  // Vertical reference: (0, -1) (up in image coords).
  const torsoLeanDeg = angleDeg(torsoVecX, torsoVecY, 0, -1);

  return {
    repIndex,
    depthRatio,
    kneeTrackingScore,
    heelStability,
    torsoLeanDeg,
    descentMs: durationMs(frames, phase.startIdx, phase.bottomIdx),
    ascentMs: durationMs(frames, phase.bottomIdx, phase.endIdx),
  };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function safeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function safeMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

function safeMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

export function aggregateRepMetrics(reps: RepMetrics[]): SquatAggregateMetrics {
  const tempoRatios = reps
    .filter((r) => r.ascentMs > 0)
    .map((r) => r.descentMs / r.ascentMs);

  return {
    repCount: reps.length,
    meanDepthRatio: safeMean(reps.map((r) => r.depthRatio)),
    worstDepthRatio: safeMin(reps.map((r) => r.depthRatio)),
    meanKneeTracking: safeMean(reps.map((r) => r.kneeTrackingScore)),
    worstKneeTracking: safeMin(reps.map((r) => r.kneeTrackingScore)),
    meanHeelStability: safeMean(reps.map((r) => r.heelStability)),
    worstHeelStability: safeMin(reps.map((r) => r.heelStability)),
    meanTorsoLeanDeg: safeMean(reps.map((r) => r.torsoLeanDeg)),
    worstTorsoLeanDeg: safeMax(reps.map((r) => r.torsoLeanDeg)),
    meanTempoRatio: safeMean(tempoRatios),
  };
}

// ---------------------------------------------------------------------------
// Top-level API
// ---------------------------------------------------------------------------

export type AnalyzeFramesResult = {
  side: Side;
  reps: RepMetrics[];
  aggregate: SquatAggregateMetrics;
  confidence: number;
  durationSeconds: number;
};

/**
 * End-to-end metric extraction from a sequence of pose frames.
 * This is a pure function — same input, same output, no I/O.
 */
export function analyzeFrames(frames: FrameLandmarks[]): AnalyzeFramesResult {
  if (frames.length === 0) {
    return {
      side: "right",
      reps: [],
      aggregate: aggregateRepMetrics([]),
      confidence: 0,
      durationSeconds: 0,
    };
  }

  const side = pickDominantSide(frames);
  const phases = detectReps(frames, side);

  const reps: RepMetrics[] = [];
  phases.forEach((phase, i) => {
    const m = metricsForRep(frames, side, phase, i + 1);
    if (m) reps.push(m);
  });

  const first = frames[0].timestampMs;
  const last = frames[frames.length - 1].timestampMs;
  const durationSeconds =
    typeof first === "number" && typeof last === "number" && last >= first
      ? (last - first) / 1000
      : frames.length / FALLBACK_FPS;

  return {
    side,
    reps,
    aggregate: aggregateRepMetrics(reps),
    confidence: computeConfidence(frames, side),
    durationSeconds,
  };
}
