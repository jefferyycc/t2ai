import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type CoachingCopyInput = {
  system: string;
  prompt: string;
};

type StructuredDataInput = {
  system: string;
  prompt: string;
};

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return valid JSON");
  }

  return text.slice(start, end + 1);
}

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
}: StructuredDataInput): Promise<T> {
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
    throw new Error("Gemini returned an empty structured response");
  }

  return JSON.parse(extractJsonObject(trimmed)) as T;
}
