# T2AI Design Review

## Product Name

- Working name: `Train Train`
- Short product label: `T2AI`

## Current Goal

Build a full-stack MVP for a personalized fitness web app using:

- `Next.js` App Router
- `TypeScript`
- `Vercel AI SDK`
- `Gemini`

The app should support:

1. chat-style onboarding
2. weekly plan generation
3. workout day pages
4. exercise swap workflow
5. video analysis workflow
6. session logging
7. rule-based plan refresh

## Current Project Direction

We are using:

- workspace: `/Users/jy/playground/t2ai`
- source data: `/Users/jy/playground/data`

Available real data:

- `Hevy` export: workout history, exercises, sets, reps, load, supersets
- `Oura` export: daily readiness, sleep, and activity
- `Apple Health`: currently unavailable, excluded from MVP

## What We Learned From Review

### Real Data

The real data is good enough to support:

- a believable `14-day` coaching window
- a believable `30-day` dashboard / adaptation window

Recommendation:

- use raw CSV files only as ingestion sources
- normalize them into app-friendly objects
- build the app against the normalized layer

### Architecture

Best hackathon architecture:

- one `Next.js` app
- `Route Handlers`
- deterministic planning / swap / refresh logic in code
- `Gemini` for explanation, summary, and chat refinement
- in-memory mocked persistence for app state
- Prisma-ready model shapes if useful, but no real DB required yet

### UI Direction

The existing mockup in `/Users/jy/playground/t2ai` is a good visual starting point:

- clean onboarding panel
- dashboard-card layout
- mobile-aware styling

But it is not a functional MVP yet and should only be reused selectively.

## Recommended Scope Order

### Phase 1

- onboarding
- plan generation
- dashboard
- workout day page

### Phase 2

- exercise swap chat
- session logging
- plan refresh

### Phase 3

- video analysis workflow

## Why We Should Do Video First Next

You said you want to review the squat-video feature first before more implementation. That makes sense because:

- it is the most novel multimodal feature
- it is the least obvious part of the architecture
- it changes both backend and UI design
- it affects how we use Gemini

## Video Feature Goal

Start with:

- `squat` only for the first reviewed design
- side-view upload only
- short clip from one set
- return:
  - rep count
  - form score
  - confidence score
  - feedback bullets
  - conservative next-set recommendation

Then expose follow-up chat so the user can ask:

- "what should I fix first?"
- "should I lower the weight?"
- "what cue should I use next set?"

## Video Feature: Product Shape

### User Flow

1. User opens workout day page.
2. User uploads side-view squat clip.
3. App creates analysis job.
4. Analysis result appears with:
   - rep count
   - form score
   - confidence
   - top 3 cues
   - next-set recommendation
5. User asks follow-up questions in chat.

### MVP Promise

We should not promise:

- injury diagnosis
- pain diagnosis
- perfect biomechanics
- live real-time coaching

We should promise:

- movement feedback
- conservative form cues
- repeatable feedback on a constrained input

## Video Feature: Technical Approach Options

### Option A: Gemini-only multimodal interpretation

Flow:

- upload video
- send video plus prompt to Gemini
- ask Gemini to summarize form issues and next steps

Pros:

- very hackathon-friendly
- easy to demo
- makes Gemini central

Cons:

- unstable scoring
- weak for deterministic metrics like rep count
- harder to make trustworthy
- harder to control safety and consistency

Verdict:

- not ideal as the only system

### Option B: Deterministic mocked CV + Gemini explanation

Flow:

- upload video
- mocked or rule-based CV service returns structured result
- Gemini explains the result and answers follow-up questions

Pros:

- stable demo
- deterministic outputs
- easier to keep conservative
- still lets Gemini shine in the chat layer

Cons:

- less technically flashy than real CV
- some of the "analysis" is mocked

Verdict:

- best MVP choice right now

### Option C: Lightweight CV features + Gemini explanation

Flow:

- extract simple movement signals from the video
- derive a few metrics
- Gemini turns those metrics into coaching language

Pros:

- stronger than a pure mock
- more grounded than Gemini-only

Cons:

- much more implementation risk
- likely too expensive in hackathon time if built from scratch

Verdict:

- possible stretch goal, not first step

## Recommended Video Architecture

For the first implementation:

1. user uploads video
2. `/api/upload/video`
3. `/api/analysis/create`
4. mocked analysis service returns:
   - `repCount`
   - `formScore`
   - `confidenceScore`
   - `feedbackBullets`
   - `nextSetRecommendation`
5. Gemini reads the structured result and handles follow-up chat

Important rule:

- Gemini should explain results
- Gemini should not be the only source of the scoring logic

## How Gemini Should Be Used

Gemini is a good fit for:

- converting analysis output into clean coaching language
- answering follow-up questions
- reframing cues simply
- tailoring recommendations to the user profile

Gemini should not be trusted alone for:

- exact rep counting
- exact biomechanical scoring
- medical risk statements
- injury prevention claims

## Data Model Additions Needed For Video

We already planned:

- `UploadedVideo`
- `VideoAnalysis`

For the squat-first implementation, the most important fields are:

- `videoId`
- `exerciseType`
- `status`
- `repCount`
- `formScore`
- `confidenceScore`
- `feedbackBullets`
- `nextSetRecommendation`
- `coachSummary`

## Open Product Decisions

These are the main questions we should answer before implementing the video feature fully:

1. Should the first version support only `squat`, or `squat + deadlift` immediately?
2. Do you want the score to feel:
   - simple and product-like
   - or more technical and coach-like?
3. Should the output focus on:
   - the top 1 issue
   - top 3 cues
   - or a full analysis card?
4. Should the user chat after analysis in:
   - the same workout-day page
   - or a dedicated analysis detail view?
5. Do you want to clearly label the analysis as:
   - `mocked for MVP`
   - or keep the copy softer, like `demo analysis`?
6. Do you want Gemini to ingest the raw uploaded video in MVP,
   or only the structured mocked result first?

## Recommendation

Before more implementation:

1. finalize the video-feature product promise
2. choose the squat-only scope
3. choose whether Gemini sees raw video or just structured analysis in MVP
4. confirm the UX location of the follow-up chat

My current recommendation:

- start with `squat only`
- side-view only
- deterministic mocked analysis result
- Gemini for explanation and follow-up
- same-page follow-up chat inside the workout day screen

## Current Repo Status

Current work already committed:

- commit: `f4f8670`
- message: `feat: add T2AI data ingestion and MVP scaffolding`

Checks so far:

- lint: passed
- build: blocked by sandbox / Turbopack environment issue, not yet confirmed as a code failure

Git sync status:

- `git fetch origin` failed because GitHub SSH auth is not available in this environment
- `git rebase origin/main` is blocked until remote auth works
