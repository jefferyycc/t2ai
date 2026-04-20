import { NextResponse } from "next/server";
import { applyExerciseSwap, getAppState, getWorkoutDay } from "@/lib/db";
import { getServerUser, isAuthError } from "@/lib/auth";
import { buildSwapReply, getSwapSuggestions } from "@/lib/substitutions";

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const body = (await request.json()) as {
      dayId: string;
      exerciseId: string;
      acceptSubstituteId?: string;
      message: string;
    };

    const day = await getWorkoutDay(body.dayId, user);
    if (!day) {
      return NextResponse.json({ error: "Workout day not found." }, { status: 404 });
    }

    const exercise = day.exercises.find((item) => item.id === body.exerciseId);
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
    }

    if (body.acceptSubstituteId) {
      const updatedDay = await applyExerciseSwap(
        {
          dayId: body.dayId,
          workoutExerciseId: body.exerciseId,
          newExerciseId: body.acceptSubstituteId,
          reason: body.message,
        },
        user,
      );

      if (!updatedDay) {
        return NextResponse.json(
          {
            assistantMessage:
              "I could not apply that substitute because it does not match your saved plan constraints.",
            suggestions: [],
            updatedDay: null,
            applied: false,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        assistantMessage:
          "The workout day has been updated. The substitute is now part of your plan.",
        suggestions: [],
        updatedDay,
        applied: true,
      });
    }

    const suggestions = getSwapSuggestions(
      await getAppState(user),
      exercise.exerciseId,
    );
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
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not process the swap", error);
    return NextResponse.json(
      { error: "Could not process the swap." },
      { status: 500 },
    );
  }
}
