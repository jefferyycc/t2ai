import { generateCoachingCopy, generateStructuredData } from "@/lib/ai";
import { OnboardingDraft } from "@/lib/types";
import { z } from "zod";

const validGoals = ["fat_loss", "hypertrophy", "strength", "general_fitness"] as const;
const validExperienceLevels = ["beginner", "intermediate", "advanced"] as const;
const validLimitations = ["knees", "shoulders", "lower_back", "wrists", "none"] as const;

const extractedSchema = z.object({
  workoutGoal: z.enum(validGoals).nullable(),
  workoutDaysPerWeek: z.number().int().min(2).max(6).nullable(),
  workoutDurationMinutes: z.number().int().positive().nullable(),
  experienceLevel: z.enum(validExperienceLevels).nullable(),
  limitations: z.array(z.enum(validLimitations)).nullable(),
});

type ExtractedOnboardingFields = z.infer<typeof extractedSchema>;

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

Rules:
- Use only information clearly stated in the latest user message.
- Do not invent missing information.
- If the user says they have no injuries or limitations, return ["none"].
- If the user provides a duration like 50 minutes, return 50.
- If a field is not clearly present in the latest message, return null for that field.`,
    prompt: `Current onboarding draft:
${JSON.stringify(currentDraft)}

The user was just asked to provide their: ${getMissingField(currentDraft)}

Latest user message:
${message}`,
    schema: extractedSchema,
  });

  if (extracted.workoutGoal) {
    nextDraft.workoutGoal = extracted.workoutGoal;
  }

  if (extracted.workoutDaysPerWeek) {
    nextDraft.workoutDaysPerWeek = extracted.workoutDaysPerWeek;
  }

  if (extracted.workoutDurationMinutes) {
    nextDraft.workoutDurationMinutes = extracted.workoutDurationMinutes;
  }

  if (extracted.experienceLevel) {
    nextDraft.experienceLevel = extracted.experienceLevel;
  }

  if (extracted.limitations) {
    nextDraft.limitations = extracted.limitations;
  }

  return nextDraft;
}

export function getMissingField(draft: OnboardingDraft) {
  if (!draft.workoutDaysPerWeek) return "workoutDaysPerWeek" as const;
  if (!draft.workoutDurationMinutes) return "workoutDurationMinutes" as const;
  if (!draft.limitations || draft.limitations.length === 0) return "limitations" as const;
  return null;
}

export async function buildInitialOnboardingMessage() {
  return generateCoachingCopy({
    system:
      "You are a concise AI fitness coach welcoming a new user. Ask for the user's training days per week, workout duration for each session, and injuries or limitations to avoid. You can also mention that knowing their workout goal (like fat loss or strength) is helpful but optional. Keep it under 35 words.",
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
goal: ${draft.workoutGoal ?? "not specified"}
days: ${draft.workoutDaysPerWeek}
duration: ${draft.workoutDurationMinutes}
experience: ${draft.experienceLevel ?? "not specified"}
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
