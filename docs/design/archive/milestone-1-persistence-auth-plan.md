# Milestone 1 Plan: Persistence and Auth

Goal:
- make the current web demo durable enough that a returning user keeps their profile, current plan, and plan adjustments
- keep local development usable without a paid API key or a configured Supabase project
- leave a clean auth boundary for full Supabase UI login once the product flow is stable

## Scope

Build this milestone as a backend-first foundation.

In scope:
- Supabase schema for profiles, generated plan history, and plan adjustment events
- server-only Supabase persistence adapter
- demo auth fallback for no-key local development
- optional Supabase bearer-token user resolution for API requests
- async state API that can hydrate from Supabase or fall back to memory
- current routes wired through the persistence boundary

Out of scope for this pass:
- polished login/signup UI
- mobile auth
- video storage
- pgvector retrieval
- squat analysis persistence
- multi-tenant account management beyond the auth/storage boundary

## Data Ownership

The server owns all writes.

Browser code never receives:
- raw database credentials
- direct Ollama host configuration

The app data path does not need a Supabase service-role key. API persistence uses the
user's bearer token so database row-level security remains active.

Browser code may later receive:
- Supabase anon key for login UI
- Supabase access token from an authenticated session

## Runtime Modes

### Demo Mode

Used when Supabase env vars are absent.

Behavior:
- all state stays in the existing process memory fallback
- demo user id defaults to `demo-user`
- app still supports onboarding, generated plan, swaps, and adjustments
- state resets when the Next.js process restarts

### Supabase Mode

Used when `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and a valid Supabase bearer token are present.

Behavior:
- API requests may resolve a Supabase user from `Authorization: Bearer <access_token>`
- invalid bearer tokens return `401`
- requests without a token use explicit demo mode unless `AUTH_REQUIRED=true`
- demo-mode traffic never writes to Supabase
- profile drafts are upserted
- completed profiles generate and persist a new plan row
- accepted swaps and plan adjustments update the current plan JSON and append an adjustment event

## First Schema

Use a pragmatic JSONB-first schema now:
- `profiles` stores normalized onboarding fields
- `training_plans` stores a full validated plan snapshot in `plan_json`
- `plan_adjustments` stores swap/update events

This is intentionally not the final analytics schema. Later milestones can split `training_days` and `training_exercises` into normalized tables when evals, retrieval, and history queries need it.

## Auth Strategy

For the portfolio demo:
- keep a local demo user working with no signup
- support bearer-token Supabase auth in API routes
- defer full login UI until after the Today coach loop is useful
- keep the server-rendered web UI explicitly in demo mode until cookie/session auth is added

Reasoning:
- this keeps the project usable for development and interviews
- it avoids spending the first milestone on auth screens
- it gives the codebase the right security boundary before adding RAG or video uploads

## Milestone Exit Criteria

This milestone is good enough when:
- a profile draft can be saved through the app
- a completed profile generates a plan
- the generated plan can be reloaded from Supabase after server restart when env vars are present
- accepted swaps persist as both the current plan state and an adjustment event
- local development still works without Supabase
- lint and build pass
