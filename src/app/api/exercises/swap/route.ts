import { NextResponse } from "next/server";
import { applyExerciseSwap, getAppState, getWorkoutDay } from "@/lib/db";
import { buildSwapReply, getSwapSuggestions } from "@/lib/substitutions";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    dayId: string;
    exerciseId: string;
    acceptSubstituteId?: string;
    message: string;
  };

  const day = getWorkoutDay(body.dayId);
  if (!day) {
    return NextResponse.json({ error: "Workout day not found." }, { status: 404 });
  }

  const exercise = day.exercises.find((item) => item.id === body.exerciseId);
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
  }

  if (body.acceptSubstituteId) {
    const updatedDay = applyExerciseSwap({
      dayId: body.dayId,
      workoutExerciseId: body.exerciseId,
      newExerciseId: body.acceptSubstituteId,
      reason: body.message,
    });

    return NextResponse.json({
      assistantMessage:
        "The workout day has been updated. The substitute is now part of your plan.",
      suggestions: [],
      updatedDay,
      applied: true,
    });
  }

  const suggestions = getSwapSuggestions(getAppState(), exercise.exerciseId);
  const assistantMessage = await buildSwapReply(
    day,
    exercise.name,
    suggestions,
    body.message,
  );

  return NextResponse.json({
    assistantMessage,
    suggestions,
    updatedDay: null,
    applied: false,
  });
}
