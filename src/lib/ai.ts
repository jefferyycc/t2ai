import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";

type CoachingCopyInput = {
  system: string;
  prompt: string;
};

type StructuredDataInput<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
};

export async function generateCoachingCopy({
  system,
  prompt,
}: CoachingCopyInput) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    system,
    prompt,
  });

  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Gemini returned an empty response");
  }

  return trimmed;
}

export async function generateStructuredData<T>({
  system,
  prompt,
  schema,
}: StructuredDataInput<T>): Promise<T> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    system,
    prompt,
    schema,
  });

  return object;
}
