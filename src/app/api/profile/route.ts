import { NextResponse } from "next/server";
import {
  buildInitialOnboardingMessage,
  getMissingField,
  parseOnboardingMessage,
} from "@/lib/profile";
import { completeProfile, saveProfileDraft } from "@/lib/db";
import { getServerUser, isAuthError } from "@/lib/auth";
import { OnboardingDraft } from "@/lib/types";

export async function GET() {
  try {
    const assistantMessage = await buildInitialOnboardingMessage();
    return NextResponse.json({ assistantMessage });
  } catch (error) {
    console.error("Failed to create onboarding message", error);

    return NextResponse.json(
      { error: "The AI coach could not create the onboarding message." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const body = (await request.json()) as {
      message: string;
      draft: OnboardingDraft;
    };

    const { assistantMessage, ...nextDraft } = await parseOnboardingMessage(body.message, body.draft);
    const missingField = getMissingField(nextDraft);

    if (missingField) {
      await saveProfileDraft(nextDraft, user);
    } else {
      await completeProfile(nextDraft, user);
    }

    return NextResponse.json({
      draft: nextDraft,
      assistantMessage,
      missingField,
      profileSaved: true,
      planGenerated: !missingField,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to generate onboarding reply", error);

    return NextResponse.json(
      { error: "The AI coach could not generate an onboarding reply." },
      { status: 500 },
    );
  }
}
