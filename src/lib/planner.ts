import { seedExercises } from "@/lib/data/exercises";
import { generateStructuredData } from "@/lib/ai";
import { z } from "zod";
import {
  Limitation,
  OnboardingDraft,
  Profile,
  WorkoutExercise,
  WorkoutPlan,
} from "@/lib/types";

// ... keep filterExercises and other helpers for context if they exist

function includesLimitation(limitations: Limitation[], value: Limitation) {
  return limitations.includes(value);
}

function filterExercises(profile: Profile | OnboardingDraft) {
  const limitations = profile.limitations ?? [];
  const equipment = "equipment" in profile ? profile.equipment : ["bodyweight", "dumbbells", "gym_machines"];

  return seedExercises.filter((exercise) => {
    const equipmentOk = exercise.equipment.some((item) => equipment.includes(item));

    if (!equipmentOk) return false;
    if (
      includesLimitation(limitations, "shoulders") &&
      exercise.category === "push_vertical"
    ) {
      return false;
    }
    if (
      includesLimitation(limitations, "lower_back") &&
      exercise.category === "hinge"
    ) {
      return exercise.id === "hamstring-curl" || exercise.id === "hip-thrust";
    }
    if (exercise.avoidFor.some((item) => limitations.includes(item))) {
      return false;
    }

    return true;
  });
}

const workoutPlanSchema = z.object({
  summary: z.string(),
  splitLabel: z.string(),
  days: z.array(z.object({
    title: z.string(),
    focus: z.string(),
    exercises: z.array(z.object({
      exerciseId: z.string(),
      targetMuscle: z.string().describe("The primary muscle group targeted, e.g. 'Quads', 'Chest', 'Lats'"),
      sets: z.number(),
      reps: z.string(),
      restSeconds: z.number(),
    }))
  }))
});

export async function generateWorkoutPlan(profile: Profile): Promise<WorkoutPlan> {
  const available = filterExercises(profile).map(e => ({
    id: e.id,
    name: e.name,
    category: e.category,
    equipment: e.equipment
  }));

  const generated = await generateStructuredData({
    system: "You are an expert fitness coach AI. Your task is to design a personalized workout plan.",
    prompt: `Create a ${profile.workoutDaysPerWeek} day workout plan for someone with a goal of ${profile.workoutGoal || 'general fitness'}.
They have ${profile.workoutDurationMinutes} minutes per session. Their experience level is ${profile.experienceLevel || 'not specified'}.
Available exercises (DO NOT USE ANY EXERCISE ID NOT IN THIS LIST):
${JSON.stringify(available, null, 2)}

Ensure the volume and exercise selection match their goals and time constraints. Provide a motivating summary in exactly 3 short sentences. For every exercise, specify the primary target muscle group.`,
    schema: workoutPlanSchema
  });

  const planId = crypto.randomUUID();

  return {
    id: planId,
    userId: profile.userId,
    profileId: profile.id,
    summary: generated.summary,
    splitLabel: generated.splitLabel,
    days: generated.days.map((day, i) => {
      const dayId = crypto.randomUUID();
      return {
        id: dayId,
        planId,
        dayIndex: i + 1,
        title: day.title,
        focus: day.focus,
        exercises: day.exercises.map(ex => {
          const fullEx = seedExercises.find(e => e.id === ex.exerciseId);
          if (!fullEx) return null;
          return {
            id: crypto.randomUUID(),
            exerciseId: fullEx.id,
            name: `${fullEx.name} (${ex.targetMuscle})`,
            category: fullEx.category,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            notes: fullEx.notes,
          };
        }).filter((item) => item !== null) as WorkoutExercise[]
      };
    }),
    updatedAt: new Date().toISOString(),
  };
}
