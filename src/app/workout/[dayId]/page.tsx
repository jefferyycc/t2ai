import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkoutDayClient } from "@/components/workout-day-client";
import { getExercisesForDay, getSessionsForDay, getWorkoutDay } from "@/lib/mock-db";

export default async function WorkoutDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const day = getWorkoutDay(dayId);

  if (!day) {
    notFound();
  }

  const exercises = getExercisesForDay(dayId);
  const sessions = getSessionsForDay(dayId);

  return (
    <>
      <div className="topbar-shell">
        <Link className="secondary-button inline-button" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
      <WorkoutDayClient day={day} initialExercises={exercises} initialSessions={sessions} />
    </>
  );
}
