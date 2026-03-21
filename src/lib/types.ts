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
export type AnalysisStatus = "queued" | "processing" | "complete" | "failed";
export type AnalysisMethod = "heuristic" | "fallback";

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

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  goal: string;
  daysPerWeek: DaysPerWeek;
  durationMinutes: number;
  experienceLevel: ExperienceLevel;
  injuries: string[];
  limitations: LimitationTag[];
  equipmentAccess: EquipmentType[];
  workoutPreferences: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: EquipmentType[];
  tags: string[];
  difficulty: ExperienceLevel;
  description: string;
}

export interface ExerciseSubstitution {
  id: string;
  fromExerciseId: string;
  toExerciseId: string;
  reason: string;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  splitType: SplitType;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutDay {
  id: string;
  planId: string;
  dayIndex: number;
  label: string;
  focus: string;
  durationMinutes: number;
  notes: string;
}

export interface WorkoutExercise {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  order: number;
  cue: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  planId: string;
  workoutDayId: string;
  completedAt: string;
  summary: string;
  overallRpe?: number;
  analysisId?: string;
  analysisSummary?: string;
  analysisFormScore?: number;
}

export interface SetLog {
  id: string;
  sessionId: string;
  workoutExerciseId: string;
  weightKg: number;
  repsCompleted: number;
  rpe?: number;
}

export interface UploadedVideo {
  id: string;
  userId: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface VideoAnalysis {
  id: string;
  userId: string;
  videoId: string;
  workoutDayId: string;
  exerciseType: AnalysisExerciseType;
  status: AnalysisStatus;
  method: AnalysisMethod;
  repCount: number;
  formScore: number;
  confidenceScore: number;
  feedbackBullets: string[];
  nextSetRecommendation: string;
  coachSummary: string;
  movementSignals: {
    depth: string;
    torsoControl: string;
    kneeTracking: string;
  };
  createdAt: string;
}

export interface PlanUpdate {
  id: string;
  planId: string;
  createdAt: string;
  reason: string;
  summary: string;
}

export interface AppState {
  importedDemoData: ImportedDemoData;
  users: User[];
  profiles: Profile[];
  exercises: Exercise[];
  substitutions: ExerciseSubstitution[];
  plans: WorkoutPlan[];
  workoutDays: WorkoutDay[];
  workoutExercises: WorkoutExercise[];
  sessions: WorkoutSession[];
  setLogs: SetLog[];
  uploads: UploadedVideo[];
  analyses: VideoAnalysis[];
  planUpdates: PlanUpdate[];
  activeUserId: string | null;
  activePlanId: string | null;
}

export interface ProfileInput {
  name: string;
  goal: string;
  daysPerWeek: DaysPerWeek;
  durationMinutes: number;
  experienceLevel: ExperienceLevel;
  injuries: string[];
  equipmentAccess: EquipmentType[];
  workoutPreferences: string;
}

export interface GeneratePlanResult {
  plan: WorkoutPlan;
  days: WorkoutDay[];
  exercises: WorkoutExercise[];
  coachSummary: string;
}

export interface SwapRequest {
  workoutExerciseId: string;
  feedback: string;
}

export interface SwapResponse {
  success: boolean;
  updatedExercise?: WorkoutExercise;
  assistantMessage: string;
}

export interface SessionSaveInput {
  workoutDayId: string;
  summary: string;
  overallRpe?: number;
  analysisId?: string;
  setLogs: Array<{
    workoutExerciseId: string;
    weightKg: number;
    repsCompleted: number;
    rpe?: number;
  }>;
}

export interface AnalysisCreateInput {
  videoId: string;
  workoutDayId: string;
  exerciseType: AnalysisExerciseType;
}

export interface DashboardSnapshot {
  importedDemoData: ImportedDemoData;
  activeUser: User | null;
  activeProfile: Profile | null;
  planBundle:
    | {
        plan: WorkoutPlan;
        days: WorkoutDay[];
        exercises: WorkoutExercise[];
      }
    | null;
  recentSessions: WorkoutSession[];
  recentAnalyses: VideoAnalysis[];
  planUpdates: PlanUpdate[];
}
