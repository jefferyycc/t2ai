import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";

type Provider = "ollama" | "fixture" | "gemini";
type AiTask = "text" | "structured";

type CoachingCopyInput = {
  system: string;
  prompt: string;
  task?: AiTask;
};

type StructuredDataInput<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  task?: AiTask;
};

function getProvider(): Provider {
  const provider = process.env.AI_PROVIDER ?? "ollama";

  if (provider === "ollama" || provider === "fixture" || provider === "gemini") {
    return provider;
  }

  throw new Error(
    `Unsupported AI_PROVIDER "${provider}". Use "ollama", "fixture", or "gemini".`,
  );
}

function getEnvInt(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPrivateIPv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isAllowedLocalHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    isPrivateIPv4(normalized)
  );
}

function getOllamaBaseUrl() {
  const rawBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  let url: URL;

  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error(`Invalid OLLAMA_BASE_URL "${rawBaseUrl}".`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OLLAMA_BASE_URL must use http or https.");
  }

  const allowPublic = process.env.OLLAMA_ALLOW_PUBLIC_URL === "true";
  if (!allowPublic && !isAllowedLocalHost(url.hostname)) {
    throw new Error(
      "Refusing to use a public OLLAMA_BASE_URL. Use localhost, private LAN, .local, Tailscale, or set OLLAMA_ALLOW_PUBLIC_URL=true only behind auth.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

function getModel(task: AiTask): LanguageModel {
  const provider = getProvider();

  switch (provider) {
    case "ollama": {
      const ollama = createOpenAI({
        baseURL: getOllamaBaseUrl(),
        apiKey: process.env.OLLAMA_API_KEY ?? "ollama",
      });
      const modelId =
        task === "structured"
          ? process.env.OLLAMA_STRUCTURED_MODEL ??
            process.env.OLLAMA_MODEL ??
            "gemma3:4b"
          : process.env.OLLAMA_TEXT_MODEL ??
            process.env.OLLAMA_MODEL ??
            "llama3.2";
      return ollama(modelId);
    }
    case "gemini": {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("AI_PROVIDER=gemini requires GOOGLE_GENERATIVE_AI_API_KEY.");
      }

      return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
    }
    case "fixture": {
      throw new Error("Fixture mode is handled before model selection.");
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`AI request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function getFixtureCoachingCopy(prompt: string) {
  if (prompt.toLowerCase().includes("substitution")) {
    return "I found a safer substitute based on your equipment and plan constraints.";
  }

  return "Tell me how many days you can train, how long each session is, and any injuries or limitations to avoid.";
}

function extractUserMessage(prompt: string) {
  return prompt.split("Latest user message:").at(1)?.trim() ?? prompt;
}

function getFixtureOnboarding(prompt: string) {
  const message = extractUserMessage(prompt).toLowerCase();
  const dayMatch = message.match(/(\d+)\s*(day|days)/);
  const durationMatch = message.match(/(\d+)\s*(minute|min)/);

  const limitations: string[] = [];
  if (message.includes("knee")) limitations.push("knees");
  if (message.includes("shoulder")) limitations.push("shoulders");
  if (message.includes("back")) limitations.push("lower_back");
  if (message.includes("wrist")) limitations.push("wrists");
  if (limitations.length === 0 && /no (injuries|limitations|pain)/.test(message)) {
    limitations.push("none");
  }

  return {
    workoutGoal: message.includes("strength")
      ? "strength"
      : message.includes("hypertrophy") || message.includes("muscle")
        ? "hypertrophy"
        : message.includes("fat")
          ? "fat_loss"
          : "general_fitness",
    workoutDaysPerWeek: dayMatch
      ? Number.parseInt(dayMatch[1], 10)
      : null,
    workoutDurationMinutes: durationMatch
      ? Number.parseInt(durationMatch[1], 10)
      : null,
    experienceLevel: message.includes("advanced")
      ? "advanced"
      : message.includes("beginner")
        ? "beginner"
        : message.includes("intermediate")
          ? "intermediate"
          : null,
    limitations: limitations.length > 0 ? limitations : null,
    coachReply: "Got it. I saved what you shared and will use it to build your plan.",
  };
}

function parseAvailableExerciseIds(prompt: string) {
  return [...prompt.matchAll(/"id":\s*"([^"]+)"/g)].map((match) => match[1]);
}

function getFixtureWorkoutPlan(prompt: string) {
  const dayCount = Number.parseInt(prompt.match(/Create a\s+(\d+)/)?.[1] ?? "3", 10);
  const exerciseIds = parseAvailableExerciseIds(prompt);
  const fallbackIds = ["goblet-squat", "push-up", "chest-supported-row", "hip-thrust", "plank"];
  const ids = exerciseIds.length > 0 ? exerciseIds : fallbackIds;

  return {
    summary:
      "This fixture plan keeps training simple while local AI is offline. It balances lower body, upper body, and core work. Use Ollama or Gemini for richer coaching language.",
    splitLabel: `${dayCount}-day balanced split`,
    days: Array.from({ length: dayCount }, (_, index) => ({
      title: `Day ${index + 1}`,
      focus: index % 2 === 0 ? "Strength fundamentals" : "Volume and technique",
      exercises: ids.slice(0, 4).map((exerciseId) => ({
        exerciseId,
        targetMuscle: "Full body",
        sets: 3,
        reps: "8-10",
        restSeconds: 90,
      })),
    })),
  };
}

function getFixtureAdjustment() {
  return {
    assistantMessage:
      "Fixture mode did not change the plan. Start Ollama for real adjustment suggestions.",
    hasAdjustment: false,
    dayId: null,
    workoutExerciseId: null,
    newExerciseId: null,
    targetMuscle: null,
    sets: null,
    reps: null,
  };
}

function getFixtureStructuredData<T>({
  prompt,
  schema,
}: StructuredDataInput<T>): T {
  const candidate = prompt.includes("Latest user message:")
    ? getFixtureOnboarding(prompt)
    : prompt.includes("Current Plan:")
      ? getFixtureAdjustment()
      : getFixtureWorkoutPlan(prompt);

  return schema.parse(candidate);
}

export async function generateCoachingCopy({
  prompt,
  system,
  task = "text",
}: CoachingCopyInput) {
  if (getProvider() === "fixture") {
    return getFixtureCoachingCopy(prompt);
  }

  const timeoutMs = getEnvInt("OLLAMA_TIMEOUT_MS", 30000);
  const { text } = await withTimeout(
    generateText({
      model: getModel(task),
      system,
      prompt,
    }),
    timeoutMs,
  );

  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("LLM returned an empty response");
  }

  return trimmed;
}

export async function generateStructuredData<T>({
  system,
  prompt,
  schema,
  task = "structured",
}: StructuredDataInput<T>): Promise<T> {
  if (getProvider() === "fixture") {
    return getFixtureStructuredData({ system, prompt, schema, task });
  }

  const timeoutMs = getEnvInt("OLLAMA_TIMEOUT_MS", 30000);
  const { object } = await withTimeout(
    generateObject({
      model: getModel(task),
      system,
      prompt,
      schema,
    }),
    timeoutMs,
  );

  return object;
}
