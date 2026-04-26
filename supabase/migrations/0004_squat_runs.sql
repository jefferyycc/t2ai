-- Milestone 4: Squat Golden Demo
--
-- One row per analyzed squat session. The pose landmarks themselves are not
-- persisted; only the deterministically-computed metrics, the LLM-generated
-- coaching cues, and the score. This keeps storage trivial and lets the
-- adaptation hook in planner.ts read a user's recent squat history without
-- pulling raw video data.

create table if not exists public.squat_runs (
  id text primary key,
  user_id text not null,
  source text not null check (source in ('upload', 'webcam')),
  rep_count integer not null check (rep_count >= 0),
  score integer not null check (score between 0 and 100),
  tier text not null check (tier in ('good', 'needs_work', 'poor')),
  confidence numeric(3, 2) not null check (confidence between 0 and 1),
  metrics_json jsonb not null,
  cues_json jsonb not null default '[]'::jsonb,
  duration_seconds numeric(6, 2),
  created_at timestamptz not null default now()
);

create index if not exists squat_runs_user_created_idx
  on public.squat_runs (user_id, created_at desc);

alter table public.squat_runs enable row level security;

create policy "Users can read their squat runs"
  on public.squat_runs for select
  using (auth.uid()::text = user_id);

create policy "Users can write their squat runs"
  on public.squat_runs for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
