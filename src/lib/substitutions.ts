import { generateCoachingCopy } from "@/lib/ai";
import { AppState, Exercise, SwapSuggestion, WorkoutDay } from "@/lib/types";

function getCompatibleExercises(state: AppState, sourceExerciseId: string) {
  const { substitutions, exercises, profile } = state;

  return substitutions
    .filter((item) => item.sourceExerciseId === sourceExerciseId)
    .map((item) => {
      const exercise = exercises.find(
        (candidate) => candidate.id === item.substituteExerciseId,
      );

      if (!exercise) return null;

      const hasEquipment = exercise.equipment.some((entry) =>
        profile.equipment.includes(entry),
      );
      const blockedByLimitation =
        exercise.avoidFor.some((entry) => profile.limitations.includes(entry)) ||
        (profile.limitations.includes("shoulders") &&
          exercise.category === "push_vertical");

      if (!hasEquipment || blockedByLimitation) {
        return null;
      }

      return {
        exercise,
        reason: item.reason,
      };
    })
    .filter(
      (item): item is { exercise: Exercise; reason: string } => item !== null,
    );
}

export function getSwapSuggestions(
  state: AppState,
  sourceExerciseId: string,
): SwapSuggestion[] {
  return getCompatibleExercises(state, sourceExerciseId)
    .slice(0, 2)
    .map((item) => ({
      exerciseId: item.exercise.id,
      name: item.exercise.name,
      reason: item.reason,
    }));
}

export async function buildSwapReply(
  day: WorkoutDay,
  exerciseName: string,
  suggestions: SwapSuggestion[],
  message: string,
) {
  const fallback =
    suggestions.length > 0
      ? `I can swap ${exerciseName}. Based on your equipment and limitations, ${suggestions[0].name} is the best replacement. If that looks good, accept the swap.`
      : `I could not find a safer or more suitable substitute for ${exerciseName} with the current equipment and limitations.`;

  return generateCoachingCopy({
    system:
      "You are a concise fitness coach. Explain substitution suggestions without medical language and keep it under 60 words.",
    prompt: `Workout day: ${day.title}
Exercise to replace: ${exerciseName}
User complaint: ${message}
Suggestions: ${suggestions
      .map((item) => `${item.name}: ${item.reason}`)
      .join("; ")}
Write a short reply.`,
    fallback,
  });
}
