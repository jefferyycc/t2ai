import { getServerUser, UserContext } from "@/lib/auth";
import { seedExercises, seedSubstitutions } from "@/lib/data/exercises";
import { generateWorkoutPlan } from "@/lib/planner";
import {
  applyPlanUpdate,
  insertTrainingPlan,
  isSupabasePersistenceConfigured,
  persistProfile,
  persistReadinessCheckIn,
  persistSquatRun,
  readLatestReadinessCheckIn,
  readRecentSquatRuns,
  readStoredTrainingState,
  saveCompletedProfileAndPlan,
} from "@/lib/supabase-store";
import {
  AppState,
  OnboardingDraft,
  PlanUpdate,
  Profile,
  SquatRun,
  WorkoutDay,
} from "@/lib/types";
import {
  assessReadiness,
  ReadinessCheckIn,
  ReadinessResult,
} from "@/lib/readiness";

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
    latestReadiness: null,
  };
}

declare global {
  var __fitloopStates: Map<string, AppState> | undefined;
  var __fitloopSquatRuns: Map<string, SquatRun[]> | undefined;
}

// In-memory fallback for squat runs when Supabase is not configured. Keyed
// by user id; capped at 50 entries per user.
function getMemorySquatRuns(userId: string): SquatRun[] {
  if (!globalThis.__fitloopSquatRuns) {
    globalThis.__fitloopSquatRuns = new Map<string, SquatRun[]>();
  }
  if (!globalThis.__fitloopSquatRuns.has(userId)) {
    globalThis.__fitloopSquatRuns.set(userId, []);
  }
  return globalThis.__fitloopSquatRuns.get(userId)!;
}

async function resolveUser(user?: UserContext) {
  return user ?? getServerUser();
}

function getMemoryState(user: UserContext) {
  if (!globalThis.__fitloopStates) {
    globalThis.__fitloopStates = new Map<string, AppState>();
  }

  const existing = globalThis.__fitloopStates.get(user.id);
  if (existing) {
    existing.user = user;
    return existing;
  }

  const nextState = createInitialState(user);
  globalThis.__fitloopStates.set(user.id, nextState);
  return nextState;
}

async function hydrateState(user: UserContext) {
  const state = getMemoryState(user);
  const stored = await readStoredTrainingState(user);

  if (isSupabasePersistenceConfigured(user)) {
    const initialState = createInitialState(user);
    state.profile = stored.profile ?? initialState.profile;
    state.currentPlan = stored.currentPlan;
    state.planUpdates = stored.planUpdates;
    return state;
  }

  if (stored.profile) {
    state.profile = stored.profile;
  }

  if (stored.currentPlan) {
    state.currentPlan = stored.currentPlan;
  }

  return state;
}

export async function getAppState(user?: UserContext) {
  return hydrateState(await resolveUser(user));
}

export async function saveProfileDraft(draft: OnboardingDraft, user?: UserContext) {
  const resolvedUser = await resolveUser(user);
  const state = await getAppState(resolvedUser);
  const nextProfile = {
    ...state.profile,
    ...draft,
    limitations: draft.limitations ?? state.profile.limitations,
    onboardingComplete: false,
    updatedAt: new Date().toISOString(),
  };

  await persistProfile(resolvedUser, nextProfile);
  state.profile = nextProfile;

  return state.profile;
}

export async function completeProfile(draft: OnboardingDraft, user?: UserContext) {
  const resolvedUser = await resolveUser(user);
  const state = await getAppState(resolvedUser);
  const profile: Profile = {
    ...state.profile,
    ...draft,
    limitations: draft.limitations ?? [],
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };

  const recentSquats = await getRecentSquatRuns(resolvedUser, 3).catch(() => []);
  const plan = await generateWorkoutPlan(profile, recentSquats);
  await saveCompletedProfileAndPlan(resolvedUser, profile, plan);

  state.profile = profile;
  state.currentPlan = plan;

  return {
    profile: state.profile,
    plan: state.currentPlan,
  };
}

export async function generatePlanFromProfile(user?: UserContext) {
  const resolvedUser = await resolveUser(user);
  const state = await getAppState(resolvedUser);

  if (!state.profile.onboardingComplete) {
    return null;
  }

  const recentSquats = await getRecentSquatRuns(resolvedUser, 3).catch(() => []);
  const plan = await generateWorkoutPlan(state.profile, recentSquats);
  await insertTrainingPlan(resolvedUser, plan);

  state.currentPlan = plan;
  return plan;
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
        if (nextExercise.category !== exercise.category) return exercise;

        const hasEquipment = nextExercise.equipment.some((item) =>
          state.profile.equipment.includes(item),
        );
        const blockedByLimitation =
          nextExercise.avoidFor.some((item) =>
            state.profile.limitations.includes(item),
          ) ||
          (state.profile.limitations.includes("shoulders") &&
            nextExercise.category === "push_vertical");

        if (!hasEquipment || blockedByLimitation) return exercise;

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

  const nextPlan = {
    ...plan,
    days: updatedDays,
    updatedAt: new Date().toISOString(),
  };

  await applyPlanUpdate(resolvedUser, nextPlan, planUpdate);

  state.currentPlan = nextPlan;
  state.planUpdates.unshift(planUpdate);

  return getWorkoutDay(input.dayId, resolvedUser);
}

export async function saveReadinessCheckIn(
  checkIn: ReadinessCheckIn,
  user?: UserContext,
): Promise<ReadinessResult> {
  const resolvedUser = await resolveUser(user);
  const state = getMemoryState(resolvedUser);
  const level = assessReadiness(checkIn);
  const result: ReadinessResult = { level, checkIn };

  state.latestReadiness = result;

  await persistReadinessCheckIn(resolvedUser, checkIn, level);

  return result;
}

export async function getLatestReadiness(
  user?: UserContext,
): Promise<ReadinessResult | null> {
  const resolvedUser = await resolveUser(user);
  const state = getMemoryState(resolvedUser);

  if (state.latestReadiness) return state.latestReadiness;

  const stored = await readLatestReadinessCheckIn(resolvedUser);
  if (!stored) return null;

  const result: ReadinessResult = { level: stored.level, checkIn: stored.checkIn };
  state.latestReadiness = result;
  return result;
}

// ---------------------------------------------------------------------------
// Squat runs (milestone 4)
// ---------------------------------------------------------------------------

export async function saveSquatRun(
  run: SquatRun,
  user?: UserContext,
): Promise<SquatRun> {
  const resolvedUser = await resolveUser(user);

  // Always cache in memory so demo mode (no Supabase) still has a history.
  const memory = getMemorySquatRuns(resolvedUser.id);
  memory.unshift(run);
  if (memory.length > 50) memory.length = 50;

  if (isSupabasePersistenceConfigured(resolvedUser)) {
    try {
      await persistSquatRun(resolvedUser, run);
    } catch (error) {
      console.error("Failed to persist squat run", error);
      // Memory cache still has it; surface the error to the caller.
      throw error;
    }
  }

  return run;
}

export async function getRecentSquatRuns(
  user?: UserContext,
  limit: number = 5,
): Promise<SquatRun[]> {
  const resolvedUser = await resolveUser(user);

  if (isSupabasePersistenceConfigured(resolvedUser)) {
    try {
      const rows = await readRecentSquatRuns(resolvedUser, limit);
      if (rows.length > 0) return rows;
    } catch (error) {
      console.error("Failed to read squat runs from Supabase, falling back to memory", error);
    }
  }

  return getMemorySquatRuns(resolvedUser.id).slice(0, limit);
}

export async function getDashboardSnapshot(user?: UserContext) {
  const resolvedUser = await resolveUser(user);
  const state = await getAppState(resolvedUser);
  const latestReadiness = await getLatestReadiness(resolvedUser);

  return {
    profile: state.profile,
    plan: state.currentPlan,
    updates: state.planUpdates.slice(0, 5),
    latestReadiness,
  };
}
