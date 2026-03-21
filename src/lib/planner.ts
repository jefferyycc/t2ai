import { seedExercises } from "@/lib/data/exercises";
import {
  Exercise,
  ExerciseCategory,
  Limitation,
  OnboardingDraft,
  Profile,
  WorkoutDay,
  WorkoutExercise,
  WorkoutGoal,
  WorkoutPlan,
} from "@/lib/types";

const categoryPresets: Record<
  string,
  { category: ExerciseCategory; sets: number; reps: string; restSeconds: number }[]
> = {
  full_body_a: [
    { category: "squat", sets: 4, reps: "8-10", restSeconds: 90 },
    { category: "hinge", sets: 3, reps: "8-10", restSeconds: 90 },
    { category: "push_horizontal", sets: 3, reps: "8-12", restSeconds: 75 },
    { category: "pull_horizontal", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "core", sets: 3, reps: "10-12", restSeconds: 45 },
  ],
  full_body_b: [
    { category: "squat", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "push_vertical", sets: 3, reps: "8-10", restSeconds: 75 },
    { category: "pull_vertical", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "single_leg", sets: 3, reps: "8 each side", restSeconds: 60 },
    { category: "core", sets: 3, reps: "30-45 sec", restSeconds: 45 },
  ],
  full_body_c: [
    { category: "hinge", sets: 4, reps: "6-8", restSeconds: 105 },
    { category: "push_horizontal", sets: 3, reps: "8-10", restSeconds: 75 },
    { category: "pull_horizontal", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "single_leg", sets: 3, reps: "10 each side", restSeconds: 60 },
    { category: "core", sets: 3, reps: "12-15", restSeconds: 45 },
  ],
  upper_a: [
    { category: "push_horizontal", sets: 4, reps: "8-10", restSeconds: 75 },
    { category: "pull_horizontal", sets: 4, reps: "10-12", restSeconds: 75 },
    { category: "push_vertical", sets: 3, reps: "8-10", restSeconds: 75 },
    { category: "pull_vertical", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "core", sets: 3, reps: "10-12", restSeconds: 45 },
  ],
  lower_a: [
    { category: "squat", sets: 4, reps: "8-10", restSeconds: 90 },
    { category: "hinge", sets: 4, reps: "8-10", restSeconds: 90 },
    { category: "single_leg", sets: 3, reps: "8 each side", restSeconds: 60 },
    { category: "core", sets: 3, reps: "10-12", restSeconds: 45 },
  ],
  upper_b: [
    { category: "push_horizontal", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "pull_vertical", sets: 4, reps: "8-10", restSeconds: 75 },
    { category: "pull_horizontal", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "push_vertical", sets: 2, reps: "12-15", restSeconds: 60 },
    { category: "core", sets: 3, reps: "30-45 sec", restSeconds: 45 },
  ],
  lower_b: [
    { category: "squat", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "hinge", sets: 3, reps: "10-12", restSeconds: 75 },
    { category: "single_leg", sets: 3, reps: "10 each side", restSeconds: 60 },
    { category: "core", sets: 3, reps: "10-12", restSeconds: 45 },
  ],
};

const splitTemplates: Record<number, { title: string; focus: string; preset: string }[]> = {
  2: [
    { title: "Day 1", focus: "Full body", preset: "full_body_a" },
    { title: "Day 2", focus: "Full body", preset: "full_body_b" },
  ],
  3: [
    { title: "Day 1", focus: "Full body", preset: "full_body_a" },
    { title: "Day 2", focus: "Full body", preset: "full_body_b" },
    { title: "Day 3", focus: "Full body", preset: "full_body_c" },
  ],
  4: [
    { title: "Day 1", focus: "Upper body", preset: "upper_a" },
    { title: "Day 2", focus: "Lower body", preset: "lower_a" },
    { title: "Day 3", focus: "Upper body", preset: "upper_b" },
    { title: "Day 4", focus: "Lower body", preset: "lower_b" },
  ],
  5: [
    { title: "Day 1", focus: "Upper body", preset: "upper_a" },
    { title: "Day 2", focus: "Lower body", preset: "lower_a" },
    { title: "Day 3", focus: "Full body", preset: "full_body_b" },
    { title: "Day 4", focus: "Upper body", preset: "upper_b" },
    { title: "Day 5", focus: "Lower body", preset: "lower_b" },
  ],
  6: [
    { title: "Day 1", focus: "Upper body", preset: "upper_a" },
    { title: "Day 2", focus: "Lower body", preset: "lower_a" },
    { title: "Day 3", focus: "Full body", preset: "full_body_a" },
    { title: "Day 4", focus: "Upper body", preset: "upper_b" },
    { title: "Day 5", focus: "Lower body", preset: "lower_b" },
    { title: "Day 6", focus: "Full body", preset: "full_body_c" },
  ],
};

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

function goalLabel(goal: WorkoutGoal | undefined) {
  switch (goal) {
    case "fat_loss":
      return "fat loss";
    case "hypertrophy":
      return "hypertrophy";
    case "strength":
      return "strength";
    default:
      return "general fitness";
  }
}

function pickExercise(
  category: ExerciseCategory,
  available: Exercise[],
  used: Set<string>,
) {
  const candidates = available.filter((exercise) => exercise.category === category);
  const fresh = candidates.find((exercise) => !used.has(exercise.id));
  const selected = fresh ?? candidates[0];

  if (selected) {
    used.add(selected.id);
  }

  return selected;
}

function makeWorkoutExercise(
  exercise: Exercise,
  prescription: {
    sets: number;
    reps: string;
    restSeconds: number;
  },
): WorkoutExercise {
  return {
    id: crypto.randomUUID(),
    exerciseId: exercise.id,
    name: exercise.name,
    category: exercise.category,
    sets: prescription.sets,
    reps: prescription.reps,
    restSeconds: prescription.restSeconds,
    notes: exercise.notes,
  };
}

export function generateWorkoutPlan(profile: Profile): WorkoutPlan {
  const template = splitTemplates[profile.workoutDaysPerWeek ?? 3] ?? splitTemplates[3];
  const available = filterExercises(profile);
  const used = new Set<string>();

  const days: WorkoutDay[] = template.map((day, index) => {
    const exercises = categoryPresets[day.preset]
      .map((preset) => {
        const exercise = pickExercise(preset.category, available, used);
        return exercise ? makeWorkoutExercise(exercise, preset) : null;
      })
      .filter((item): item is WorkoutExercise => item !== null);

    return {
      id: crypto.randomUUID(),
      planId: "",
      dayIndex: index + 1,
      title: day.title,
      focus: day.focus,
      exercises,
    };
  });

  const planId = crypto.randomUUID();

  return {
    id: planId,
    userId: profile.userId,
    profileId: profile.id,
    summary: `A ${template.length}-day ${goalLabel(profile.workoutGoal)} plan with ${profile.workoutDurationMinutes}-minute sessions and exercise choices adapted to your equipment and limitations.`,
    splitLabel:
      template.length === 3
        ? "Full body split"
        : template.length === 4
          ? "Upper / lower split"
          : "Adaptive split",
    days: days.map((day) => ({ ...day, planId })),
    updatedAt: new Date().toISOString(),
  };
}
