import { generateCoachingCopy } from "@/lib/ai";
import { OnboardingDraft } from "@/lib/types";

const goalMap = [
  { match: ["fat loss", "lose fat", "weight loss"], value: "fat_loss" as const },
  { match: ["hypertrophy", "muscle", "build muscle"], value: "hypertrophy" as const },
  { match: ["strength", "stronger"], value: "strength" as const },
  { match: ["general fitness", "fitness", "health"], value: "general_fitness" as const },
];

const experienceMap = [
  { match: ["beginner", "new"], value: "beginner" as const },
  { match: ["intermediate"], value: "intermediate" as const },
  { match: ["advanced"], value: "advanced" as const },
];

const limitationsMap = [
  { match: ["knee", "knees"], value: "knees" as const },
  { match: ["shoulder", "shoulders"], value: "shoulders" as const },
  { match: ["lower back", "back"], value: "lower_back" as const },
  { match: ["wrist", "wrists"], value: "wrists" as const },
];

export function parseOnboardingMessage(
  message: string,
  currentDraft: OnboardingDraft,
): OnboardingDraft {
  const nextDraft: OnboardingDraft = {
    ...currentDraft,
    limitations: currentDraft.limitations ?? [],
  };

  const normalized = message.toLowerCase();

  for (const goal of goalMap) {
    if (goal.match.some((item) => normalized.includes(item))) {
      nextDraft.workoutGoal = goal.value;
    }
  }

  const daysMatch = normalized.match(/([2-6])\s*(days|day)/);
  if (daysMatch) {
    nextDraft.workoutDaysPerWeek = Number(daysMatch[1]);
  }

  const durationMatch = normalized.match(/\b(30|45|60|75)\b/);
  if (durationMatch) {
    nextDraft.workoutDurationMinutes = Number(durationMatch[1]);
  }

  for (const experience of experienceMap) {
    if (experience.match.some((item) => normalized.includes(item))) {
      nextDraft.experienceLevel = experience.value;
    }
  }

  const foundLimitations = limitationsMap
    .filter((entry) => entry.match.some((item) => normalized.includes(item)))
    .map((entry) => entry.value);

  if (normalized.includes("none") || normalized.includes("no injuries")) {
    nextDraft.limitations = ["none"];
  } else if (foundLimitations.length > 0) {
    nextDraft.limitations = Array.from(
      new Set([
        ...nextDraft.limitations.filter((item) => item !== "none"),
        ...foundLimitations,
      ]),
    );
  }

  return nextDraft;
}

export function getMissingField(draft: OnboardingDraft) {
  if (!draft.workoutGoal) return "workoutGoal" as const;
  if (!draft.workoutDaysPerWeek) return "workoutDaysPerWeek" as const;
  if (!draft.workoutDurationMinutes) return "workoutDurationMinutes" as const;
  if (!draft.experienceLevel) return "experienceLevel" as const;
  if (!draft.limitations || draft.limitations.length === 0) return "limitations" as const;
  return null;
}

function missingFieldPrompt(field: ReturnType<typeof getMissingField>) {
  switch (field) {
    case "workoutGoal":
      return "What is your main workout goal: fat loss, hypertrophy, strength, or general fitness?";
    case "workoutDaysPerWeek":
      return "How many days per week do you want to train? Choose 2, 3, 4, 5, or 6.";
    case "workoutDurationMinutes":
      return "How long should each workout be? Choose 30, 45, 60, or 75 minutes.";
    case "experienceLevel":
      return "What is your experience level: beginner, intermediate, or advanced?";
    case "limitations":
      return "Do you have movement limitations or injuries to avoid around the knees, shoulders, lower back, wrists, or none?";
    default:
      return "I have enough information to build your first plan.";
  }
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
      fallback:
        "I have your goal, weekly training frequency, workout duration, experience level, and limitations. Your first weekly workout plan is ready.",
    });
  }

  return generateCoachingCopy({
    system:
      "You are a concise fitness onboarding coach. Ask for the next missing detail only.",
    prompt: `The current draft is incomplete. Ask only for this missing field: ${missingField}. Keep it under 30 words.`,
    fallback: missingFieldPrompt(missingField),
  });
}
