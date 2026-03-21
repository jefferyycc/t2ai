export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type DaysPerWeek = 3 | 4;
export type SplitType = "full-body" | "upper-lower";
export type LimitationTag = "shoulder" | "lower-back" | "knee" | "wrist";
export type EquipmentType =
  | "bodyweight"
  | "dumbbells"
  | "barbell"
  | "gym-machines"
  | "resistance-bands"
  | "cable"
  | "bench"
  | "rack";
export type AnalysisExerciseType = "squat" | "deadlift";

export interface HevySetRow {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  exerciseTitle: string;
  supersetId: string | null;
  exerciseNotes: string;
  setIndex: number;
  setType: string;
  weightLbs: number | null;
  reps: number | null;
  durationSeconds: number | null;
  rpe: number | null;
}

export interface OuraDailyReadiness {
  day: string;
  score: number;
  temperatureDeviation: number | null;
  temperatureTrendDeviation: number | null;
  contributors: Record<string, number | null>;
}

export interface OuraDailySleep {
  day: string;
  score: number;
  contributors: Record<string, number | null>;
}

export interface OuraDailyActivity {
  day: string;
  score: number;
  steps: number;
  activeCalories: number;
  targetCalories: number;
  targetMeters: number;
  contributors: Record<string, number | null>;
}

export interface NormalizedExerciseSet {
  setIndex: number;
  reps: number | null;
  weightLbs: number | null;
  rpe: number | null;
}

export interface NormalizedWorkoutExercise {
  exerciseNameRaw: string;
  exerciseNameCanonical: string;
  equipmentGuess: EquipmentType | null;
  supersetId: string | null;
  setCount: number;
  totalReps: number;
  topWeightLbs: number | null;
  averageRpe: number | null;
  sets: NormalizedExerciseSet[];
}

export interface WorkoutHistoryEntry {
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalSets: number;
  estimatedVolumeLbs: number;
  exercises: NormalizedWorkoutExercise[];
}

export interface DailyRecoverySnapshot {
  day: string;
  readinessScore: number | null;
  sleepScore: number | null;
  activityScore: number | null;
  steps: number | null;
  activeCalories: number | null;
  temperatureDeviation: number | null;
  readinessContributors: Record<string, number | null>;
  sleepContributors: Record<string, number | null>;
  activityContributors: Record<string, number | null>;
  wasTrainingDay: boolean;
  workoutSessionIds: string[];
}

export interface RollingSummary {
  last7DayReadinessAvg: number | null;
  last7DaySleepAvg: number | null;
  last14DayTrainingFrequency: number;
  topExercisesLast14Days: string[];
  recentVolumeTrend: "up" | "flat" | "down";
  suggestedPlanBias: string;
}

export interface ImportedDemoData {
  generatedAt: string;
  sourceNotes: string[];
  recent14Days: DailyRecoverySnapshot[];
  recent30Days: DailyRecoverySnapshot[];
  workoutHistory: WorkoutHistoryEntry[];
  rollingSummary: RollingSummary;
  preferredEquipment: EquipmentType[];
  preferredSplit: SplitType;
}
