import type { Exercise, ExerciseCategory, WorkoutPlan } from "@/lib/types";

/**
 * Deterministic intent parser for plan-adjustment requests.
 *
 * Goal: when the user names an exact "from"/"to" pair (e.g. "swap deadbug
 * with squat"), resolve both sides without relying on the LLM, so the
 * downstream validator/applier sees the user's literal choice rather than
 * a model substitution.
 *
 * The parser is intentionally narrow:
 *   - It returns `explicit` only when both sides resolve unambiguously.
 *   - It returns `from-only` / `to-only` when one side resolves; callers
 *     pass that as a pin to the LLM rather than letting it free-select.
 *   - It returns `none` when nothing matches; the caller should defer to
 *     the LLM (free-form requests like "give me an easier core move").
 *
 * Matching is normalized (lowercase, alphanumerics only) and bidirectional
 * — both "dead bug" and "deadbug" resolve to the `dead-bug` exercise. Most
 * specific match wins on length, so "Goblet Squat" beats a substring hit
 * on "squat".
 */

export type SwapIntent =
  | {
      kind: "explicit";
      dayId: string;
      workoutExerciseId: string;
      fromExerciseId: string;
      toExerciseId: string;
    }
  | {
      // The user named a target term that matches multiple seed exercises
      // within the tie threshold (e.g. plain "squat" — could be Goblet Squat,
      // Barbell Back Squat, Box Squat). Caller should ask the user to pick.
      kind: "ambiguous-target";
      dayId: string | null;
      workoutExerciseId: string | null;
      fromExerciseId: string | null;
      toCandidateIds: string[];
    }
  | {
      kind: "from-only";
      dayId: string;
      workoutExerciseId: string;
      fromExerciseId: string;
    }
  | {
      kind: "to-only";
      toExerciseId: string;
    }
  | { kind: "none" };

// "to" is included for "swap A to B"; word boundaries prevent it matching
// inside other words. Order doesn't matter for correctness — `String.match`
// without /g returns the first hit.
const SWAP_SEPARATORS =
  /\binstead of\b|\bin place of\b|\bwith\b|\bfor\b|\bto\b|->|=>|→/i;

// Reverse-match (user-typed substring inside the candidate name) is gated
// at this length so single-letter typos don't trigger spurious hits.
const MIN_REVERSE_MATCH_LEN = 4;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type Candidate = {
  /** The id we want to surface back to the caller. */
  id: string;
  /** Normalized human-facing name (e.g. "deadbug" from "Dead Bug"). */
  nameNorm: string;
  /** Normalized exercise id (e.g. "deadbug" from "dead-bug"). */
  idNorm: string;
};

function scoreCandidate(sideNorm: string, candidate: Candidate): number {
  if (!sideNorm) return 0;
  let score = 0;

  // Forward: candidate name/id appears inside the user's side. Preferred,
  // because longer substring = more specific match.
  if (candidate.nameNorm && sideNorm.includes(candidate.nameNorm)) {
    score = Math.max(score, candidate.nameNorm.length);
  }
  if (candidate.idNorm && sideNorm.includes(candidate.idNorm)) {
    score = Math.max(score, candidate.idNorm.length);
  }

  // Reverse: user typed less than the full name. Gated to avoid 2-3 char
  // false positives.
  if (sideNorm.length >= MIN_REVERSE_MATCH_LEN) {
    if (candidate.nameNorm && candidate.nameNorm.includes(sideNorm)) {
      score = Math.max(score, sideNorm.length);
    }
    if (candidate.idNorm && candidate.idNorm.includes(sideNorm)) {
      score = Math.max(score, sideNorm.length);
    }
  }

  return score;
}

function bestCandidate(side: string, candidates: Candidate[]): Candidate | null {
  const sideNorm = normalize(side);
  if (!sideNorm) return null;

  let best: { candidate: Candidate; score: number } | null = null;
  for (const candidate of candidates) {
    const score = scoreCandidate(sideNorm, candidate);
    if (score > 0 && (!best || score > best.score)) {
      best = { candidate, score };
    }
  }
  return best?.candidate ?? null;
}

/**
 * Returns every candidate within `slop` of the top score. Used to detect
 * ambiguity: if "squat" reverse-matches Goblet Squat, Back Squat, and Box
 * Squat all at score 5, the caller should ask the user which one they meant
 * rather than silently pick the first.
 */
function topCandidates(
  side: string,
  candidates: Candidate[],
  slop = 0,
): Candidate[] {
  const sideNorm = normalize(side);
  if (!sideNorm) return [];

  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(sideNorm, candidate) }))
    .filter((entry) => entry.score > 0);

  if (scored.length === 0) return [];

  const maxScore = Math.max(...scored.map((entry) => entry.score));
  return scored
    .filter((entry) => entry.score >= maxScore - slop)
    .map((entry) => entry.candidate);
}

function dedupeById(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    out.push(candidate);
  }
  return out;
}

type PlanEntry = {
  dayId: string;
  workoutExerciseId: string;
  fromExerciseId: string;
  candidate: Candidate;
};

function buildPlanEntries(plan: WorkoutPlan): PlanEntry[] {
  return plan.days.flatMap((day) =>
    day.exercises.map((exercise) => ({
      dayId: day.id,
      workoutExerciseId: exercise.id,
      fromExerciseId: exercise.exerciseId,
      candidate: {
        // Use workoutExerciseId so we can locate the specific instance even
        // if the same exercise appears on multiple days.
        id: exercise.id,
        nameNorm: normalize(exercise.name),
        idNorm: normalize(exercise.exerciseId),
      },
    })),
  );
}

function buildSeedCandidates(seedExercises: Exercise[]): Candidate[] {
  return seedExercises.map((exercise) => ({
    id: exercise.id,
    nameNorm: normalize(exercise.name),
    idNorm: normalize(exercise.id),
  }));
}

export function parseSwapIntent(
  message: string,
  plan: WorkoutPlan,
  seedExercises: Exercise[],
): SwapIntent {
  const trimmed = message.trim();
  if (!trimmed) return { kind: "none" };

  const planEntries = buildPlanEntries(plan);
  const planCandidates = planEntries.map((entry) => entry.candidate);
  const seedCandidates = buildSeedCandidates(seedExercises);

  const findFromEntry = (instanceId: string) =>
    planEntries.find((entry) => entry.workoutExerciseId === instanceId) ?? null;

  // Phase 1: split on a swap separator, search left/right pools.
  const separatorMatch = trimmed.match(SWAP_SEPARATORS);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const leftText = trimmed.slice(0, separatorMatch.index);
    const rightText = trimmed.slice(separatorMatch.index + separatorMatch[0].length);

    const fromInstance = bestCandidate(leftText, planCandidates);
    const fromEntry = fromInstance ? findFromEntry(fromInstance.id) : null;

    // Look at the top-scoring target candidates and dedupe by id (a single
    // exercise can win by both name and id with the same score).
    const toCandidates = dedupeById(topCandidates(rightText, seedCandidates));

    if (toCandidates.length > 1) {
      return {
        kind: "ambiguous-target",
        dayId: fromEntry?.dayId ?? null,
        workoutExerciseId: fromEntry?.workoutExerciseId ?? null,
        fromExerciseId: fromEntry?.fromExerciseId ?? null,
        toCandidateIds: toCandidates.map((candidate) => candidate.id),
      };
    }

    const toMatch = toCandidates[0] ?? null;

    if (fromEntry && toMatch) {
      return {
        kind: "explicit",
        dayId: fromEntry.dayId,
        workoutExerciseId: fromEntry.workoutExerciseId,
        fromExerciseId: fromEntry.fromExerciseId,
        toExerciseId: toMatch.id,
      };
    }
    if (fromEntry) {
      return {
        kind: "from-only",
        dayId: fromEntry.dayId,
        workoutExerciseId: fromEntry.workoutExerciseId,
        fromExerciseId: fromEntry.fromExerciseId,
      };
    }
    if (toMatch) {
      return { kind: "to-only", toExerciseId: toMatch.id };
    }
    return { kind: "none" };
  }

  // Phase 2: no separator — try the whole message against both pools.
  // Useful for terse inputs like "deadbug squat" or "deadbug → squat" with
  // a separator we don't recognize.
  const wholeFromInstance = bestCandidate(trimmed, planCandidates);
  const wholeFrom = wholeFromInstance ? findFromEntry(wholeFromInstance.id) : null;
  const wholeTo = bestCandidate(trimmed, seedCandidates);

  if (wholeFrom && wholeTo && wholeFrom.fromExerciseId !== wholeTo.id) {
    return {
      kind: "explicit",
      dayId: wholeFrom.dayId,
      workoutExerciseId: wholeFrom.workoutExerciseId,
      fromExerciseId: wholeFrom.fromExerciseId,
      toExerciseId: wholeTo.id,
    };
  }
  if (wholeFrom) {
    return {
      kind: "from-only",
      dayId: wholeFrom.dayId,
      workoutExerciseId: wholeFrom.workoutExerciseId,
      fromExerciseId: wholeFrom.fromExerciseId,
    };
  }
  if (wholeTo) {
    return { kind: "to-only", toExerciseId: wholeTo.id };
  }
  return { kind: "none" };
}

const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  squat: "Quads",
  hinge: "Hamstrings",
  push_horizontal: "Chest",
  push_vertical: "Shoulders",
  pull_horizontal: "Back",
  pull_vertical: "Lats",
  single_leg: "Legs",
  core: "Core",
};

export function muscleLabelFor(category: ExerciseCategory): string {
  return CATEGORY_LABEL[category];
}
