import {
  planningKnowledgeBase,
  type PlanningKnowledgeChunk,
} from "@/lib/data/knowledge-base";
import type { Exercise, Profile } from "@/lib/types";

/**
 * Deterministic fallback that ranks the shared planning knowledge base for a
 * given profile. Used when KNOWLEDGE_RAG_ENABLED is false or when the live
 * pgvector retrieval errors. The chunk definitions live in
 * src/lib/data/knowledge-base.ts so the seed script and this fallback can
 * never drift apart.
 */

function scoreChunk(chunk: PlanningKnowledgeChunk, profile: Profile, available: Exercise[]) {
  let score = chunk.priority ?? 0;

  if (chunk.goals?.includes(profile.workoutGoal ?? "general_fitness")) score += 5;
  if (
    chunk.experienceLevels?.includes(profile.experienceLevel ?? "intermediate")
  ) {
    score += 3;
  }
  if (chunk.limitations?.some((item) => profile.limitations.includes(item))) score += 5;
  if (
    chunk.minDays !== undefined &&
    chunk.maxDays !== undefined &&
    profile.workoutDaysPerWeek !== undefined &&
    profile.workoutDaysPerWeek >= chunk.minDays &&
    profile.workoutDaysPerWeek <= chunk.maxDays
  ) {
    score += 4;
  }
  if (
    chunk.categories?.some((category) =>
      available.some((exercise) => exercise.category === category),
    )
  ) {
    score += 2;
  }

  return score;
}

export function retrievePlanningKnowledge(
  profile: Profile,
  availableExercises: Exercise[],
) {
  return planningKnowledgeBase
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, profile, availableExercises),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function formatPlanningKnowledge(
  profile: Profile,
  availableExercises: Exercise[],
) {
  const chunks = retrievePlanningKnowledge(profile, availableExercises);
  return chunks
    .map((chunk) => `- ${chunk.title}: ${chunk.body}`)
    .join("\n");
}
