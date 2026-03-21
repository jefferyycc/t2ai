import { NextResponse } from "next/server";
import { generatePlanFromProfile } from "@/lib/db";

export async function POST() {
  const plan = generatePlanFromProfile();

  if (!plan) {
    return NextResponse.json(
      { error: "Complete onboarding before generating a plan." },
      { status: 400 },
    );
  }

  return NextResponse.json(plan);
}
