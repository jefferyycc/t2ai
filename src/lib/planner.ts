import { generateCoachCopy } from "@/lib/gemini";
import { exerciseMatchesLimitations, seedExercises, seedSubstitutions } from "@/lib/seed-data";
import {
  Exercise,
  GeneratePlanResult,
  Profile,
  SwapRequest,
  SwapResponse,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
} from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

type Template = {
  label: string;
  focus: string;
  notes: string;
  exerciseIds: string[];
};

function findExercise(id: string) {
  const exercise = seedExercises.find((item) => item.id === id);
  if (!exercise) {
    throw new Error(`Unknown exercise ${id}`);
  }
  return exercise;
}

function chooseExercise(ids: string[], profile: Profile) {
  return ids
    .map(findExercise)
    .find(
      (exercise) =>
        exerciseMatchesLimitations(exercise, profile.limitations) &&
        exercise.equipment.every((item) => profile.equipmentAccess.includes(item)),
    );
}

function getTemplates(profile: Profile): Template[] {
  if (profile.daysPerWeek === 3) {
    return [
      {
        label: "Day 1",
        focus: "Full Body Strength",
        notes: "Start with the highest-skill movement while you are freshest.",
        exerciseIds: [
          chooseExercise(["exercise_leg_press", "exercise_goblet_squat"], profile)?.id ??
            "exercise_goblet_squat",
          chooseExercise(
            ["exercise_barbell_bench", "exercise_dumbbell_bench", "exercise_machine_chest_press"],
            profile,
          )?.id ?? "exercise_dumbbell_bench",
          chooseExercise(["exercise_cable_row", "exercise_lat_pulldown"], profile)?.id ??
            "exercise_cable_row",
          chooseExercise(["exercise_hip_thrust", "exercise_leg_curl"], profile)?.id ??
            "exercise_leg_curl",
          "exercise_plank",
        ],
      },
      {
        label: "Day 2",
        focus: "Full Body Hypertrophy",
        notes: "Use tight rest periods and keep the final reps clean.",
        exerciseIds: [
          chooseExercise(["exercise_goblet_squat", "exercise_leg_press"], profile)?.id ??
            "exercise_goblet_squat",
          chooseExercise(["exercise_machine_chest_press", "exercise_dumbbell_bench"], profile)
            ?.id ?? "exercise_machine_chest_press",
          chooseExercise(["exercise_lat_pulldown", "exercise_cable_row"], profile)?.id ??
            "exercise_lat_pulldown",
          chooseExercise(["exercise_lateral_raise", "exercise_landmine_press"], profile)?.id ??
            "exercise_lateral_raise",
          "exercise_biceps_curl",
        ],
      },
      {
        label: "Day 3",
        focus: "Full Body Pull + Push",
        notes: "Keep this day smooth and avoid grinding the hinge pattern.",
        exerciseIds: [
          chooseExercise(["exercise_hip_thrust", "exercise_leg_curl"], profile)?.id ??
            "exercise_hip_thrust",
          chooseExercise(["exercise_dumbbell_bench", "exercise_machine_chest_press"], profile)
            ?.id ?? "exercise_dumbbell_bench",
          chooseExercise(["exercise_cable_row", "exercise_face_pull"], profile)?.id ??
            "exercise_cable_row",
          "exercise_biceps_curl",
          "exercise_plank",
        ],
      },
    ];
  }

  return [
    {
      label: "Day 1",
      focus: "Upper A",
      notes: "Start with a chest anchor lift, then build the session around clean pulling volume.",
      exerciseIds: [
        chooseExercise(["exercise_barbell_bench", "exercise_dumbbell_bench", "exercise_machine_chest_press"], profile)?.id ??
          "exercise_dumbbell_bench",
        chooseExercise(["exercise_cable_row", "exercise_lat_pulldown"], profile)?.id ??
          "exercise_cable_row",
        chooseExercise(["exercise_landmine_press", "exercise_lateral_raise"], profile)?.id ??
          "exercise_landmine_press",
        "exercise_face_pull",
        "exercise_biceps_curl",
      ],
    },
    {
      label: "Day 2",
      focus: "Lower A",
      notes: "Use the squat pattern first and keep the hinge volume conservative.",
      exerciseIds: [
        chooseExercise(["exercise_leg_press", "exercise_goblet_squat"], profile)?.id ??
          "exercise_leg_press",
        chooseExercise(["exercise_hip_thrust", "exercise_leg_curl", "exercise_rdl"], profile)
          ?.id ?? "exercise_hip_thrust",
        "exercise_leg_curl",
        "exercise_plank",
      ],
    },
    {
      label: "Day 3",
      focus: "Upper B",
      notes: "This day is built for straightforward equipment swaps and stable progress tracking.",
      exerciseIds: [
        chooseExercise(["exercise_machine_chest_press", "exercise_dumbbell_bench"], profile)
          ?.id ?? "exercise_machine_chest_press",
        chooseExercise(["exercise_lat_pulldown", "exercise_cable_row"], profile)?.id ??
          "exercise_lat_pulldown",
        chooseExercise(["exercise_lateral_raise", "exercise_face_pull"], profile)?.id ??
          "exercise_lateral_raise",
        "exercise_biceps_curl",
      ],
    },
    {
      label: "Day 4",
      focus: "Lower B",
      notes: "Accumulate quality lower-body work without turning the hinge into a grinder.",
      exerciseIds: [
        chooseExercise(["exercise_goblet_squat", "exercise_leg_press"], profile)?.id ??
          "exercise_goblet_squat",
        chooseExercise(["exercise_leg_curl", "exercise_hip_thrust"], profile)?.id ??
          "exercise_leg_curl",
        "exercise_plank",
      ],
    },
  ];
}

function schemeForExercise(exercise: Exercise) {
  if (exercise.tags.includes("compound")) {
    return { sets: 4, reps: "6-8", restSeconds: 120 };
  }
  if (exercise.primaryMuscle === "core") {
    return { sets: 3, reps: "30-45 sec", restSeconds: 45 };
  }
  if (exercise.tags.includes("machine") || exercise.tags.includes("isolation")) {
    return { sets: 3, reps: "10-15", restSeconds: 60 };
  }
  return { sets: 3, reps: "8-12", restSeconds: 75 };
}

export async function generateWorkoutPlan(profile: Profile): Promise<GeneratePlanResult> {
  const planId = createId("plan");
  const templates = getTemplates(profile);
  const createdAt = nowIso();

  const plan: WorkoutPlan = {
    id: planId,
    userId: profile.userId,
    profileId: profile.id,
    title: profile.daysPerWeek === 3 ? "T2AI Full Body Build" : "T2AI Upper / Lower Build",
    splitType: profile.daysPerWeek === 3 ? "full-body" : "upper-lower",
    summary:
      "A personalized weekly plan built around your schedule, available equipment, and movement limitations.",
    createdAt,
    updatedAt: createdAt,
  };

  const days: WorkoutDay[] = templates.map((template, index) => ({
    id: createId("day"),
    planId,
    dayIndex: index + 1,
    label: template.label,
    focus: template.focus,
    durationMinutes: profile.durationMinutes,
    notes: template.notes,
  }));

  const exercises: WorkoutExercise[] = days.flatMap((day, index) =>
    templates[index].exerciseIds.map((exerciseId, order) => {
      const exercise = findExercise(exerciseId);
      const scheme = schemeForExercise(exercise);
      return {
        id: createId("wex"),
        workoutDayId: day.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: scheme.sets,
        reps: scheme.reps,
        restSeconds: scheme.restSeconds,
        order: order + 1,
        cue: exercise.description,
      };
    }),
  );

  const coachSummary = await generateCoachCopy({
    system:
      "You are a concise strength coach. Keep the tone practical and avoid medical language.",
    prompt: `Write a short weekly-plan summary for this user:
goal: ${profile.goal}
days per week: ${profile.daysPerWeek}
session duration: ${profile.durationMinutes}
experience: ${profile.experienceLevel}
injuries: ${profile.injuries.join(", ") || "none"}
preferences: ${profile.workoutPreferences}

Return 3 short bullets that explain the plan and how it respects limitations.`,
    fallback:
      "This plan keeps the split simple, fits your available time, and avoids movements that clash with the limitations you mentioned.",
  });

  return { plan, days, exercises, coachSummary };
}

export async function swapWorkoutExercise(options: {
  profile: Profile;
  currentExercise: WorkoutExercise;
  request: SwapRequest;
}): Promise<SwapResponse> {
  const mapping = seedSubstitutions.find(
    (item) => item.fromExerciseId === options.currentExercise.exerciseId,
  );

  if (!mapping) {
    return {
      success: false,
      assistantMessage:
        "I do not have a clean swap for that movement yet. Try asking for a machine version, a faster setup, or a lower-back-friendlier option.",
    };
  }

  const replacement = findExercise(mapping.toExerciseId);

  if (!exerciseMatchesLimitations(replacement, options.profile.limitations)) {
    return {
      success: false,
      assistantMessage:
        "That swap conflicts with your limitations, so I kept the current exercise unchanged.",
    };
  }

  const updatedExercise: WorkoutExercise = {
    ...options.currentExercise,
    exerciseId: replacement.id,
    exerciseName: replacement.name,
    cue: replacement.description,
  };

  const assistantMessage = await generateCoachCopy({
    system:
      "You are a training copilot. Keep the reply short, supportive, and grounded in practical training language.",
    prompt: `The user wants to swap ${options.currentExercise.exerciseName}.
User feedback: ${options.request.feedback}
Replacement chosen: ${replacement.name}
Reason: ${mapping.reason}

Write a compact response with:
- why the swap makes sense
- one execution cue
- a short confirmation line`,
    fallback: `${replacement.name} is a better fit here because ${mapping.reason.toLowerCase()} Keep the reps controlled and confirm if you want me to lock this change in.`,
  });

  return {
    success: true,
    updatedExercise,
    assistantMessage,
  };
}

export function buildPlanRefreshSummary(options: {
  recentRpe: number | null;
  trainingFrequency: number;
}) {
  if (options.recentRpe !== null && options.recentRpe >= 8.5) {
    return {
      reason: "Recent sessions looked demanding, so the refreshed plan trims volume slightly.",
      summary:
        "Reduce one working set on the big lifts, keep rest a little longer, and emphasize smooth reps next block.",
    };
  }

  if (options.trainingFrequency >= 5) {
    return {
      reason: "Recent consistency is high, so the refreshed plan can push one main lift a little further.",
      summary:
        "Keep the split unchanged and increase the lead lift rep target by one small step next block.",
    };
  }

  return {
    reason: "Recent training was steady, so the refreshed plan keeps progression conservative.",
    summary:
      "Keep the current split, keep one anchor lift per day, and use cleaner exercise swaps when equipment or fatigue gets in the way.",
  };
}
