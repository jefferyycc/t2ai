import { NextResponse } from "next/server";
import { generatePlanFromProfile } from "@/lib/db";
import { getServerUser, isAuthError } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const plan = await generatePlanFromProfile(user);

    if (!plan) {
      return NextResponse.json(
        { error: "Complete onboarding before generating a plan." },
        { status: 400 },
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not generate a plan", error);
    return NextResponse.json(
      { error: "Could not generate a plan." },
      { status: 500 },
    );
  }
}
