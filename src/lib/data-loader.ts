import fs from "node:fs";
import path from "node:path";

import { canonicalizeExerciseName, inferSplitFromTitles } from "@/lib/exercise-canonicalization";
import { average, parseContributorJson } from "@/lib/data-utils";
import {
  DailyRecoverySnapshot,
  EquipmentType,
  HevySetRow,
  ImportedDemoData,
  OuraDailyActivity,
  OuraDailyReadiness,
  OuraDailySleep,
  WorkoutHistoryEntry,
} from "@/lib/types";

const dataRoot = "/Users/jy/playground/data";

function parseQuotedCsv(content: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function parseSemicolonCsv(content: string) {
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const output: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            index += 1;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (char === ";" && !inQuotes) {
          output.push(current);
          current = "";
          continue;
        }

        current += char;
      }

      output.push(current);
      return output;
    });
}

function mapRows<T>(
  rows: string[][],
  mapper: (record: Record<string, string>) => T,
) {
  const [header, ...rest] = rows;
  return rest.map((row) => {
    const record = Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""]));
    return mapper(record);
  });
}

function loadHevyRows(): HevySetRow[] {
  const filePath = path.join(dataRoot, "hevy_workouts.csv");
  const content = fs.readFileSync(filePath, "utf8");
  const rows = parseQuotedCsv(content);

  return mapRows(rows, (record) => ({
    title: record.title,
    startTime: record.start_time,
    endTime: record.end_time,
    description: record.description,
    exerciseTitle: record.exercise_title,
    supersetId: record.superset_id || null,
    exerciseNotes: record.exercise_notes,
    setIndex: Number(record.set_index || 0),
    setType: record.set_type,
    weightLbs: record.weight_lbs ? Number(record.weight_lbs) : null,
    reps: record.reps ? Number(record.reps) : null,
    durationSeconds: record.duration_seconds ? Number(record.duration_seconds) : null,
    rpe: record.rpe ? Number(record.rpe) : null,
  }));
}

function loadOuraReadiness(): OuraDailyReadiness[] {
  const filePath = path.join(dataRoot, "oura_data", "App Data", "dailyreadiness.csv");
  const rows = parseSemicolonCsv(fs.readFileSync(filePath, "utf8"));
  return mapRows(rows, (record) => ({
    day: record.day,
    score: Number(record.score),
    temperatureDeviation: record.temperature_deviation
      ? Number(record.temperature_deviation)
      : null,
    temperatureTrendDeviation: record.temperature_trend_deviation
      ? Number(record.temperature_trend_deviation)
      : null,
    contributors: parseContributorJson(record.contributors),
  }));
}

function loadOuraSleep(): OuraDailySleep[] {
  const filePath = path.join(dataRoot, "oura_data", "App Data", "dailysleep.csv");
  const rows = parseSemicolonCsv(fs.readFileSync(filePath, "utf8"));
  return mapRows(rows, (record) => ({
    day: record.day,
    score: Number(record.score),
    contributors: parseContributorJson(record.contributors),
  }));
}

function loadOuraActivity(): OuraDailyActivity[] {
  const filePath = path.join(dataRoot, "oura_data", "App Data", "dailyactivity.csv");
  const rows = parseSemicolonCsv(fs.readFileSync(filePath, "utf8"));
  return mapRows(rows, (record) => ({
    day: record.day,
    score: Number(record.score),
    steps: Number(record.steps),
    activeCalories: Number(record.active_calories),
    targetCalories: Number(record.target_calories),
    targetMeters: Number(record.target_meters),
    contributors: parseContributorJson(record.contributors),
  }));
}

function parseHevyDay(value: string) {
  const [day, monthText, yearTime] = value.split(" ");
  const [year] = yearTime.split(",");
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  return `${year}-${monthMap[monthText]}-${day.padStart(2, "0")}`;
}

function normalizeWorkouts(rows: HevySetRow[]): WorkoutHistoryEntry[] {
  const sessions = new Map<string, HevySetRow[]>();

  rows.forEach((row) => {
    const key = `${row.title}|${row.startTime}|${row.endTime}`;
    const items = sessions.get(key) ?? [];
    items.push(row);
    sessions.set(key, items);
  });

  return Array.from(sessions.entries())
    .map(([key, items], index) => {
      const [title, startTime, endTime] = key.split("|");
      const day = parseHevyDay(startTime);
      const exerciseMap = new Map<string, HevySetRow[]>();

      items.forEach((item) => {
        if (!item.exerciseTitle || item.exerciseTitle === "Warm Up") return;
        const current = exerciseMap.get(item.exerciseTitle) ?? [];
        current.push(item);
        exerciseMap.set(item.exerciseTitle, current);
      });

      const exercises = Array.from(exerciseMap.entries()).map(([exerciseName, sets]) => {
        const canonical = canonicalizeExerciseName(exerciseName);
        const reps = sets
          .map((set) => set.reps ?? 0)
          .reduce((sum, value) => sum + value, 0);
        const topWeight = sets.reduce<number | null>(
          (highest, set) =>
            set.weightLbs === null
              ? highest
              : highest === null || set.weightLbs > highest
                ? set.weightLbs
                : highest,
          null,
        );

        return {
          exerciseNameRaw: exerciseName,
          exerciseNameCanonical: canonical.canonical,
          equipmentGuess: canonical.equipment,
          supersetId: sets[0]?.supersetId ?? null,
          setCount: sets.length,
          totalReps: reps,
          topWeightLbs: topWeight,
          averageRpe: average(sets.map((set) => set.rpe)),
          sets: sets.map((set) => ({
            setIndex: set.setIndex,
            reps: set.reps,
            weightLbs: set.weightLbs,
            rpe: set.rpe,
          })),
        };
      });

      const durationMinutes = Math.max(
        1,
        Math.round(
          (new Date(endTime.replace(", ", " ")).getTime() -
            new Date(startTime.replace(", ", " ")).getTime()) /
            60000,
        ),
      );

      return {
        id: `session_${index + 1}`,
        title,
        day,
        startTime,
        endTime,
        durationMinutes,
        totalSets: exercises.reduce((sum, exercise) => sum + exercise.setCount, 0),
        estimatedVolumeLbs: exercises.reduce(
          (sum, exercise) =>
            sum +
            exercise.sets.reduce(
              (setSum, set) => setSum + (set.weightLbs ?? 0) * (set.reps ?? 0),
              0,
            ),
          0,
        ),
        exercises,
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}

function buildDailySnapshots(
  readinessRows: OuraDailyReadiness[],
  sleepRows: OuraDailySleep[],
  activityRows: OuraDailyActivity[],
  workouts: WorkoutHistoryEntry[],
) {
  const sleepMap = new Map(sleepRows.map((row) => [row.day, row]));
  const activityMap = new Map(activityRows.map((row) => [row.day, row]));
  const workoutsByDay = new Map<string, WorkoutHistoryEntry[]>();

  workouts.forEach((workout) => {
    const items = workoutsByDay.get(workout.day) ?? [];
    items.push(workout);
    workoutsByDay.set(workout.day, items);
  });

  return readinessRows.map<DailyRecoverySnapshot>((row) => {
    const sleep = sleepMap.get(row.day);
    const activity = activityMap.get(row.day);
    const dayWorkouts = workoutsByDay.get(row.day) ?? [];

    return {
      day: row.day,
      readinessScore: row.score,
      sleepScore: sleep?.score ?? null,
      activityScore: activity?.score ?? null,
      steps: activity?.steps ?? null,
      activeCalories: activity?.activeCalories ?? null,
      temperatureDeviation: row.temperatureDeviation,
      readinessContributors: row.contributors,
      sleepContributors: sleep?.contributors ?? {},
      activityContributors: activity?.contributors ?? {},
      wasTrainingDay: dayWorkouts.length > 0,
      workoutSessionIds: dayWorkouts.map((item) => item.id),
    };
  });
}

export function loadImportedDemoData(): ImportedDemoData {
  const hevyRows = loadHevyRows();
  const workouts = normalizeWorkouts(hevyRows);
  const readiness = loadOuraReadiness();
  const sleep = loadOuraSleep();
  const activity = loadOuraActivity();
  const dailySnapshots = buildDailySnapshots(readiness, sleep, activity, workouts);
  const recent30Days = dailySnapshots.slice(-30);
  const recent14Days = dailySnapshots.slice(-14);
  const recent14DayWorkouts = workouts.filter((item) =>
    recent14Days.some((snapshot) => snapshot.day === item.day),
  );
  const recent30Workouts = workouts.filter((item) =>
    recent30Days.some((snapshot) => snapshot.day === item.day),
  );

  const topExercises = new Map<string, number>();
  const equipmentCounts = new Map<EquipmentType, number>();
  const titles = recent30Workouts.map((item) => item.title);

  recent14DayWorkouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      topExercises.set(
        exercise.exerciseNameCanonical,
        (topExercises.get(exercise.exerciseNameCanonical) ?? 0) + exercise.setCount,
      );

      if (exercise.equipmentGuess) {
        equipmentCounts.set(
          exercise.equipmentGuess,
          (equipmentCounts.get(exercise.equipmentGuess) ?? 0) + 1,
        );
      }
    });
  });

  const topExerciseNames = Array.from(topExercises.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const preferredEquipment = Array.from(equipmentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([equipment]) => equipment);

  const volumes = recent30Workouts.map((item) => item.estimatedVolumeLbs);
  const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
  const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);

  return {
    generatedAt: new Date().toISOString(),
    sourceNotes: [
      "Real historical Hevy workout exports are used for exercise history.",
      "Real historical Oura exports are used for readiness, sleep, and activity trends.",
      "Apple Health is currently unavailable in this MVP.",
      "Video analysis remains mocked and deterministic.",
    ],
    recent14Days,
    recent30Days,
    workoutHistory: recent30Workouts,
    rollingSummary: {
      last7DayReadinessAvg: average(
        recent14Days.slice(-7).map((item) => item.readinessScore),
      ),
      last7DaySleepAvg: average(recent14Days.slice(-7).map((item) => item.sleepScore)),
      last14DayTrainingFrequency: recent14DayWorkouts.length,
      topExercisesLast14Days: topExerciseNames,
      recentVolumeTrend:
        firstAvg === null || secondAvg === null
          ? "flat"
          : secondAvg > firstAvg + 500
            ? "up"
            : secondAvg < firstAvg - 500
              ? "down"
              : "flat",
      suggestedPlanBias:
        average(recent14Days.map((item) => item.readinessScore)) !== null &&
        (average(recent14Days.map((item) => item.readinessScore)) ?? 0) >= 82
          ? "Keep progression steady with one heavier anchor lift per day."
          : "Keep the plan moderate, use clean movement quality, and avoid stacking too many grinders.",
    },
    preferredEquipment,
    preferredSplit: inferSplitFromTitles(titles),
  };
}
