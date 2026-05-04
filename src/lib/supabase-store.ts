import {
  PlanUpdate,
  Profile,
  SquatAggregateMetrics,
  SquatCue,
  SquatRun,
  SquatScoreTier,
  WorkoutPlan,
} from "@/lib/types";
import { isSupabaseUser, UserContext } from "@/lib/auth";
import { ReadinessCheckIn, ReadinessLevel } from "@/lib/readiness";

type ProfileRow = {
  id: string;
  user_id: string;
  workout_goal: Profile["workoutGoal"] | null;
  workout_days_per_week: number | null;
  workout_duration_minutes: number | null;
  experience_level: Profile["experienceLevel"] | null;
  limitations: Profile["limitations"];
  equipment: Profile["equipment"];
  onboarding_complete: boolean;
  updated_at: string;
};

type PlanRow = {
  id: string;
  user_id: string;
  profile_id: string;
  summary: string;
  split_label: string;
  plan_json: WorkoutPlan;
  updated_at: string;
};

type PlanUpdateRow = {
  id: string;
  user_id: string;
  plan_id: string;
  workout_day_id: string;
  workout_exercise_id: string;
  previous_exercise_id: string;
  new_exercise_id: string;
  reason: string;
  created_at: string;
};

export type StoredTrainingState = {
  profile: Profile | null;
  currentPlan: WorkoutPlan | null;
  planUpdates: PlanUpdate[];
};

export class SupabasePersistenceError extends Error {
  constructor(message = "Supabase persistence is unavailable.") {
    super(message);
    this.name = "SupabasePersistenceError";
  }
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/$/, "") ?? null;
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY ?? null;
}

export function isSupabasePersistenceConfigured(user?: UserContext) {
  return Boolean(
    user &&
      isSupabaseUser(user) &&
      getSupabaseUrl() &&
      getSupabaseAnonKey(),
  );
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    workoutGoal: row.workout_goal ?? undefined,
    workoutDaysPerWeek: row.workout_days_per_week ?? undefined,
    workoutDurationMinutes: row.workout_duration_minutes ?? undefined,
    experienceLevel: row.experience_level ?? undefined,
    limitations: row.limitations,
    equipment: row.equipment,
    onboardingComplete: row.onboarding_complete,
    updatedAt: row.updated_at,
  };
}

function toProfileRow(profile: Profile): ProfileRow {
  return {
    id: profile.id,
    user_id: profile.userId,
    workout_goal: profile.workoutGoal ?? null,
    workout_days_per_week: profile.workoutDaysPerWeek ?? null,
    workout_duration_minutes: profile.workoutDurationMinutes ?? null,
    experience_level: profile.experienceLevel ?? null,
    limitations: profile.limitations,
    equipment: profile.equipment,
    onboarding_complete: profile.onboardingComplete,
    updated_at: profile.updatedAt,
  };
}

function toPlanRow(plan: WorkoutPlan): PlanRow {
  return {
    id: plan.id,
    user_id: plan.userId,
    profile_id: plan.profileId,
    summary: plan.summary,
    split_label: plan.splitLabel,
    plan_json: plan,
    updated_at: plan.updatedAt,
  };
}

function toPlanUpdate(row: PlanUpdateRow): PlanUpdate {
  return {
    id: row.id,
    planId: row.plan_id,
    workoutDayId: row.workout_day_id,
    workoutExerciseId: row.workout_exercise_id,
    previousExerciseId: row.previous_exercise_id,
    newExerciseId: row.new_exercise_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function toPlanUpdateRow(user: UserContext, update: PlanUpdate): PlanUpdateRow {
  return {
    id: update.id,
    user_id: user.id,
    plan_id: update.planId,
    workout_day_id: update.workoutDayId,
    workout_exercise_id: update.workoutExerciseId,
    previous_exercise_id: update.previousExerciseId,
    new_exercise_id: update.newExerciseId,
    reason: update.reason,
    created_at: update.createdAt,
  };
}

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

async function requestSupabase<T>(
  user: UserContext,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !anonKey || !isSupabaseUser(user)) {
    throw new SupabasePersistenceError("Supabase persistence is not configured.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      "Supabase request failed",
      response.status,
      response.statusText,
      body,
    );
    throw new SupabasePersistenceError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function readStoredTrainingState(
  user: UserContext,
): Promise<StoredTrainingState> {
  if (!isSupabasePersistenceConfigured(user)) {
    return { profile: null, currentPlan: null, planUpdates: [] };
  }

  const userId = encodeFilter(user.id);
  const [profileRows, planRows] = await Promise.all([
    requestSupabase<ProfileRow[]>(
      user,
      `profiles?user_id=eq.${userId}&select=*&limit=1`,
    ),
    requestSupabase<PlanRow[]>(
      user,
      `training_plans?user_id=eq.${userId}&select=*&order=updated_at.desc&limit=1`,
    ),
  ]);

  const currentPlan = planRows[0]?.plan_json ?? null;
  const planUpdates = currentPlan
    ? await requestSupabase<PlanUpdateRow[]>(
        user,
        `plan_adjustments?user_id=eq.${userId}&plan_id=eq.${encodeFilter(
          currentPlan.id,
        )}&select=*&order=created_at.desc&limit=20`,
      )
    : [];

  return {
    profile: profileRows[0] ? toProfile(profileRows[0]) : null,
    currentPlan,
    planUpdates: planUpdates.map(toPlanUpdate),
  };
}

export async function persistProfile(user: UserContext, profile: Profile) {
  if (!isSupabasePersistenceConfigured(user)) return;

  await requestSupabase<ProfileRow[]>(user, "profiles?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(toProfileRow(profile)),
  });
}

export async function insertTrainingPlan(user: UserContext, plan: WorkoutPlan) {
  if (!isSupabasePersistenceConfigured(user)) return;

  await requestSupabase<PlanRow[]>(user, "training_plans", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(toPlanRow(plan)),
  });
}

export async function saveCompletedProfileAndPlan(
  user: UserContext,
  profile: Profile,
  plan: WorkoutPlan,
) {
  if (!isSupabasePersistenceConfigured(user)) return;

  await requestSupabase<void>(user, "rpc/save_completed_profile_and_plan", {
    method: "POST",
    body: JSON.stringify({
      profile_payload: toProfileRow(profile),
      plan_payload: toPlanRow(plan),
    }),
  });
}

export async function applyPlanUpdate(
  user: UserContext,
  plan: WorkoutPlan,
  update: PlanUpdate,
) {
  if (!isSupabasePersistenceConfigured(user)) return;

  await requestSupabase<void>(user, "rpc/apply_plan_update", {
    method: "POST",
    body: JSON.stringify({
      plan_payload: toPlanRow(plan),
      update_payload: toPlanUpdateRow(user, update),
    }),
  });
}

type ReadinessCheckInRow = {
  id: string;
  user_id: string;
  time_of_day: ReadinessCheckIn["timeOfDay"];
  soreness: number;
  energy: number;
  readiness_level: ReadinessLevel;
  checked_in_at: string;
};

function toReadinessCheckInRow(
  user: UserContext,
  checkIn: ReadinessCheckIn,
  level: ReadinessLevel,
): ReadinessCheckInRow {
  return {
    id: checkIn.id,
    user_id: user.id,
    time_of_day: checkIn.timeOfDay,
    soreness: checkIn.soreness,
    energy: checkIn.energy,
    readiness_level: level,
    checked_in_at: checkIn.checkedInAt,
  };
}

function toReadinessCheckIn(row: ReadinessCheckInRow): ReadinessCheckIn {
  return {
    id: row.id,
    userId: row.user_id,
    timeOfDay: row.time_of_day,
    soreness: row.soreness,
    energy: row.energy,
    checkedInAt: row.checked_in_at,
  };
}

export async function persistReadinessCheckIn(
  user: UserContext,
  checkIn: ReadinessCheckIn,
  level: ReadinessLevel,
) {
  if (!isSupabasePersistenceConfigured(user)) return;

  await requestSupabase<ReadinessCheckInRow[]>(user, "readiness_checkins", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(toReadinessCheckInRow(user, checkIn, level)),
  });
}

export async function readLatestReadinessCheckIn(
  user: UserContext,
): Promise<{ checkIn: ReadinessCheckIn; level: ReadinessLevel } | null> {
  if (!isSupabasePersistenceConfigured(user)) return null;

  const userId = encodeFilter(user.id);
  const rows = await requestSupabase<ReadinessCheckInRow[]>(
    user,
    `readiness_checkins?user_id=eq.${userId}&select=*&order=checked_in_at.desc&limit=1`,
  );

  if (rows.length === 0) return null;

  return {
    checkIn: toReadinessCheckIn(rows[0]),
    level: rows[0].readiness_level,
  };
}

// ---------------------------------------------------------------------------
// Squat runs (milestone 4)
// ---------------------------------------------------------------------------

type SquatRunRow = {
  id: string;
  user_id: string;
  source: SquatRun["source"];
  rep_count: number;
  score: number;
  tier: SquatScoreTier;
  confidence: number;
  metrics_json: SquatAggregateMetrics;
  cues_json: SquatCue[];
  duration_seconds: number | null;
  created_at: string;
};

function toSquatRun(row: SquatRunRow): SquatRun {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    repCount: row.rep_count,
    score: row.score,
    tier: row.tier,
    confidence: Number(row.confidence),
    metrics: row.metrics_json,
    cues: row.cues_json,
    durationSeconds: Number(row.duration_seconds ?? 0),
    createdAt: row.created_at,
  };
}

function toSquatRunRow(user: UserContext, run: SquatRun): SquatRunRow {
  return {
    id: run.id,
    user_id: user.id,
    source: run.source,
    rep_count: run.repCount,
    score: run.score,
    tier: run.tier,
    confidence: run.confidence,
    metrics_json: run.metrics,
    cues_json: run.cues,
    duration_seconds: run.durationSeconds ?? null,
    created_at: run.createdAt,
  };
}

export async function persistSquatRun(user: UserContext, run: SquatRun) {
  if (!isSupabasePersistenceConfigured(user)) return;

  await requestSupabase<SquatRunRow[]>(user, "squat_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(toSquatRunRow(user, run)),
  });
}

export async function readRecentSquatRuns(
  user: UserContext,
  limit: number = 5,
): Promise<SquatRun[]> {
  if (!isSupabasePersistenceConfigured(user)) return [];

  const userId = encodeFilter(user.id);
  const rows = await requestSupabase<SquatRunRow[]>(
    user,
    `squat_runs?user_id=eq.${userId}&select=*&order=created_at.desc&limit=${limit}`,
  );

  return rows.map(toSquatRun);
}
