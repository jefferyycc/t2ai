import { NextResponse } from "next/server";

import { saveWorkoutSession } from "@/lib/mock-db";
import { SessionSaveInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SessionSaveInput;

    if (!body.workoutDayId || !body.summary || !Array.isArray(body.setLogs)) {
      return NextResponse.json(
        { error: "Workout day, summary, and set logs are required." },
        { status: 400 },
      );
    }

    const session = saveWorkoutSession(body);
    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to save session", error);
    return NextResponse.json(
      { error: "Unable to save the session right now." },
      { status: 500 },
    );
  }
}
