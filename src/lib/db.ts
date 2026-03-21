import { seedExercises, seedSubstitutions } from "@/lib/data/exercises";
import { generateWorkoutPlan } from "@/lib/planner";
import {
  AppState,
  OnboardingDraft,
  PlanUpdate,
  Profile,
  WorkoutDay,
} from "@/lib/types";

const DEMO_USER_ID = "demo-user";

function createInitialState(): AppState {
  return {
    user: {
      id: DEMO_USER_ID,
      email: "demo@fitloop.app",
      createdAt: new Date().toISOString(),
    },
    profile: {
      id: "demo-profile",
      userId: DEMO_USER_ID,
      limitations: [],
      equipment: ["bodyweight", "dumbbells", "gym_machines"],
      onboardingComplete: false,
      updatedAt: new Date().toISOString(),
    },
    exercises: seedExercises,
    substitutions: seedSubstitutions,
    currentPlan: null,
    planUpdates: [],
  };
}

declare global {
  var __fitloopState: AppState | undefined;
}

function getState() {
  if (!globalThis.__fitloopState) {
    globalThis.__fitloopState = createInitialState();
  }

  return globalThis.__fitloopState;
}

export function getAppState() {
  return getState();
}

export function saveProfileDraft(draft: OnboardingDraft) {
  const state = getState();
  state.profile = {
    ...state.profile,
    ...draft,
    limitations: draft.limitations ?? state.profile.limitations,
    onboardingComplete: false,
    updatedAt: new Date().toISOString(),
  };

  return state.profile;
}

export async function completeProfile(draft: OnboardingDraft) {
  const state = getState();
  const profile: Profile = {
    ...state.profile,
    ...draft,
    limitations: draft.limitations ?? [],
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };

  state.profile = profile;
  state.currentPlan = await generateWorkoutPlan(profile);

  return {
    profile: state.profile,
    plan: state.currentPlan,
  };
}

export async function generatePlanFromProfile() {
  const state = getState();

  if (!state.profile.onboardingComplete) {
    return null;
  }

  state.currentPlan = await generateWorkoutPlan(state.profile);
  return state.currentPlan;
}

export function getCurrentPlan() {
  return getState().currentPlan;
}

export function getWorkoutDay(dayId: string): WorkoutDay | null {
  const plan = getState().currentPlan;
  if (!plan) return null;

  return plan.days.find((day) => day.id === dayId) ?? null;
}

export function applyExerciseSwap(input: {
  dayId: string;
  workoutExerciseId: string;
  newExerciseId: string;
  reason: string;
  newName?: string;
  sets?: number;
  reps?: string;
}) {
  const state = getState();
  const plan = state.currentPlan;
  if (!plan) return null;

  const nextExercise = state.exercises.find(
    (exercise) => exercise.id === input.newExerciseId,
  );
  if (!nextExercise) return null;

  const updatedDays = plan.days.map((day) => {
    if (day.id !== input.dayId) return day;

    return {
      ...day,
      exercises: day.exercises.map((exercise) => {
        if (exercise.id !== input.workoutExerciseId) return exercise;

        const update: PlanUpdate = {
          id: crypto.randomUUID(),
          planId: plan.id,
          workoutDayId: day.id,
          workoutExerciseId: exercise.id,
          previousExerciseId: exercise.exerciseId,
          newExerciseId: nextExercise.id,
          reason: input.reason,
          createdAt: new Date().toISOString(),
        };

        state.planUpdates.unshift(update);

        return {
          ...exercise,
          exerciseId: nextExercise.id,
          name: input.newName ?? nextExercise.name,
          category: nextExercise.category,
          sets: input.sets ?? exercise.sets,
          reps: input.reps ?? exercise.reps,
        };
      }),
    };
  });

  state.currentPlan = {
    ...plan,
    days: updatedDays,
    updatedAt: new Date().toISOString(),
  };

  return getWorkoutDay(input.dayId);
}

export function getDashboardSnapshot() {
  const state = getState();

  return {
    profile: state.profile,
    plan: state.currentPlan,
    updates: state.planUpdates.slice(0, 5),
  };
}
