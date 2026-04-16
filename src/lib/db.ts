import { getServerUser, UserContext } from "@/lib/auth";
import { seedExercises, seedSubstitutions } from "@/lib/data/exercises";
import { generateWorkoutPlan } from "@/lib/planner";
import {
  insertPlanUpdate,
  insertTrainingPlan,
  persistProfile,
  readStoredTrainingState,
  updateTrainingPlan,
} from "@/lib/supabase-store";
import {
  AppState,
  OnboardingDraft,
  PlanUpdate,
  Profile,
  WorkoutDay,
} from "@/lib/types";

function createInitialState(user: UserContext): AppState {
  return {
    user,
    profile: {
      id: `${user.id}-profile`,
      userId: user.id,
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
  var __fitloopStates: Map<string, AppState> | undefined;
}

async function resolveUser(user?: UserContext) {
  return user ?? getServerUser();
}

function getMemoryState(user: UserContext) {
  if (!globalThis.__fitloopStates) {
    globalThis.__fitloopStates = new Map<string, AppState>();
  }

  const existing = globalThis.__fitloopStates.get(user.id);
  if (existing) return existing;

  const nextState = createInitialState(user);
  globalThis.__fitloopStates.set(user.id, nextState);
  return nextState;
}

async function hydrateState(user: UserContext) {
  const state = getMemoryState(user);
  const stored = await readStoredTrainingState(user);

  if (stored.profile) {
    state.profile = stored.profile;
  }

  if (stored.currentPlan) {
    state.currentPlan = stored.currentPlan;
  }

  if (stored.profile || stored.currentPlan) {
    state.planUpdates = stored.planUpdates;
  }

  return state;
}

export async function getAppState(user?: UserContext) {
  return hydrateState(await resolveUser(user));
}

export async function saveProfileDraft(draft: OnboardingDraft, user?: UserContext) {
  const state = await getAppState(user);
  state.profile = {
    ...state.profile,
    ...draft,
    limitations: draft.limitations ?? state.profile.limitations,
    onboardingComplete: false,
    updatedAt: new Date().toISOString(),
  };

  await persistProfile(state.profile);

  return state.profile;
}

export async function completeProfile(draft: OnboardingDraft, user?: UserContext) {
  const state = await getAppState(user);
  const profile: Profile = {
    ...state.profile,
    ...draft,
    limitations: draft.limitations ?? [],
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };

  state.profile = profile;
  await persistProfile(profile);

  state.currentPlan = await generateWorkoutPlan(profile);
  await insertTrainingPlan(state.currentPlan);

  return {
    profile: state.profile,
    plan: state.currentPlan,
  };
}

export async function generatePlanFromProfile(user?: UserContext) {
  const state = await getAppState(user);

  if (!state.profile.onboardingComplete) {
    return null;
  }

  state.currentPlan = await generateWorkoutPlan(state.profile);
  await insertTrainingPlan(state.currentPlan);
  return state.currentPlan;
}

export async function getCurrentPlan(user?: UserContext) {
  return (await getAppState(user)).currentPlan;
}

export async function getWorkoutDay(
  dayId: string,
  user?: UserContext,
): Promise<WorkoutDay | null> {
  const plan = (await getAppState(user)).currentPlan;
  if (!plan) return null;

  return plan.days.find((day) => day.id === dayId) ?? null;
}

export async function applyExerciseSwap(
  input: {
    dayId: string;
    workoutExerciseId: string;
    newExerciseId: string;
    reason: string;
    newName?: string;
    sets?: number;
    reps?: string;
  },
  user?: UserContext,
) {
  const resolvedUser = await resolveUser(user);
  const state = await getAppState(resolvedUser);
  const plan = state.currentPlan;
  if (!plan) return null;

  const nextExercise = state.exercises.find(
    (exercise) => exercise.id === input.newExerciseId,
  );
  if (!nextExercise) return null;

  let planUpdate: PlanUpdate | null = null;
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

        planUpdate = update;

        return {
          ...exercise,
          exerciseId: nextExercise.id,
          name: input.newName ?? nextExercise.name,
          category: nextExercise.category,
          sets: input.sets ?? exercise.sets,
          reps: input.reps ?? exercise.reps,
          isUpdated: true,
        };
      }),
    };
  });

  if (!planUpdate) return null;

  state.planUpdates.unshift(planUpdate);
  state.currentPlan = {
    ...plan,
    days: updatedDays,
    updatedAt: new Date().toISOString(),
  };

  await updateTrainingPlan(state.currentPlan);
  await insertPlanUpdate(resolvedUser, planUpdate);

  return getWorkoutDay(input.dayId, resolvedUser);
}

export async function getDashboardSnapshot(user?: UserContext) {
  const state = await getAppState(user);

  return {
    profile: state.profile,
    plan: state.currentPlan,
    updates: state.planUpdates.slice(0, 5),
  };
}
