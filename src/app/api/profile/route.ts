import { NextResponse } from "next/server";

import { saveProfile } from "@/lib/mock-db";
import { ProfileInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProfileInput>;

    if (
      !body.name ||
      !body.goal ||
      !body.daysPerWeek ||
      !body.durationMinutes ||
      !body.experienceLevel
    ) {
      return NextResponse.json(
        { error: "Missing required onboarding fields." },
        { status: 400 },
      );
    }

    const profile = saveProfile({
      name: body.name,
      goal: body.goal,
      daysPerWeek: body.daysPerWeek,
      durationMinutes: body.durationMinutes,
      experienceLevel: body.experienceLevel,
      injuries: body.injuries ?? [],
      equipmentAccess: body.equipmentAccess ?? [],
      workoutPreferences: body.workoutPreferences ?? "",
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to save profile", error);
    return NextResponse.json(
      { error: "Unable to save the profile right now." },
      { status: 500 },
    );
  }
}
