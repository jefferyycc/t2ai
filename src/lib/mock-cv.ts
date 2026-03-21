import { AnalysisCreateInput, VideoAnalysis } from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

export function createMockAnalysis(
  input: AnalysisCreateInput & { userId: string },
): VideoAnalysis {
  const isSquat = input.exerciseType === "squat";

  return {
    id: createId("analysis"),
    userId: input.userId,
    videoId: input.videoId,
    exerciseType: input.exerciseType,
    status: "complete",
    repCount: isSquat ? 8 : 6,
    formScore: isSquat ? 79 : 75,
    confidenceScore: 0.86,
    feedbackBullets: isSquat
      ? [
          "Depth is consistent until the last two reps.",
          "The bar drifts slightly forward out of the bottom.",
          "Brace earlier before each rep to keep the torso tighter.",
        ]
      : [
          "The bar path is close overall, but it leaves the shins on the way up.",
          "Your lockout is controlled, which is good.",
          "Set the lats earlier so the first pull is more consistent.",
        ],
    nextSetRecommendation:
      "Keep the next set conservative. Repeat the weight if form stays crisp, or reduce slightly and prioritize cleaner reps.",
    coachSummary: isSquat
      ? "The squat set looks solid overall. The next improvement is a cleaner brace before each rep and a steadier bar path."
      : "The deadlift set is close. Stay conservative next set and focus on keeping the bar tighter to the body.",
    createdAt: nowIso(),
  };
}
