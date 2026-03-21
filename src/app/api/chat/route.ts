import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";

import { getDashboardSnapshot } from "@/lib/mock-db";

export const maxDuration = 30;

const systemPrompt = `
You are T2AI, a personalized training copilot.

Your role:
- help users refine a workout plan
- explain substitutions and training tradeoffs
- summarize mocked video-analysis feedback
- stay practical and concise

Rules:
- do not provide medical advice, diagnosis, or treatment
- do not prescribe nutrition plans
- if a user asks about symptoms, injury diagnosis, or medical treatment, refuse briefly and recommend a qualified professional
- keep exercise modifications valid and conservative
- if data is missing, say so clearly instead of inventing it
`;

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to your environment to use chat.",
      { status: 500 },
    );
  }

  const { messages } = await request.json();
  const snapshot = getDashboardSnapshot();

  const contextBlock = `Active context:
- recent 14-day readiness avg: ${snapshot.importedDemoData.rollingSummary.last7DayReadinessAvg ?? "n/a"}
- recent 14-day sleep avg: ${snapshot.importedDemoData.rollingSummary.last7DaySleepAvg ?? "n/a"}
- last 14-day training frequency: ${snapshot.importedDemoData.rollingSummary.last14DayTrainingFrequency}
- top recent exercises: ${snapshot.importedDemoData.rollingSummary.topExercisesLast14Days.join(", ")}
- preferred split inferred from history: ${snapshot.importedDemoData.preferredSplit}
- active goal: ${snapshot.activeProfile?.goal ?? "not set"}
- active limitations: ${snapshot.activeProfile?.limitations.join(", ") || "none"}
- note: Oura + Hevy history are real imports, Apple Health is unavailable, video analysis is mocked.`;

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `${systemPrompt}\n\n${contextBlock}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
