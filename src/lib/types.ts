export type { ReadinessCheckIn, ReadinessLevel, ReadinessResult } from "@/lib/readiness";

export type WorkoutGoal =
  | "fat_loss"
  | "hypertrophy"
  | "strength"
  | "general_fitness";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type Limitation =
  | "knees"
  | "shoulders"
  | "lower_back"
  | "wrists"
  | "none";

export type Equipment =
  | "bodyweight"
  | "dumbbells"
  | "barbell"
  | "gym_machines"
  | "resistance_bands";

export type ExerciseCategory =
  | "squat"
  | "hinge"
  | "push_horizontal"
  | "push_vertical"
  | "pull_horizontal"
  | "pull_vertical"
  | "single_leg"
  | "core";

export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type Profile = {
  id: string;
  userId: string;
  workoutGoal?: WorkoutGoal;
  workoutDaysPerWeek?: number;
  workoutDurationMinutes?: number;
  experienceLevel?: ExperienceLevel;
  limitations: Limitation[];
  equipment: Equipment[];
  onboardingComplete: boolean;
  updatedAt: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment[];
  avoidFor: Limitation[];
  demoSupported: boolean;
  notes?: string;
};

export type ExerciseSubstitution = {
  id: string;
  sourceExerciseId: string;
  substituteExerciseId: string;
  reason: string;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  isUpdated?: boolean;
};

export type WorkoutDay = {
  id: string;
  planId: string;
  dayIndex: number;
  title: string;
  focus: string;
  exercises: WorkoutExercise[];
};

export type WorkoutPlan = {
  id: string;
  userId: string;
  profileId: string;
  summary: string;
  splitLabel: string;
  days: WorkoutDay[];
  updatedAt: string;
};

export type PlanUpdate = {
  id: string;
  planId: string;
  workoutDayId: string;
  workoutExerciseId: string;
  previousExerciseId: string;
  newExerciseId: string;
  reason: string;
  createdAt: string;
};

export type AppState = {
  user: User;
  profile: Profile;
  exercises: Exercise[];
  substitutions: ExerciseSubstitution[];
  currentPlan: WorkoutPlan | null;
  planUpdates: PlanUpdate[];
  latestReadiness: import("@/lib/readiness").ReadinessResult | null;
};

export type OnboardingDraft = Pick<
  Profile,
  | "workoutGoal"
  | "workoutDaysPerWeek"
  | "workoutDurationMinutes"
  | "experienceLevel"
  | "limitations"
>;

export type OnboardingResponse = {
  draft: OnboardingDraft;
  assistantMessage: string;
  missingField:
    | "workoutDaysPerWeek"
    | "workoutDurationMinutes"
    | "limitations"
    | null;
  profileSaved: boolean;
  planGenerated: boolean;
};

export type SwapSuggestion = {
  exerciseId: string;
  name: string;
  reason: string;
};

export type SwapResponse = {
  assistantMessage: string;
  suggestions: SwapSuggestion[];
  updatedDay: WorkoutDay | null;
  applied: boolean;
};
