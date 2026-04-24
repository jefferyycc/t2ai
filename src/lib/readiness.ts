import { z } from "zod";

export type TimeOfDay = "morning" | "midday" | "evening" | "night";

export type ReadinessCheckIn = {
  id: string;
  userId: string;
  timeOfDay: TimeOfDay;
  soreness: number;
  energy: number;
  checkedInAt: string;
};

export type ReadinessLevel = "green" | "yellow" | "red";

export type ReadinessResult = {
  level: ReadinessLevel;
  checkIn: ReadinessCheckIn;
};

export function assessReadiness(checkIn: ReadinessCheckIn): ReadinessLevel {
  if (checkIn.soreness >= 8 || checkIn.energy <= 2) return "red";
  if (checkIn.soreness >= 5 || checkIn.energy <= 4) return "yellow";
  return "green";
}

export const readinessCheckInSchema = z.object({
  timeOfDay: z.enum(["morning", "midday", "evening", "night"]),
  soreness: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
});
