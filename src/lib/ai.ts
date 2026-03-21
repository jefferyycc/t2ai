import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type CoachingCopyInput = {
  system: string;
  prompt: string;
  fallback: string;
};

export async function generateCoachingCopy({
  system,
  prompt,
  fallback,
}: CoachingCopyInput) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return fallback;
  }

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system,
      prompt,
    });

    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}
