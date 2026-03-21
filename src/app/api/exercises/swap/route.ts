import { NextResponse } from "next/server";

import {
  getActiveProfile,
  getWorkoutExercise,
  replaceWorkoutExercise,
} from "@/lib/mock-db";
import { swapWorkoutExercise } from "@/lib/planner";
import { SwapRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SwapRequest;
    const profile = getActiveProfile();
    const currentExercise = getWorkoutExercise(body.workoutExerciseId);

    if (!profile || !currentExercise) {
      return NextResponse.json(
        { error: "Missing active profile or selected exercise." },
        { status: 400 },
      );
    }

    const result = await swapWorkoutExercise({
      profile,
      currentExercise,
      request: body,
    });

    if (result.updatedExercise) {
      replaceWorkoutExercise(result.updatedExercise);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to swap exercise", error);
    return NextResponse.json(
      { error: "Unable to process that swap request right now." },
      { status: 500 },
    );
  }
}
