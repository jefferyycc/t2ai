import { NextResponse } from "next/server";
import {
  buildInitialOnboardingMessage,
  getMissingField,
  parseOnboardingMessage,
} from "@/lib/profile";
import { completeProfile, saveProfileDraft } from "@/lib/db";
import { getServerUser, isAuthError } from "@/lib/auth";
import { OnboardingDraft } from "@/lib/types";

// Deterministic fallback used when the LLM provider is unreachable. Keeps
// the landing page usable even if Ollama isn't running — the POST handler
// still needs the LLM, but at least the user sees a working welcome screen
// and a clear hint that something is misconfigured.
const FALLBACK_WELCOME_MESSAGE =
  "Hi! I'm your AI strength coach. To get started, tell me how many days per week you can train, how long each session can be, and any injuries or limitations I should plan around. Mentioning your goal (fat loss, hypertrophy, strength, or general fitness) is helpful but optional.";

export async function GET() {
  try {
    const assistantMessage = await buildInitialOnboardingMessage();
    return NextResponse.json({ assistantMessage });
  } catch (error) {
    // Don't 500 on the welcome message — a missing model or unreachable Ollama
    // shouldn't render the landing page broken. Return a static greeting and
    // a degraded flag so the UI can surface the underlying issue if it wants.
    console.error("LLM welcome message failed; using fallback", error);
    return NextResponse.json({
      assistantMessage: FALLBACK_WELCOME_MESSAGE,
      degraded: true,
      degradedReason:
        "AI provider is unreachable. Onboarding replies will fail until you start Ollama (with the configured model) or set AI_PROVIDER=fixture.",
    });
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
