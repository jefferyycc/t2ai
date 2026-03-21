import { NextResponse } from "next/server";
import { buildOnboardingReply, getMissingField, parseOnboardingMessage } from "@/lib/profile";
import { completeProfile, saveProfileDraft } from "@/lib/db";
import { OnboardingDraft } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    message: string;
    draft: OnboardingDraft;
  };

  const nextDraft = parseOnboardingMessage(body.message, body.draft);
  const missingField = getMissingField(nextDraft);

  if (missingField) {
    saveProfileDraft(nextDraft);
  } else {
    completeProfile(nextDraft);
  }

  const assistantMessage = await buildOnboardingReply(nextDraft);

  return NextResponse.json({
    draft: nextDraft,
    assistantMessage,
    missingField,
    profileSaved: !missingField,
    planGenerated: !missingField,
  });
}
