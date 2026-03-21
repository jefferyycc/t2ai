import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function generateCoachCopy(options: {
  system: string;
  prompt: string;
  fallback: string;
}) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return options.fallback;
  }

  try {
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      system: options.system,
      prompt: options.prompt,
    });

    return result.text.trim() || options.fallback;
  } catch (error) {
    console.error("Gemini request failed", error);
    return options.fallback;
  }
}
