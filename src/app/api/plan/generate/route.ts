import { NextResponse } from "next/server";

import { createPlanForActiveProfile } from "@/lib/mock-db";

export async function POST() {
  try {
    const bundle = await createPlanForActiveProfile();
    return NextResponse.json(bundle);
  } catch (error) {
    console.error("Failed to generate plan", error);
    return NextResponse.json(
      { error: "Create an onboarding profile first." },
      { status: 400 },
    );
  }
}
