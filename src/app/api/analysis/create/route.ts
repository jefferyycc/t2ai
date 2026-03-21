import { NextResponse } from "next/server";

import { createAnalysis } from "@/lib/mock-db";
import { AnalysisCreateInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnalysisCreateInput>;

    if (!body.videoId || !body.workoutDayId || !body.exerciseType) {
      return NextResponse.json(
        { error: "videoId, workoutDayId, and exerciseType are required." },
        { status: 400 },
      );
    }

    if (!["squat", "deadlift"].includes(body.exerciseType)) {
      return NextResponse.json(
        { error: "Only squat and deadlift are supported in MVP." },
        { status: 400 },
      );
    }

    const analysis = createAnalysis({
      videoId: body.videoId,
      workoutDayId: body.workoutDayId,
      exerciseType: body.exerciseType,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Failed to create analysis", error);
    return NextResponse.json(
      { error: "Unable to start the analysis job." },
      { status: 500 },
    );
  }
}
