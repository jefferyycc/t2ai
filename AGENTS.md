<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# T2AI Contributor Guide

## Project Purpose

T2AI, also referred to as **Train Train**, is a hackathon MVP for a personalized
fitness web app built with:

- `Next.js` App Router
- `TypeScript`
- `Vercel AI SDK`
- `Gemini`

The product goal is to help a user:

- onboard through chat
- generate a weekly plan
- modify exercises through chat
- upload a short lift video for mocked form analysis
- log training sessions
- refresh the plan based on recent history

## Product Framing

Use this framing consistently:

- personalized training copilot
- workout planning and adaptation app
- chat-based fitness application
- multimodal training assistant

Avoid framing it as:

- medical assistant
- diagnosis tool
- injury treatment tool
- nutrition coach
- general health advisor

## Safety Boundaries

This app can reference limitations and user preferences, but it must not:

- diagnose injuries or illness
- prescribe treatment
- provide medical advice
- give nutrition coaching
- claim body-composition or metabolic conclusions without the required data

If a prompt drifts into symptoms, illness, diagnosis, or treatment, the app
should refuse gracefully and redirect the user to a qualified professional.

## Core Architecture Rules

Keep the stack simple and hackathon-stable:

- one `Next.js` app
- `Route Handlers` for server endpoints
- `lib/` for business logic and data normalization
- `components/` for reusable UI
- mocked persistence in-memory for MVP
- Prisma-ready types and model shapes are welcome, but do not block shipping

Use deterministic code for:

- split rules
- exercise substitution rules
- limitation filtering
- conservative next-set recommendations
- plan refresh logic
- mocked CV analysis output

Use Gemini for:

- onboarding summaries
- plan explanation
- conversational exercise swap replies
- chat-based refinement
- analysis explanation

Do not rely on Gemini for the core training engine.

## Real Data Guidance

Source data lives at:

- `/Users/jy/playground/data/hevy_workouts.csv`
- `/Users/jy/playground/data/oura_data/App Data/*.csv`

Important rule:

- CSV files are **ingestion sources**, not the runtime app model

Preferred flow:

1. Parse Hevy and Oura exports.
2. Normalize them into app-friendly objects.
3. Build demo windows such as last 14 days and last 30 days.
4. Feed normalized snapshots into the UI and Gemini.

Do not:

- parse raw CSV directly in page components
- send raw CSV blobs to Gemini
- infer unsupported metrics like TDEE, body fat, or injuries

Apple Health is optional for this MVP and can be omitted if unreliable.

## UI Guidance

The current mockup in `t2ai` is a visual starting point only.

Good UI goals:

- mobile-friendly by default
- strong onboarding flow
- dashboard cards that show plan and progress
- clear workout-day detail page
- obvious swap / upload / log actions
- loading, error, and empty states throughout

Do not leave the product as a static landing page.

## Demo Priorities

For the judged demo, prioritize:

- one complete user journey
- grounded data from Hevy + Oura
- stable fallback behavior if Gemini is unavailable
- clear labels showing what is real, inferred, or mocked
- side-view only for video analysis
- squat and deadlift only for the MVP

De-prioritize:

- auth
- database infra
- Apple Health debugging
- real CV pipeline beyond deterministic mocking

## Working Sequence

When building features in this repo, follow this order:

1. Define the normalized data shape.
2. Build or update deterministic business rules.
3. Expose them through route handlers.
4. Add UI around the route.
5. Layer Gemini on top for explanation and chat refinement.
6. Add fallback behavior and polish.

## What Good Contributions Look Like

Strong contributions:

- Hevy / Oura normalization
- exercise canonicalization
- deterministic planning logic
- safer swap logic
- concise Gemini prompts
- reliable upload and mocked analysis flow
- clean mobile UI

Weak contributions:

- raw CSV plumbing in UI code
- vague AI-only logic
- medical or nutrition framing
- fragile external dependencies
- extra infra that does not improve the demo
