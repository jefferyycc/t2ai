create table if not exists public.readiness_checkins (
  id text primary key,
  user_id text not null,
  time_of_day text check (time_of_day in ('morning', 'midday', 'evening', 'night')),
  soreness integer check (soreness between 1 and 10),
  energy integer check (energy between 1 and 10),
  readiness_level text check (readiness_level in ('green', 'yellow', 'red')),
  checked_in_at timestamptz not null default now()
);

create index if not exists readiness_checkins_user_checked_in_idx
  on public.readiness_checkins (user_id, checked_in_at desc);

alter table public.readiness_checkins enable row level security;

create policy "Users can read their readiness check-ins"
  on public.readiness_checkins for select
  using (auth.uid()::text = user_id);

create policy "Users can write their readiness check-ins"
  on public.readiness_checkins for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
