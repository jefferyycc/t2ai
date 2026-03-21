import { generateCoachingCopy, generateStructuredData } from "@/lib/ai";
import {
  ExperienceLevel,
  Limitation,
  OnboardingDraft,
  WorkoutGoal,
} from "@/lib/types";

type ExtractedOnboardingFields = {
  workoutGoal: WorkoutGoal | null;
  workoutDaysPerWeek: number | null;
  workoutDurationMinutes: number | null;
  experienceLevel: ExperienceLevel | null;
  limitations: Limitation[] | null;
};

const validGoals: WorkoutGoal[] = [
  "fat_loss",
  "hypertrophy",
  "strength",
  "general_fitness",
];

const validExperienceLevels: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const validLimitations: Limitation[] = [
  "knees",
  "shoulders",
  "lower_back",
  "wrists",
  "none",
];

function isWorkoutGoal(value: unknown): value is WorkoutGoal {
  return typeof value === "string" && validGoals.includes(value as WorkoutGoal);
}

function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return (
    typeof value === "string" &&
    validExperienceLevels.includes(value as ExperienceLevel)
  );
}

function sanitizeLimitations(value: unknown) {
  if (!Array.isArray(value)) return null;

  const next = value.filter(
    (item): item is Limitation =>
      typeof item === "string" && validLimitations.includes(item as Limitation),
  );

  return next.length > 0 ? Array.from(new Set(next)) : null;
}

function sanitizeExtractedFields(value: ExtractedOnboardingFields) {
  return {
    workoutGoal: isWorkoutGoal(value.workoutGoal) ? value.workoutGoal : null,
    workoutDaysPerWeek:
      typeof value.workoutDaysPerWeek === "number" &&
      Number.isInteger(value.workoutDaysPerWeek) &&
      value.workoutDaysPerWeek >= 2 &&
      value.workoutDaysPerWeek <= 6
        ? value.workoutDaysPerWeek
        : null,
    workoutDurationMinutes:
      typeof value.workoutDurationMinutes === "number" &&
      Number.isFinite(value.workoutDurationMinutes) &&
      value.workoutDurationMinutes > 0
        ? value.workoutDurationMinutes
        : null,
    experienceLevel: isExperienceLevel(value.experienceLevel)
      ? value.experienceLevel
      : null,
    limitations: sanitizeLimitations(value.limitations),
  };
}

export async function parseOnboardingMessage(
  message: string,
  currentDraft: OnboardingDraft,
): Promise<OnboardingDraft> {
  const nextDraft: OnboardingDraft = {
    ...currentDraft,
    limitations: currentDraft.limitations ?? [],
  };

  const extracted = await generateStructuredData<ExtractedOnboardingFields>({
    system: `You extract onboarding fields for a fitness planning app.

Return JSON only with exactly these keys:
- workoutGoal: one of "fat_loss", "hypertrophy", "strength", "general_fitness", or null
- workoutDaysPerWeek: integer 2 through 6, or null
- workoutDurationMinutes: integer minutes, or null
- experienceLevel: one of "beginner", "intermediate", "advanced", or null
- limitations: array containing any of "knees", "shoulders", "lower_back", "wrists", "none", or null

Rules:
- Use only information clearly stated in the latest user message.
- Do not invent missing information.
- If the user says they have no injuries or limitations, return ["none"].
- If the user provides a duration like 50 minutes, return 50.
- If a field is not clearly present in the latest message, return null for that field.`,
    prompt: `Current onboarding draft:
${JSON.stringify(currentDraft)}

Latest user message:
${message}

Return JSON only.`,
  });

  const sanitized = sanitizeExtractedFields(extracted);

  if (sanitized.workoutGoal) {
    nextDraft.workoutGoal = sanitized.workoutGoal;
  }

  if (sanitized.workoutDaysPerWeek) {
    nextDraft.workoutDaysPerWeek = sanitized.workoutDaysPerWeek;
  }

  if (sanitized.workoutDurationMinutes) {
    nextDraft.workoutDurationMinutes = sanitized.workoutDurationMinutes;
  }

  if (sanitized.experienceLevel) {
    nextDraft.experienceLevel = sanitized.experienceLevel;
  }

  if (sanitized.limitations) {
    nextDraft.limitations = sanitized.limitations;
  }

  return nextDraft;
}

export function getMissingField(draft: OnboardingDraft) {
  if (!draft.workoutGoal) return "workoutGoal" as const;
  if (!draft.workoutDaysPerWeek) return "workoutDaysPerWeek" as const;
  if (!draft.workoutDurationMinutes) return "workoutDurationMinutes" as const;
  if (!draft.limitations || draft.limitations.length === 0) return "limitations" as const;
  return null;
}

export async function buildInitialOnboardingMessage() {
  return generateCoachingCopy({
    system:
      "You are a concise AI fitness coach welcoming a new user. Ask for the user's workout goal, training days per week, workout duration for each session, experience level, and injuries or limitations to avoid. Keep it under 35 words.",
    prompt:
      "Write the first onboarding message for a personalized fitness planning chat.",
  });
}

export async function buildOnboardingReply(draft: OnboardingDraft) {
  const missingField = getMissingField(draft);

  if (!missingField) {
    return generateCoachingCopy({
      system:
        "You are a concise fitness onboarding coach. Confirm captured details and say the first weekly plan is ready.",
      prompt: `The captured profile is:
goal: ${draft.workoutGoal}
days: ${draft.workoutDaysPerWeek}
duration: ${draft.workoutDurationMinutes}
experience: ${draft.experienceLevel}
limitations: ${draft.limitations.join(", ")}
Write a short friendly confirmation in under 55 words.`,
    });
  }

  return generateCoachingCopy({
    system:
      "You are a concise fitness onboarding coach. Ask for the next missing detail only.",
    prompt: `The current draft is incomplete. Ask only for this missing field: ${missingField}. Keep it under 30 words.`,
  });
}
