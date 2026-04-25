import { seedExercises, seedSubstitutions } from "@/lib/data/exercises";
import { generateStructuredData } from "@/lib/ai";
import { retrieveKnowledge } from "@/lib/knowledge-store";
import { z } from "zod";
import {
  Exercise,
  ExerciseCategory,
  Limitation,
  OnboardingDraft,
  Profile,
  WorkoutExercise,
  WorkoutPlan,
} from "@/lib/types";

function includesLimitation(limitations: Limitation[], value: Limitation) {
  return limitations.includes(value);
}

function filterExercises(profile: Profile | OnboardingDraft) {
  const limitations = profile.limitations ?? [];
  const equipment =
    "equipment" in profile
      ? profile.equipment
      : ["bodyweight", "dumbbells", "gym_machines"];

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
  days: z.array(
    z.object({
      title: z.string(),
      focus: z.string(),
      exercises: z.array(
        z.object({
          exerciseId: z.string(),
          targetMuscle: z.string().describe(
            "The primary muscle group targeted, e.g. 'Quads', 'Chest', 'Lats'",
          ),
          sets: z.number(),
          reps: z.string(),
          restSeconds: z.number(),
        }),
      ),
    }),
  ),
});

type GeneratedPlan = z.infer<typeof workoutPlanSchema>;

type SplitTemplate = {
  title: string;
  focus: string;
  categories: ExerciseCategory[];
};

function getExerciseTargetCount(durationMinutes: number | undefined) {
  const duration = durationMinutes ?? 45;
  if (duration <= 30) return 4;
  if (duration <= 45) return 5;
  return 6;
}

function getSplitTemplates(daysPerWeek: number | undefined): SplitTemplate[] {
  switch (daysPerWeek ?? 3) {
    case 2:
      return [
        {
          title: "Day 1",
          focus: "Full body strength",
          categories: ["squat", "push_horizontal", "pull_horizontal", "hinge", "core"],
        },
        {
          title: "Day 2",
          focus: "Full body balance",
          categories: ["single_leg", "push_horizontal", "pull_vertical", "hinge", "core"],
        },
      ];
    case 4:
      return [
        {
          title: "Day 1",
          focus: "Lower body squat focus",
          categories: ["squat", "single_leg", "hinge", "core"],
        },
        {
          title: "Day 2",
          focus: "Upper body push and pull",
          categories: [
            "push_horizontal",
            "pull_horizontal",
            "pull_vertical",
            "core",
          ],
        },
        {
          title: "Day 3",
          focus: "Lower body hinge focus",
          categories: ["hinge", "squat", "single_leg", "core"],
        },
        {
          title: "Day 4",
          focus: "Upper body balance",
          categories: [
            "push_horizontal",
            "pull_vertical",
            "pull_horizontal",
            "core",
          ],
        },
      ];
    case 5:
      return [
        {
          title: "Day 1",
          focus: "Lower body strength",
          categories: ["squat", "hinge", "single_leg", "core"],
        },
        {
          title: "Day 2",
          focus: "Upper push",
          categories: ["push_horizontal", "push_vertical", "pull_horizontal", "core"],
        },
        {
          title: "Day 3",
          focus: "Upper pull",
          categories: ["pull_vertical", "pull_horizontal", "push_horizontal", "core"],
        },
        {
          title: "Day 4",
          focus: "Lower body balance",
          categories: ["hinge", "squat", "single_leg", "core"],
        },
        {
          title: "Day 5",
          focus: "Full body accessories",
          categories: ["squat", "push_horizontal", "pull_vertical", "core"],
        },
      ];
    case 3:
    default:
      return [
        {
          title: "Day 1",
          focus: "Lower body and core",
          categories: ["squat", "hinge", "single_leg", "core"],
        },
        {
          title: "Day 2",
          focus: "Upper body push and pull",
          categories: [
            "push_horizontal",
            "pull_horizontal",
            "pull_vertical",
            "core",
          ],
        },
        {
          title: "Day 3",
          focus: "Full body strength",
          categories: ["squat", "hinge", "push_horizontal", "pull_vertical", "core"],
        },
      ];
  }
}

function clampSets(goal: Profile["workoutGoal"], value: number) {
  const fallback = goal === "strength" ? 4 : 3;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(2, Math.min(5, Math.round(value)));
}

function clampRest(goal: Profile["workoutGoal"], value: number, category: ExerciseCategory) {
  const fallback =
    goal === "strength" || category === "squat" || category === "hinge" ? 120 : 75;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(45, Math.min(180, Math.round(value)));
}

function normalizeReps(goal: Profile["workoutGoal"], value: string, category: ExerciseCategory) {
  const trimmed = value.trim();
  if (trimmed.length > 0 && trimmed.length <= 20) return trimmed;

  if (goal === "strength") {
    return category === "core" ? "8-12" : "4-8";
  }

  return category === "core" ? "10-15" : "8-12";
}

function isWorkoutExercise(
  exercise: WorkoutExercise | null,
): exercise is WorkoutExercise {
  return exercise !== null;
}

function pickPreferredExercise(
  availableExercises: Exercise[],
  category: ExerciseCategory,
  dayExerciseIds: Set<string>,
  weekUsage: Map<string, number>,
) {
  const candidates = availableExercises
    .filter((exercise) => exercise.category === category)
    .filter((exercise) => !dayExerciseIds.has(exercise.id))
    .sort((a, b) => {
      const aUsage = weekUsage.get(a.id) ?? 0;
      const bUsage = weekUsage.get(b.id) ?? 0;
      if (aUsage !== bUsage) return aUsage - bUsage;
      return a.name.localeCompare(b.name);
    });

  return candidates[0] ?? null;
}

function buildFallbackExercises(
  template: SplitTemplate,
  availableExercises: Exercise[],
  exerciseCount: number,
  goal: Profile["workoutGoal"],
  weekUsage: Map<string, number>,
) {
  const dayExerciseIds = new Set<string>();
  const fallback: GeneratedPlan["days"][number]["exercises"] = [];

  for (const category of template.categories) {
    const exercise = pickPreferredExercise(
      availableExercises,
      category,
      dayExerciseIds,
      weekUsage,
    );

    if (!exercise) continue;

    dayExerciseIds.add(exercise.id);
    weekUsage.set(exercise.id, (weekUsage.get(exercise.id) ?? 0) + 1);
    fallback.push({
      exerciseId: exercise.id,
      targetMuscle:
        category === "squat"
          ? "Quads"
          : category === "hinge"
            ? "Glutes and hamstrings"
            : category === "push_horizontal"
              ? "Chest and triceps"
              : category === "push_vertical"
                ? "Shoulders"
                : category === "pull_horizontal"
                  ? "Upper back"
                  : category === "pull_vertical"
                    ? "Lats"
                    : category === "single_leg"
                      ? "Quads and glutes"
                      : "Core",
      sets: clampSets(goal, goal === "strength" ? 4 : 3),
      reps: normalizeReps(goal, "", category),
      restSeconds: clampRest(goal, 0, category),
    });

    if (fallback.length >= exerciseCount) break;
  }

  if (fallback.length >= exerciseCount) return fallback;

  for (const exercise of availableExercises) {
    if (dayExerciseIds.has(exercise.id)) continue;
    dayExerciseIds.add(exercise.id);
    weekUsage.set(exercise.id, (weekUsage.get(exercise.id) ?? 0) + 1);
    fallback.push({
      exerciseId: exercise.id,
      targetMuscle: exercise.category === "core" ? "Core" : "Primary movement",
      sets: clampSets(goal, goal === "strength" ? 4 : 3),
      reps: normalizeReps(goal, "", exercise.category),
      restSeconds: clampRest(goal, 0, exercise.category),
    });

    if (fallback.length >= exerciseCount) break;
  }

  return fallback;
}

function repairGeneratedPlan(
  generated: GeneratedPlan,
  profile: Profile,
  availableExercises: Exercise[],
) {
  const availableMap = new Map(
    availableExercises.map((exercise) => [exercise.id, exercise]),
  );
  const templates = getSplitTemplates(profile.workoutDaysPerWeek);
  const exerciseCount = getExerciseTargetCount(profile.workoutDurationMinutes);
  const minExerciseCount = Math.max(3, exerciseCount - 1);
  const weekUsage = new Map<string, number>();
  const planId = crypto.randomUUID();

  const days = templates.map((template, index) => {
    const sourceDay = generated.days[index];
    const dayId = crypto.randomUUID();
    const seenIds = new Set<string>();

    const rawExercises: Array<WorkoutExercise | null> =
      sourceDay?.exercises
        .map((exercise) => {
          const fullExercise = availableMap.get(exercise.exerciseId);
          if (!fullExercise) return null;
          if (seenIds.has(fullExercise.id)) return null;

          seenIds.add(fullExercise.id);
          weekUsage.set(fullExercise.id, (weekUsage.get(fullExercise.id) ?? 0) + 1);

          return {
            id: crypto.randomUUID(),
            exerciseId: fullExercise.id,
            name: `${fullExercise.name} (${exercise.targetMuscle})`,
            category: fullExercise.category,
            sets: clampSets(profile.workoutGoal, exercise.sets),
            reps: normalizeReps(
              profile.workoutGoal,
              exercise.reps,
              fullExercise.category,
            ),
            restSeconds: clampRest(
              profile.workoutGoal,
              exercise.restSeconds,
              fullExercise.category,
            ),
            notes: fullExercise.notes,
          };
        }) ?? [];

    const sanitizedExercises = rawExercises.filter(isWorkoutExercise);

    if (sanitizedExercises.length < minExerciseCount) {
      const fallbackExercises = buildFallbackExercises(
        template,
        availableExercises,
        exerciseCount,
        profile.workoutGoal,
        weekUsage,
      );

      for (const exercise of fallbackExercises) {
        if (seenIds.has(exercise.exerciseId)) continue;
        seenIds.add(exercise.exerciseId);

        const fullExercise = availableMap.get(exercise.exerciseId);
        if (!fullExercise) continue;

        sanitizedExercises.push({
          id: crypto.randomUUID(),
          exerciseId: fullExercise.id,
          name: `${fullExercise.name} (${exercise.targetMuscle})`,
          category: fullExercise.category,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
          notes: fullExercise.notes,
        });

        if (sanitizedExercises.length >= exerciseCount) break;
      }
    }

    return {
      id: dayId,
      planId,
      dayIndex: index + 1,
      title: sourceDay?.title?.trim() || template.title,
      focus: sourceDay?.focus?.trim() || template.focus,
      exercises: sanitizedExercises.slice(0, exerciseCount),
    };
  });

  return {
    id: planId,
    userId: profile.userId,
    profileId: profile.id,
    summary:
      generated.summary.trim() ||
      "This grounded plan balances your available equipment, constraints, and weekly training goals.",
    splitLabel:
      generated.splitLabel.trim() ||
      `${templates.length}-day grounded split`,
    days,
    updatedAt: new Date().toISOString(),
  } satisfies WorkoutPlan;
}

async function getPlanningContext(profile: Profile, availableExercises: Exercise[]) {
  const substitutions = seedSubstitutions
    .map((item) => {
      const source = availableExercises.find(
        (exercise) => exercise.id === item.sourceExerciseId,
      );
      const substitute = availableExercises.find(
        (exercise) => exercise.id === item.substituteExerciseId,
      );

      if (!source || !substitute) return null;

      return {
        sourceExerciseId: source.id,
        substituteExerciseId: substitute.id,
        reason: item.reason,
      };
    })
    .filter((item) => item !== null);

  // Use RAG retrieval when available, fall back to deterministic knowledge
  const knowledge = await retrieveKnowledge(profile, availableExercises, {
    targetPrompt: "planner",
  });

  return {
    available: availableExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      notes: exercise.notes ?? "No extra coaching notes.",
    })),
    knowledge,
    splitTemplates: getSplitTemplates(profile.workoutDaysPerWeek).map((template) => ({
      title: template.title,
      focus: template.focus,
      categories: template.categories,
    })),
    substitutions,
    exerciseCount: getExerciseTargetCount(profile.workoutDurationMinutes),
  };
}

export async function generateWorkoutPlan(profile: Profile): Promise<WorkoutPlan> {
  const availableExercises = filterExercises(profile);
  const planningContext = await getPlanningContext(profile, availableExercises);

  const generated = await generateStructuredData({
    system:
      "You are an expert fitness coach AI. Build a grounded workout plan using only the supplied exercise catalog, planning knowledge, and split templates. Respect limitations, equipment, and weekly schedule. Stable outputs matter more than creativity.",
    prompt: `Create a ${profile.workoutDaysPerWeek} day workout plan for someone with a goal of ${profile.workoutGoal || "general fitness"}.
They have ${profile.workoutDurationMinutes} minutes per session. Their experience level is ${profile.experienceLevel || "not specified"}.
Use about ${planningContext.exerciseCount} exercises per day.

Retrieved planning guidance:
${planningContext.knowledge}

Recommended split templates:
${JSON.stringify(planningContext.splitTemplates, null, 2)}

Available exercises (DO NOT USE ANY EXERCISE ID NOT IN THIS LIST):
${JSON.stringify(planningContext.available, null, 2)}

Valid substitution relationships:
${JSON.stringify(planningContext.substitutions, null, 2)}

Rules:
- Use only exercise IDs from the available exercise list.
- Keep the plan grounded in the retrieved planning guidance.
- Match exercise count and volume to the stated session length.
- Do not repeat the exact same exercise twice in one day.
- Provide a motivating summary in exactly 3 short sentences.
- For every exercise, specify the primary target muscle group.`,
    schema: workoutPlanSchema,
  });

  return repairGeneratedPlan(generated, profile, availableExercises);
}
