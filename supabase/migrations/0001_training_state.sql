create table if not exists public.profiles (
  id text primary key,
  user_id text not null,
  workout_goal text check (workout_goal in ('fat_loss', 'hypertrophy', 'strength', 'general_fitness')),
  workout_days_per_week integer check (workout_days_per_week between 1 and 7),
  workout_duration_minutes integer check (workout_duration_minutes > 0),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  limitations text[] not null default '{}',
  equipment text[] not null default '{}',
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

create table if not exists public.training_plans (
  id text primary key,
  user_id text not null,
  profile_id text not null references public.profiles(id) on delete cascade,
  summary text not null,
  split_label text not null,
  plan_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists training_plans_user_updated_idx
  on public.training_plans (user_id, updated_at desc);

create table if not exists public.plan_adjustments (
  id text primary key,
  user_id text not null,
  plan_id text not null references public.training_plans(id) on delete cascade,
  workout_day_id text not null,
  workout_exercise_id text not null,
  previous_exercise_id text not null,
  new_exercise_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_adjustments_plan_created_idx
  on public.plan_adjustments (plan_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.training_plans enable row level security;
alter table public.plan_adjustments enable row level security;

create policy "Users can read their profile"
  on public.profiles for select
  using (auth.uid()::text = user_id);

create policy "Users can write their profile"
  on public.profiles for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can read their plans"
  on public.training_plans for select
  using (auth.uid()::text = user_id);

create policy "Users can write their plans"
  on public.training_plans for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can read their adjustments"
  on public.plan_adjustments for select
  using (auth.uid()::text = user_id);

create policy "Users can write their adjustments"
  on public.plan_adjustments for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
