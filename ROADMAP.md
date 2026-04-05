# t2ai Product Architecture and Roadmap

This document turns `t2ai` from a hackathon prototype into a concrete AI product plan.

Assumption:
- Available time is roughly `10-20 hours/week`, with occasional heavier weekend pushes.
- Goal is not only to ship a useful MVP, but also to make the project a strong portfolio piece for AI engineer / applied AI / agentic systems roles.

## Product Goal

Build `t2ai` into a phone-first AI fitness coach that can:

- generate personalized workout plans
- adapt plans over time based on history and constraints
- analyze uploaded squat videos with real pose/biomechanics logic
- use retrieval-grounded AI instead of prompt-only responses
- demonstrate production AI engineering patterns: evals, observability, background jobs, structured outputs, and cost-aware model routing

## Product Vision

The strongest version of `t2ai` is not just "chat for workouts."

It is a small but real AI system with four loops:

1. `Profile loop`
   User provides goals, schedule, equipment, and limitations.

2. `Planning loop`
   System generates a grounded plan using exercise knowledge, user history, and constraints.

3. `Analysis loop`
   User uploads a squat video and receives computed form feedback.

4. `Adaptation loop`
   Future plans and swaps incorporate prior performance, movement issues, and adherence.

## Target Architecture

### 1. Client Layer

Primary client:
- `Expo React Native` mobile app

Secondary client:
- existing `Next.js` app as web dashboard, landing page, admin, and debugging surface

Mobile should support:
- onboarding
- plan viewing
- exercise swap requests
- video upload / recording
- squat feedback history
- progress tracking

### 2. Application Backend

Recommended stack:
- `Next.js` for main product APIs and web UI
- `Supabase Auth` for authentication
- `Postgres` for application data
- `Supabase Storage` for video assets
- `Inngest` for async jobs and workflows

Responsibilities:
- user/profile management
- plan persistence
- swap and adjustment endpoints
- job orchestration for video analysis
- history and reporting APIs

### 3. AI / ML Layer

This should be split into three subsystems:

#### A. Planner

Inputs:
- profile
- equipment
- limitations
- goal
- workout history
- prior feedback

Outputs:
- structured workout plan
- exercise rationale
- suggested progressions or regressions

Design:
- retrieval-backed prompts
- structured outputs with validation
- business-rule checks before saving

#### B. Retrieval / Knowledge Layer

Knowledge sources:
- exercise library
- substitution rules
- injury / limitation notes
- equipment compatibility
- coaching cues
- user history

Storage:
- `Postgres + pgvector`

Use cases:
- grounded plan generation
- safer exercise swaps
- personalized explanations
- future coaching summaries

#### C. Squat Analysis Pipeline

Pipeline:
- upload video
- create analysis job
- extract landmarks frame-by-frame
- compute biomechanics metrics
- segment reps
- score movement quality
- generate concise coaching feedback from structured metrics

Initial version:
- uploaded videos only
- side-view squat only
- single person in frame
- one completed analysis per video

### 4. Observability and Evaluation

Recommended tools:
- `Langfuse` for tracing prompts, latency, costs, outputs, and failures
- internal eval scripts/datasets for plan quality and swap quality

Track:
- prompt versions
- retrieved documents
- schema-validation failures
- token usage
- latency
- user-visible failure rate
- pose-analysis confidence

## Recommended Technology Choices

### Product Stack

- `Web`: Next.js
- `Mobile`: Expo React Native
- `Auth/DB/Storage`: Supabase
- `Async workflows`: Inngest
- `Vector search`: pgvector
- `Tracing / AI observability`: Langfuse

### LLM Stack

Suggested default approach:

- `Primary fast model`
  - GPT-5 mini or Gemini 2.5 Flash
- `Hard-case / quality model`
  - stronger frontier model only on selective flows
- `Local development / cheap experiments`
  - Ollama with Qwen or Gemma family models

Suggested model routing:
- onboarding extraction -> cheaper fast model
- plan generation -> fast model with structured output
- difficult re-planning / summary refinement -> stronger model
- local prototyping -> open-source model

### Pose / Vision Stack

Recommended build path:

- `v1`
  - MediaPipe Pose Landmarker for cross-platform extraction
- `v2`
  - Apple Vision / native iOS optimization if you want better iPhone experience
- `v3`
  - custom trained classifier on landmarks and derived features

Do not start with an end-to-end custom ML model.
Start with:
- pose landmarks
- rule-based features
- confidence thresholds
- human-readable scoring

## Data Model

Core tables to add:

- `users`
- `profiles`
- `training_plans`
- `training_days`
- `training_exercises`
- `exercise_catalog`
- `exercise_substitutions`
- `knowledge_chunks`
- `video_uploads`
- `pose_runs`
- `rep_metrics`
- `feedback_reports`
- `plan_adjustments`
- `llm_traces`
- `eval_runs`

Vector-enabled tables:
- `knowledge_chunks`
- optionally `feedback_reports`

## MVP Definition

The first real MVP is complete when:

1. a user can sign in
2. create a profile
3. get a grounded, persisted workout plan
4. upload a squat video from a phone
5. receive real computed squat feedback
6. have future plan recommendations influenced by prior feedback

If one of those is missing, the product is still in prototype mode.

## Execution Strategy For 10-20 Hours/Week

With your time budget, the project should be run as a staged product build over roughly `10-14 weeks`.

Cadence recommendation:
- Weeknights: implementation and debugging
- Weekends: integration, architecture cleanup, demo polish, docs

Keep each milestone independently demoable.

## Milestones

## Milestone 0: Stabilize The Existing Prototype

Goal:
- make the current repo easier to evolve safely

Tasks:
- replace the boilerplate README with a real product README
- add setup instructions and environment variables
- add lint/build/test scripts
- clean duplicate or placeholder routes where appropriate
- document current architecture and limitations

Deliverable:
- a clearer, runnable project with baseline documentation

Estimated effort:
- `1 week`

## Milestone 1: Persistence and Auth

Goal:
- move from demo state to actual product state

Tasks:
- integrate Supabase
- add auth
- replace in-memory global state with Postgres-backed data
- persist profile, plan, and plan updates
- store plan history for later personalization

Deliverable:
- users can return and still have their profile and plan

Estimated effort:
- `1-2 weeks`

## Milestone 2: Retrieval-Grounded Planner

Goal:
- upgrade the planner from prompt-only to AI-system quality

Tasks:
- create exercise catalog schema
- create substitution and limitation rules
- add knowledge chunks for exercise descriptions, safety notes, and coaching cues
- add retrieval layer with pgvector
- generate plan via structured output
- add validation step before persisting

Deliverable:
- planner can justify choices from grounded data and follow constraints more reliably

Estimated effort:
- `1-2 weeks`

## Milestone 3: Evaluation and Observability

Goal:
- make AI quality measurable

Tasks:
- integrate Langfuse or equivalent tracing
- log prompt, response, retrieved context, model, cost, and latency
- build small eval datasets for:
  - onboarding extraction
  - plan quality
  - exercise swaps
- define quality rubrics

Deliverable:
- you can explain how the AI system is monitored and improved over time

Estimated effort:
- `1 week`

## Milestone 4: Mobile App Foundation

Goal:
- create the right user surface for video-first fitness UX

Tasks:
- bootstrap Expo React Native app
- connect auth
- add profile screen
- add plan screen
- add upload/record video flow
- share backend with web app

Deliverable:
- mobile app can onboard a user and display a plan

Estimated effort:
- `1-2 weeks`

## Milestone 5: Real Squat Analysis v1

Goal:
- replace the mock with real analysis

Tasks:
- define accepted video constraints
  - side view
  - single user
  - visible full body
- upload videos to storage
- run background analysis job
- extract landmarks
- compute:
  - rep count
  - squat depth
  - knee tracking proxy
  - heel rise proxy
  - torso lean
  - tempo
- define confidence thresholds
- generate structured report
- convert report to user-facing coaching summary

Deliverable:
- uploaded squat videos produce real feedback with measurable features

Estimated effort:
- `2-3 weeks`

## Milestone 6: Adaptation Loop

Goal:
- make analysis influence future plans

Tasks:
- save squat feedback history
- map movement issues to training adjustments
- surface coach notes in future plans
- add regression and progression suggestions
- update swap logic based on history

Deliverable:
- `t2ai` becomes an adaptive coach, not just a static planner

Estimated effort:
- `1-2 weeks`

## Milestone 7: Product Polish and Portfolio Layer

Goal:
- make the project impressive for jobs and demos

Tasks:
- add demo dataset and test users
- create polished landing/demo flow
- add architecture diagram
- add eval screenshots / metrics
- add TestFlight build
- record short demo video
- update resume/project bullets

Deliverable:
- portfolio-ready applied AI product case study

Estimated effort:
- `1-2 weeks`

## Suggested 12-Week Roadmap

### Weeks 1-2

Focus:
- Milestone 0
- start Milestone 1

Target outputs:
- new README
- environment setup
- project cleanup
- database schema draft
- auth/persistence started

### Weeks 3-4

Focus:
- finish Milestone 1
- complete Milestone 2

Target outputs:
- real persistence
- exercise catalog and rules
- retrieval-backed planner

### Weeks 5-6

Focus:
- Milestone 3
- start Milestone 4

Target outputs:
- tracing
- basic evals
- Expo app shell
- auth and plan screen on mobile

### Weeks 7-9

Focus:
- Milestone 5

Target outputs:
- upload pipeline
- background jobs
- pose extraction
- first real squat scoring

### Weeks 10-11

Focus:
- Milestone 6

Target outputs:
- feedback history
- adaptive planning hooks
- improved swaps based on analysis

### Week 12

Focus:
- Milestone 7

Target outputs:
- polished demo
- architecture docs
- portfolio story
- resume updates

## Work Prioritization

If time gets tight, prioritize in this order:

1. persistence + auth
2. retrieval-grounded planner
3. real squat analysis
4. mobile app
5. adaptation loop
6. polish

If time is abundant, add:

- workout completion logging
- adherence-based recommendations
- live camera analysis
- exercise library expansion
- personalized progression engine
- multi-lift analysis beyond squat

## What This Project Should Demonstrate

If executed well, `t2ai` should show these AI-job-relevant skills:

- AI product design
- agentic workflow design
- RAG architecture
- structured outputs and tool use
- LLM evaluation
- multimodal ML integration
- asynchronous workflow orchestration
- observability and tracing
- mobile + backend full-stack execution
- cost/performance model routing

## Immediate Next Steps

Recommended next implementation steps inside this repo:

1. replace `README.md`
2. add a `docs/` or keep this roadmap as the source of truth
3. choose Supabase as persistence/auth layer
4. define the first production schema
5. decide whether mobile starts in a sibling app or monorepo package
6. implement persistence before touching squat analysis

## Practical Scope Rule

For every new feature, ask:

- does this make the product more real for users?
- does this better demonstrate applied AI engineering skill?
- can this be finished in a 1-2 week milestone?

If the answer is no, defer it.

The project will become much stronger by finishing a narrow real system than by expanding into too many half-built AI ideas.
