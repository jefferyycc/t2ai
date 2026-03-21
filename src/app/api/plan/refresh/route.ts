import { NextResponse } from "next/server";

import { refreshCurrentPlan } from "@/lib/mock-db";

export async function POST() {
  try {
    const update = refreshCurrentPlan();
    return NextResponse.json({ update });
  } catch (error) {
    console.error("Failed to refresh plan", error);
    return NextResponse.json(
      { error: "Unable to refresh the plan yet." },
      { status: 400 },
    );
  }
}
