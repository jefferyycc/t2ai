import { PlanUpdate, Profile, WorkoutPlan } from "@/lib/types";
import { UserContext } from "@/lib/auth";

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

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/$/, "") ?? null;
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function isSupabasePersistenceConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServerKey());
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
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const serverKey = getSupabaseServerKey();

  if (!supabaseUrl || !serverKey) {
    throw new Error("Supabase persistence is not configured.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serverKey,
      Authorization: `Bearer ${serverKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase request failed (${response.status} ${response.statusText}): ${body}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function readStoredTrainingState(
  user: UserContext,
): Promise<StoredTrainingState> {
  if (!isSupabasePersistenceConfigured()) {
    return { profile: null, currentPlan: null, planUpdates: [] };
  }

  const userId = encodeFilter(user.id);
  const [profileRows, planRows] = await Promise.all([
    requestSupabase<ProfileRow[]>(
      `profiles?user_id=eq.${userId}&select=*&limit=1`,
    ),
    requestSupabase<PlanRow[]>(
      `training_plans?user_id=eq.${userId}&select=*&order=updated_at.desc&limit=1`,
    ),
  ]);

  const currentPlan = planRows[0]?.plan_json ?? null;
  const planUpdates = currentPlan
    ? await requestSupabase<PlanUpdateRow[]>(
        `plan_adjustments?plan_id=eq.${encodeFilter(
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

export async function persistProfile(profile: Profile) {
  if (!isSupabasePersistenceConfigured()) return;

  await requestSupabase<ProfileRow[]>("profiles?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(toProfileRow(profile)),
  });
}

export async function insertTrainingPlan(plan: WorkoutPlan) {
  if (!isSupabasePersistenceConfigured()) return;

  await requestSupabase<PlanRow[]>("training_plans", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(toPlanRow(plan)),
  });
}

export async function updateTrainingPlan(plan: WorkoutPlan) {
  if (!isSupabasePersistenceConfigured()) return;

  await requestSupabase<PlanRow[]>(
    `training_plans?id=eq.${encodeFilter(plan.id)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(toPlanRow(plan)),
    },
  );
}

export async function insertPlanUpdate(user: UserContext, update: PlanUpdate) {
  if (!isSupabasePersistenceConfigured()) return;

  await requestSupabase<PlanUpdateRow[]>("plan_adjustments", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(toPlanUpdateRow(user, update)),
  });
}
