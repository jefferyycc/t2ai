import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";

export const maxDuration = 30;

const systemPrompt = `
You are a clinic and hospital reservation assistant for a LINE messaging workflow.

Your job:
- Read casual patient messages and extract reservation details.
- Help gather missing details one step at a time.
- Keep responses short, clear, and suitable for customer support chat.
- When enough details are present, summarize the reservation request for clinic staff.

Important details to collect when possible:
- patient name
- phone number or contact method
- hospital or clinic name
- department or visit type
- preferred date
- preferred time
- reason for visit
- special notes such as doctor preference or whether the booking is for a family member

Rules:
- Do not claim a reservation is confirmed.
- Explain that the request will be sent to the clinic or hospital staff for review and follow-up.
- If details are missing, ask only for the most important next missing detail.
- If the user provides enough information, return:
  1. a short acknowledgement
  2. a compact reservation summary
  3. a note that the request is ready to send to staff
`;

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to your local environment before using chat.",
      { status: 500 },
    );
  }

  const { messages } = await request.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
