# t2ai Product Overview

## Product Summary

`t2ai` is a phone-first AI strength coach designed to help busy intermediate lifters stay consistent and make better day-to-day training decisions.

The project has two goals:

1. build a useful product
2. build a strong applied AI portfolio project that demonstrates modern AI product architecture

## Core Product Promise

The clearest product promise is:

> Tell me what I should do today based on my training history, recovery context, and current constraints.

That means `t2ai` should help users:

- get a personalized training plan
- adapt a workout when recovery, time, soreness, illness, or injury changes
- receive grounded coaching feedback instead of generic chat
- later, review squat technique from uploaded video as the golden form-analysis demo

## Target User

Primary user:

- busy intermediate lifter
- trains `2-5x/week`
- wants structure, flexibility, and confidence
- may use iPhone health data or workout tracking apps already

Not the first target:

- complete beginners who need heavy education
- elite athletes who need specialized coaching depth
- endurance-first athletes

## Why This Project Is Worth Building

`t2ai` is a good stepping stone into AI roles because it creates room to learn and demonstrate:

- product thinking
- backend and API design
- auth, database, and storage design
- LLM structured outputs
- retrieval augmented generation
- evals and observability
- async workflows
- multimodal pipelines
- deterministic + AI hybrid system design

## Product Principles

- `AI should explain decisions, not replace judgment everywhere`
- `deterministic logic should own safety-critical decisions`
- `wearable data is supporting context, not absolute truth`
- `the product should reduce user thinking, not create another dashboard`
- `scope should stay narrow enough to ship and learn from`

## Core User Loops

### 1. Onboarding Loop

The user shares:

- goal
- schedule
- training experience
- equipment
- limitations
- preferences

The system returns:

- structured profile
- first training plan

### 2. Daily Coaching Loop

The user provides or syncs:

- recent recovery signals
- soreness or illness
- schedule/time constraints
- recent adherence

The system returns:

- push / maintain / reduce / recover recommendation
- modified workout for today
- short explanation

### 3. Plan Adaptation Loop

The user asks to:

- swap exercises
- reduce or increase difficulty
- adjust around pain, travel, or equipment

The system returns:

- grounded modifications
- rationale

### 4. Squat Technique Feedback Loop

This is intentionally deferred until the daily coach loop is real.

The user uploads a squat video.

The system:

- extracts pose signals
- computes metrics
- scores technique
- explains a few practical cues

## Product Scope

### v1

- web app with mobile-friendly UX
- profile and plan generation
- daily readiness-aware workout adjustment
- persisted profile, current plan, and plan adjustments
- small retrieval-backed coaching layer
- evaluation harness for onboarding, planning, and swaps

### v2

- real squat form analysis for one golden demo lift
- native mobile app
- Apple Health integration
- one workout tracker integration
- one recovery wearable integration
- richer weekly progress reviews

### v3

- more lift analysis types
- smarter long-term memory
- stronger personalization
- production-grade eval dashboards

## Non-Goals For Early Versions

- supporting every wearable and fitness app
- acting like a medical diagnosis tool
- building a giant fitness social network
- training custom foundation models
- making raw LLM chat the main value
