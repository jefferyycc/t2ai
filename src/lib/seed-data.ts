import { EquipmentType, Exercise, ExerciseSubstitution, LimitationTag } from "@/lib/types";

export const seedExercises: Exercise[] = [
  {
    id: "exercise_goblet_squat",
    name: "Goblet Squat",
    primaryMuscle: "legs",
    equipment: ["dumbbells"],
    tags: ["squat", "full-body"],
    difficulty: "beginner",
    description: "Keep the torso tall and control the descent.",
  },
  {
    id: "exercise_leg_press",
    name: "Leg Press",
    primaryMuscle: "legs",
    equipment: ["gym-machines"],
    tags: ["squat", "lower-back-friendly"],
    difficulty: "beginner",
    description: "Drive evenly through the mid-foot and avoid bouncing the sled.",
  },
  {
    id: "exercise_machine_chest_press",
    name: "Machine Chest Press",
    primaryMuscle: "chest",
    equipment: ["gym-machines"],
    tags: ["press", "machine"],
    difficulty: "beginner",
    description: "Use a smooth pause on the chest-side position.",
  },
  {
    id: "exercise_dumbbell_bench",
    name: "Dumbbell Bench Press",
    primaryMuscle: "chest",
    equipment: ["dumbbells", "bench"],
    tags: ["press", "horizontal-push"],
    difficulty: "beginner",
    description: "Press with control and keep the shoulder blades set.",
  },
  {
    id: "exercise_barbell_bench",
    name: "Bench Press",
    primaryMuscle: "chest",
    equipment: ["barbell", "bench", "rack"],
    tags: ["press", "horizontal-push", "compound"],
    difficulty: "intermediate",
    description: "Keep the bar path stacked over the wrist and elbow.",
  },
  {
    id: "exercise_lat_pulldown",
    name: "Lat Pulldown",
    primaryMuscle: "back",
    equipment: ["cable", "gym-machines"],
    tags: ["vertical-pull"],
    difficulty: "beginner",
    description: "Lead with the elbows and keep the ribcage quiet.",
  },
  {
    id: "exercise_cable_row",
    name: "Seated Cable Row",
    primaryMuscle: "back",
    equipment: ["cable"],
    tags: ["horizontal-pull", "lower-back-friendly"],
    difficulty: "beginner",
    description: "Finish the row with the shoulder blade, not just the hand.",
  },
  {
    id: "exercise_face_pull",
    name: "Face Pull",
    primaryMuscle: "shoulders",
    equipment: ["cable"],
    tags: ["shoulders", "pull", "shoulder-friendly"],
    difficulty: "beginner",
    description: "Pull toward eye level and finish with external rotation.",
  },
  {
    id: "exercise_rdl",
    name: "Romanian Deadlift",
    primaryMuscle: "glutes",
    equipment: ["barbell"],
    tags: ["hinge", "lower-back-load"],
    difficulty: "intermediate",
    description: "Keep the bar close and stop when the hamstrings say enough.",
  },
  {
    id: "exercise_deadlift",
    name: "Deadlift",
    primaryMuscle: "glutes",
    equipment: ["barbell"],
    tags: ["hinge", "compound", "lower-back-load"],
    difficulty: "advanced",
    description: "Brace hard and keep the bar packed against the body.",
  },
  {
    id: "exercise_hip_thrust",
    name: "Hip Thrust",
    primaryMuscle: "glutes",
    equipment: ["barbell", "bench"],
    tags: ["glutes", "lower-back-friendly"],
    difficulty: "intermediate",
    description: "Finish with a strong glute squeeze, not lumbar extension.",
  },
  {
    id: "exercise_leg_curl",
    name: "Seated Leg Curl",
    primaryMuscle: "legs",
    equipment: ["gym-machines"],
    tags: ["hamstrings", "lower-back-friendly"],
    difficulty: "beginner",
    description: "Keep the tempo even and own the stretch.",
  },
  {
    id: "exercise_lateral_raise",
    name: "Lateral Raise",
    primaryMuscle: "shoulders",
    equipment: ["dumbbells"],
    tags: ["shoulders", "isolation"],
    difficulty: "beginner",
    description: "Stay slightly forward and keep the reps smooth.",
  },
  {
    id: "exercise_landmine_press",
    name: "Landmine Press",
    primaryMuscle: "shoulders",
    equipment: ["barbell"],
    tags: ["press", "shoulder-friendly"],
    difficulty: "beginner",
    description: "Press up and slightly forward with a stacked ribcage.",
  },
  {
    id: "exercise_biceps_curl",
    name: "Biceps Curl",
    primaryMuscle: "arms",
    equipment: ["dumbbells"],
    tags: ["arms", "isolation"],
    difficulty: "beginner",
    description: "Keep the upper arm quiet and control the lowering phase.",
  },
  {
    id: "exercise_plank",
    name: "Plank",
    primaryMuscle: "core",
    equipment: ["bodyweight"],
    tags: ["core", "stability"],
    difficulty: "beginner",
    description: "Brace hard and keep the ribs stacked over the pelvis.",
  },
];

export const seedSubstitutions: ExerciseSubstitution[] = [
  {
    id: "sub_bench_machine",
    fromExerciseId: "exercise_barbell_bench",
    toExerciseId: "exercise_machine_chest_press",
    reason: "This keeps the chest pattern while reducing setup complexity.",
  },
  {
    id: "sub_db_machine",
    fromExerciseId: "exercise_dumbbell_bench",
    toExerciseId: "exercise_machine_chest_press",
    reason: "This is a cleaner option when you want a stable pressing setup.",
  },
  {
    id: "sub_rdl_hip_thrust",
    fromExerciseId: "exercise_rdl",
    toExerciseId: "exercise_hip_thrust",
    reason: "This reduces hinge stress while still training the posterior chain.",
  },
  {
    id: "sub_deadlift_leg_curl",
    fromExerciseId: "exercise_deadlift",
    toExerciseId: "exercise_leg_curl",
    reason: "This is more conservative when lower-back fatigue is a concern.",
  },
  {
    id: "sub_landmine_lateral",
    fromExerciseId: "exercise_landmine_press",
    toExerciseId: "exercise_lateral_raise",
    reason: "This keeps shoulder work in while lowering pressing demand.",
  },
];

export function exerciseMatchesLimitations(
  exercise: Exercise,
  limitations: LimitationTag[],
) {
  if (limitations.includes("shoulder") && exercise.tags.includes("overhead")) {
    return false;
  }

  if (
    limitations.includes("lower-back") &&
    exercise.tags.includes("lower-back-load")
  ) {
    return false;
  }

  if (limitations.includes("wrist") && exercise.tags.includes("barbell-grip")) {
    return false;
  }

  return true;
}

export const defaultEquipmentAccess: EquipmentType[] = [
  "dumbbells",
  "barbell",
  "gym-machines",
  "cable",
  "bench",
  "rack",
];
