import { loadImportedDemoData } from "@/lib/data-loader";
import { createMockAnalysis } from "@/lib/mock-cv";
import { buildPlanRefreshSummary, generateWorkoutPlan } from "@/lib/planner";
import { defaultEquipmentAccess, seedExercises, seedSubstitutions } from "@/lib/seed-data";
import {
  AnalysisCreateInput,
  AppState,
  DashboardSnapshot,
  Profile,
  ProfileInput,
  SessionSaveInput,
  WorkoutExercise,
} from "@/lib/types";
import { createId, deriveLimitations, nowIso } from "@/lib/utils";

declare global {
  var __t2aiStore: AppState | undefined;
}

function createInitialState(): AppState {
  return {
    importedDemoData: loadImportedDemoData(),
    users: [],
    profiles: [],
    exercises: seedExercises,
    substitutions: seedSubstitutions,
    plans: [],
    workoutDays: [],
    workoutExercises: [],
    sessions: [],
    setLogs: [],
    uploads: [],
    analyses: [],
    planUpdates: [],
    activeUserId: null,
    activePlanId: null,
  };
}

function store() {
  globalThis.__t2aiStore ??= createInitialState();
  return globalThis.__t2aiStore;
}

export function getState() {
  return store();
}

export function getActiveUser() {
  const state = store();
  return state.users.find((user) => user.id === state.activeUserId) ?? null;
}

export function getActiveProfile() {
  const state = store();
  return state.profiles.find((profile) => profile.userId === state.activeUserId) ?? null;
}

export function getActivePlanBundle() {
  const state = store();
  const plan = state.plans.find((item) => item.id === state.activePlanId);
  if (!plan) return null;

  const days = state.workoutDays.filter((item) => item.planId === plan.id);
  const exercises = state.workoutExercises.filter((item) =>
    days.some((day) => day.id === item.workoutDayId),
  );

  return { plan, days, exercises };
}

export function saveProfile(input: ProfileInput) {
  const state = store();
  const userId = state.activeUserId ?? createId("user");

  if (!state.activeUserId) {
    state.users.push({
      id: userId,
      name: input.name,
      createdAt: nowIso(),
    });
    state.activeUserId = userId;
  } else {
    const existingUser = state.users.find((user) => user.id === userId);
    if (existingUser) {
      existingUser.name = input.name;
    }
  }

  const existingProfile = state.profiles.find((profile) => profile.userId === userId);
  const profile: Profile = {
    id: existingProfile?.id ?? createId("profile"),
    userId,
    goal: input.goal,
    daysPerWeek: input.daysPerWeek,
    durationMinutes: input.durationMinutes,
    experienceLevel: input.experienceLevel,
    injuries: input.injuries,
    limitations: deriveLimitations(input.injuries),
    equipmentAccess:
      input.equipmentAccess.length > 0
        ? input.equipmentAccess
        : state.importedDemoData.preferredEquipment.length > 0
          ? state.importedDemoData.preferredEquipment
          : defaultEquipmentAccess,
    workoutPreferences: input.workoutPreferences,
    createdAt: existingProfile?.createdAt ?? nowIso(),
  };

  state.profiles = state.profiles.filter((item) => item.userId !== userId);
  state.profiles.push(profile);

  return profile;
}

export async function createPlanForActiveProfile() {
  const state = store();
  const profile = getActiveProfile();
  if (!profile) {
    throw new Error("Profile missing");
  }

  const bundle = await generateWorkoutPlan(profile);

  state.plans = state.plans.filter((item) => item.userId !== profile.userId);
  state.workoutDays = [];
  state.workoutExercises = [];
  state.plans.push(bundle.plan);
  state.workoutDays.push(...bundle.days);
  state.workoutExercises.push(...bundle.exercises);
  state.activePlanId = bundle.plan.id;

  return bundle;
}

export function getWorkoutDay(dayId: string) {
  return store().workoutDays.find((item) => item.id === dayId) ?? null;
}

export function getWorkoutExercise(workoutExerciseId: string) {
  return store().workoutExercises.find((item) => item.id === workoutExerciseId) ?? null;
}

export function replaceWorkoutExercise(updatedExercise: WorkoutExercise) {
  const state = store();
  state.workoutExercises = state.workoutExercises.map((item) =>
    item.id === updatedExercise.id ? updatedExercise : item,
  );
}

export function getExercisesForDay(dayId: string) {
  return store()
    .workoutExercises.filter((item) => item.workoutDayId === dayId)
    .sort((a, b) => a.order - b.order);
}

export function saveUploadedVideo(input: {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}) {
  const activeUser = getActiveUser();
  if (!activeUser) {
    throw new Error("Missing active user");
  }

  const upload = {
    id: createId("video"),
    userId: activeUser.id,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    mimeType: input.mimeType,
    uploadedAt: nowIso(),
  };

  store().uploads.push(upload);
  return upload;
}

export function createAnalysis(input: AnalysisCreateInput) {
  const activeUser = getActiveUser();
  if (!activeUser) {
    throw new Error("Missing active user");
  }

  const analysis = createMockAnalysis({
    ...input,
    userId: activeUser.id,
  });
  store().analyses.push(analysis);
  return analysis;
}

export function getAnalysisById(analysisId: string) {
  return store().analyses.find((item) => item.id === analysisId) ?? null;
}

export function saveWorkoutSession(input: SessionSaveInput) {
  const state = store();
  const activeUser = getActiveUser();
  const activePlan = getActivePlanBundle()?.plan;

  if (!activeUser || !activePlan) {
    throw new Error("Missing active user or plan");
  }

  const sessionId = createId("session");
  state.sessions.push({
    id: sessionId,
    userId: activeUser.id,
    planId: activePlan.id,
    workoutDayId: input.workoutDayId,
    completedAt: nowIso(),
    summary: input.summary,
    overallRpe: input.overallRpe,
  });

  state.setLogs.push(
    ...input.setLogs.map((log) => ({
      id: createId("setlog"),
      sessionId,
      workoutExerciseId: log.workoutExerciseId,
      weightKg: log.weightKg,
      repsCompleted: log.repsCompleted,
      rpe: log.rpe,
    })),
  );

  return state.sessions.find((item) => item.id === sessionId) ?? null;
}

export function refreshCurrentPlan() {
  const state = store();
  const bundle = getActivePlanBundle();

  if (!bundle) {
    throw new Error("No active plan");
  }

  const recentLogs = state.setLogs.slice(-12);
  const recentRpeValues = recentLogs
    .map((item) => item.rpe)
    .filter((value): value is number => typeof value === "number");
  const recentRpe =
    recentRpeValues.length > 0
      ? recentRpeValues.reduce((sum, value) => sum + value, 0) / recentRpeValues.length
      : null;

  const summary = buildPlanRefreshSummary({
    recentRpe,
    trainingFrequency: state.importedDemoData.rollingSummary.last14DayTrainingFrequency,
  });

  const update = {
    id: createId("planupdate"),
    planId: bundle.plan.id,
    createdAt: nowIso(),
    reason: summary.reason,
    summary: summary.summary,
  };

  state.planUpdates.push(update);
  bundle.plan.updatedAt = nowIso();
  return update;
}

export function getDashboardSnapshot(): DashboardSnapshot {
  const state = store();

  return {
    importedDemoData: state.importedDemoData,
    activeUser: getActiveUser(),
    activeProfile: getActiveProfile(),
    planBundle: getActivePlanBundle(),
    recentSessions: state.sessions.slice(-5).reverse(),
    recentAnalyses: state.analyses.slice(-3).reverse(),
    planUpdates: state.planUpdates.slice(-3).reverse(),
  };
}
