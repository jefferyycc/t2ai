import { NextResponse } from "next/server";
import {
  buildInitialOnboardingMessage,
  getMissingField,
  parseOnboardingMessage,
} from "@/lib/profile";
import { completeProfile, saveProfileDraft } from "@/lib/db";
import { OnboardingDraft } from "@/lib/types";

export async function GET() {
  try {
    const assistantMessage = await buildInitialOnboardingMessage();
    return NextResponse.json({ assistantMessage });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gemini could not create the onboarding message.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message: string;
      draft: OnboardingDraft;
    };

    const { assistantMessage, ...nextDraft } = await parseOnboardingMessage(body.message, body.draft);
    const missingField = getMissingField(nextDraft);

    if (missingField) {
      saveProfileDraft(nextDraft);
    } else {
      await completeProfile(nextDraft);
    }

    return NextResponse.json({
      draft: nextDraft,
      assistantMessage,
      missingField,
      profileSaved: !missingField,
      planGenerated: !missingField,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gemini could not generate an onboarding reply.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
