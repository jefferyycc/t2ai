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
  coachReply: z.string().describe("A concise coach response. If more info is needed, ask for the next missing field. If everything is captured, confirm details and say the plan is ready."),
});

type ExtractedOnboardingFields = z.infer<typeof extractedSchema>;

export async function parseOnboardingMessage(
  message: string,
  currentDraft: OnboardingDraft,
): Promise<OnboardingDraft & { assistantMessage: string }> {
  const missingFieldBefore = getMissingField(currentDraft);
  
  const extracted = await generateStructuredData<ExtractedOnboardingFields>({
    system: `You are an expert fitness coach AI assistant onboarding a new user. 
Extract profile data AND generate the next coach response in a single step.

Profile Extraction Rules:
- Use only information clearly stated in the latest user message.
- Do not invent missing information.
- If the user says they have no injuries or limitations, return ["none"].
- If the user provides a duration like 50 minutes, return 50.
- If a field is not clearly present in the latest message, return null for that field.

Coaching Reply Rules:
- Keep replies under 30 words.
- If a specific field was just asked, focus on acknowledging it.
- If information is still missing, ask for the next single missing field politely.
- If everything is now complete, confirm the details captured and say the plan is ready.`,
    prompt: `Current onboarding draft:
${JSON.stringify(currentDraft)}

The user was just asked to provide their: ${missingFieldBefore || "initial info"}

Latest user message:
${message}`,
    schema: extractedSchema,
  });

  const nextDraft: OnboardingDraft = {
    ...currentDraft,
    limitations: currentDraft.limitations ?? [],
  };

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

  return {
    ...nextDraft,
    assistantMessage: extracted.coachReply,
  };
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
