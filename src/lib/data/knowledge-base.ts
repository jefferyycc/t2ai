/**
 * Single source of truth for the coaching knowledge base.
 *
 * Two consumers depend on these definitions:
 *   - src/lib/planning-knowledge.ts: deterministic fallback ranking when RAG
 *     is disabled or the vector retrieval errors
 *   - scripts/seed-knowledge.ts: seeds the Supabase knowledge_chunks table
 *     with vector embeddings for RAG retrieval
 *
 * Keeping the chunks here means the fallback can never drift from what was
 * embedded into pgvector. If you add or edit a planning rule, both paths
 * pick it up automatically.
 */

import type {
  ExerciseCategory,
  ExperienceLevel,
  Limitation,
  WorkoutGoal,
} from "@/lib/types";

export type KnowledgeChunkType =
  | "planning_rule"
  | "limitation_guidance"
  | "split_pattern"
  | "exercise_cue"
  | "substitution_reason";

/**
 * Authoritative shape for a planning-knowledge chunk.
 *
 * `chunkType` is required for the seed script (it maps to the
 * knowledge_chunk_type enum in migration 0003). The optional scoring fields
 * (goals, experienceLevels, limitations, categories, minDays, maxDays,
 * priority) drive the deterministic fallback ranking; they're discarded when
 * embedding for RAG.
 */
export type PlanningKnowledgeChunk = {
  id: string;
  chunkType: KnowledgeChunkType;
  title: string;
  body: string;
  goals?: WorkoutGoal[];
  experienceLevels?: ExperienceLevel[];
  limitations?: Limitation[];
  categories?: ExerciseCategory[];
  minDays?: number;
  maxDays?: number;
  priority?: number;
};

export const planningKnowledgeBase: PlanningKnowledgeChunk[] = [
  {
    id: "strength-basics",
    chunkType: "planning_rule",
    title: "Strength planning baseline",
    body:
      "For strength goals, keep the exercise menu tight, place the most demanding compound lifts first, favor 3 to 5 work sets, and usually keep reps between 4 and 8 with longer rest periods.",
    goals: ["strength"],
    priority: 4,
  },
  {
    id: "hypertrophy-basics",
    chunkType: "planning_rule",
    title: "Hypertrophy planning baseline",
    body:
      "For hypertrophy, distribute volume across the week, use 3 to 4 work sets on most exercises, and keep most reps between 6 and 12 while balancing presses, pulls, squat patterns, hinges, and single-leg work.",
    goals: ["hypertrophy"],
    priority: 4,
  },
  {
    id: "fat-loss-basics",
    chunkType: "planning_rule",
    title: "General fitness and fat loss baseline",
    body:
      "For general fitness or fat loss, keep sessions efficient, bias toward full-body coverage, use stable movements the user can recover from, and avoid highly specialized split days unless weekly frequency is high.",
    goals: ["fat_loss", "general_fitness"],
    priority: 3,
  },
  {
    id: "beginner-stability",
    chunkType: "planning_rule",
    title: "Beginner stability rule",
    body:
      "For beginners, prefer stable and easy-to-learn movements, avoid overloading every pattern in the same session, and repeat core movement patterns weekly so technique can improve.",
    experienceLevels: ["beginner"],
    priority: 3,
  },
  {
    id: "intermediate-balance",
    chunkType: "planning_rule",
    title: "Intermediate balance rule",
    body:
      "For intermediate lifters, keep weekly balance across squat, hinge, horizontal press, horizontal pull, vertical pull, single-leg, and core patterns while allowing one or two emphasis patterns based on goal.",
    experienceLevels: ["intermediate", "advanced"],
    priority: 3,
  },
  {
    id: "shoulder-rule",
    chunkType: "limitation_guidance",
    title: "Shoulder limitation rule",
    body:
      "If the user has shoulder limitations, avoid overhead pressing, keep pressing angles more stable, and favor horizontal pushes plus rows and pulldowns that do not provoke overhead discomfort.",
    limitations: ["shoulders"],
    categories: ["push_vertical", "push_horizontal", "pull_horizontal", "pull_vertical"],
    priority: 5,
  },
  {
    id: "lower-back-rule",
    chunkType: "limitation_guidance",
    title: "Lower-back limitation rule",
    body:
      "If the user has lower-back limitations, keep hinge volume conservative, favor supported or machine-based posterior chain work, and avoid pairing multiple high-fatigue trunk-loading exercises in one session.",
    limitations: ["lower_back"],
    categories: ["hinge", "pull_horizontal", "core"],
    priority: 5,
  },
  {
    id: "knee-rule",
    chunkType: "limitation_guidance",
    title: "Knee limitation rule",
    body:
      "If the user has knee limitations, favor supported squat patterns, controlled range of motion, stable single-leg work only when tolerated, and avoid filling a session with multiple knee-dominant movements.",
    limitations: ["knees"],
    categories: ["squat", "single_leg"],
    priority: 4,
  },
  {
    id: "wrist-rule",
    chunkType: "limitation_guidance",
    title: "Wrist limitation rule",
    body:
      "If the user has wrist limitations, avoid exercises that require long periods of wrist extension and prefer machine pressing, dumbbell variations with neutral grip, or forearm-based core work.",
    limitations: ["wrists"],
    categories: ["push_horizontal", "core"],
    priority: 4,
  },
  {
    id: "short-session-rule",
    chunkType: "planning_rule",
    title: "Short session rule",
    body:
      "For shorter sessions, keep each day to about 4 or 5 exercises, cover the main patterns first, and avoid adding low-value accessories that crowd out the primary work.",
    maxDays: 7,
    priority: 2,
  },
  {
    id: "two-day-split",
    chunkType: "split_pattern",
    title: "Two-day split pattern",
    body:
      "For two training days, default to full-body sessions with one squat pattern, one hinge or single-leg pattern, one press, one pull, and one core movement each day.",
    minDays: 2,
    maxDays: 2,
    priority: 4,
  },
  {
    id: "three-day-split",
    chunkType: "split_pattern",
    title: "Three-day split pattern",
    body:
      "For three training days, use either three full-body sessions or a lower, upper, full-body rhythm so every week still touches the main movement patterns at least once.",
    minDays: 3,
    maxDays: 3,
    priority: 4,
  },
  {
    id: "four-day-split",
    chunkType: "split_pattern",
    title: "Four-day split pattern",
    body:
      "For four training days, an upper/lower split is usually the cleanest default. Each lower day should separate squat and hinge emphasis, and each upper day should balance pressing and pulling.",
    minDays: 4,
    maxDays: 4,
    priority: 4,
  },
  {
    id: "five-day-split",
    chunkType: "split_pattern",
    title: "Five-day split pattern",
    body:
      "For five training days, use a structured mix of lower, upper push, upper pull, lower, and full-body or accessory work so fatigue stays manageable.",
    minDays: 5,
    maxDays: 5,
    priority: 4,
  },
];
