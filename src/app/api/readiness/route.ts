import { NextResponse } from "next/server";
import { getServerUser, isAuthError } from "@/lib/auth";
import { saveReadinessCheckIn } from "@/lib/db";
import { readinessCheckInSchema } from "@/lib/readiness";

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const body = await request.json();

    const parsed = readinessCheckInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid check-in data.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { timeOfDay, soreness, energy } = parsed.data;

    const checkIn = {
      id: crypto.randomUUID(),
      userId: user.id,
      timeOfDay,
      soreness,
      energy,
      checkedInAt: new Date().toISOString(),
    };

    const result = await saveReadinessCheckIn(checkIn, user);

    return NextResponse.json({ level: result.level, checkIn: result.checkIn });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not process the readiness check-in", error);
    return NextResponse.json(
      { error: "Could not process the readiness check-in." },
      { status: 500 },
    );
  }
}
