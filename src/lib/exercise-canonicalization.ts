import { EquipmentType, SplitType } from "@/lib/types";

const canonicalNames: Array<{
  match: RegExp;
  canonical: string;
  equipment: EquipmentType | null;
}> = [
  { match: /bench press \(dumbbell\)|incline bench press \(dumbbell\)/i, canonical: "Dumbbell Bench Press", equipment: "dumbbells" },
  { match: /bench press \(smith machine\)|bench press \(barbell\)/i, canonical: "Bench Press", equipment: "barbell" },
  { match: /incline chest press \(machine\)|machine chest press/i, canonical: "Machine Chest Press", equipment: "gym-machines" },
  { match: /lat pulldown/i, canonical: "Lat Pulldown", equipment: "cable" },
  { match: /cable row|seated cable row/i, canonical: "Seated Cable Row", equipment: "cable" },
  { match: /lateral raise/i, canonical: "Lateral Raise", equipment: "dumbbells" },
  { match: /shoulder press/i, canonical: "Shoulder Press", equipment: "dumbbells" },
  { match: /leg press/i, canonical: "Leg Press", equipment: "gym-machines" },
  { match: /seated leg curl/i, canonical: "Seated Leg Curl", equipment: "gym-machines" },
  { match: /squat/i, canonical: "Squat", equipment: "barbell" },
  { match: /romanian deadlift|deadlift/i, canonical: "Romanian Deadlift", equipment: "barbell" },
  { match: /bicep curl|hammer curl/i, canonical: "Biceps Curl", equipment: "dumbbells" },
  { match: /face pull/i, canonical: "Face Pull", equipment: "cable" },
  { match: /hanging knee raise/i, canonical: "Hanging Knee Raise", equipment: "bodyweight" },
  { match: /plank/i, canonical: "Plank", equipment: "bodyweight" },
];

export function canonicalizeExerciseName(name: string) {
  const match = canonicalNames.find((item) => item.match.test(name));
  if (!match) {
    return {
      canonical: name.replace(/\s*\([^)]*\)\s*/g, "").trim(),
      equipment: null,
    };
  }

  return {
    canonical: match.canonical,
    equipment: match.equipment,
  };
}

export function inferSplitFromTitles(titles: string[]): SplitType {
  const joined = titles.join(" ").toLowerCase();
  if (joined.includes("upper") || joined.includes("lower")) {
    return "upper-lower";
  }

  return "full-body";
}
