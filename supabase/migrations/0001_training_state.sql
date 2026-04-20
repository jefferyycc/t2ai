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
create unique index if not exists profiles_user_id_unique_idx on public.profiles (user_id);

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

create or replace function public.save_completed_profile_and_plan(
  profile_payload jsonb,
  plan_payload jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.profiles (
    id,
    user_id,
    workout_goal,
    workout_days_per_week,
    workout_duration_minutes,
    experience_level,
    limitations,
    equipment,
    onboarding_complete,
    updated_at
  )
  values (
    profile_payload->>'id',
    profile_payload->>'user_id',
    profile_payload->>'workout_goal',
    (profile_payload->>'workout_days_per_week')::integer,
    (profile_payload->>'workout_duration_minutes')::integer,
    profile_payload->>'experience_level',
    coalesce(array(select jsonb_array_elements_text(profile_payload->'limitations')), '{}'),
    coalesce(array(select jsonb_array_elements_text(profile_payload->'equipment')), '{}'),
    (profile_payload->>'onboarding_complete')::boolean,
    (profile_payload->>'updated_at')::timestamptz
  )
  on conflict (id) do update set
    workout_goal = excluded.workout_goal,
    workout_days_per_week = excluded.workout_days_per_week,
    workout_duration_minutes = excluded.workout_duration_minutes,
    experience_level = excluded.experience_level,
    limitations = excluded.limitations,
    equipment = excluded.equipment,
    onboarding_complete = excluded.onboarding_complete,
    updated_at = excluded.updated_at;

  insert into public.training_plans (
    id,
    user_id,
    profile_id,
    summary,
    split_label,
    plan_json,
    updated_at
  )
  values (
    plan_payload->>'id',
    plan_payload->>'user_id',
    plan_payload->>'profile_id',
    plan_payload->>'summary',
    plan_payload->>'split_label',
    plan_payload->'plan_json',
    (plan_payload->>'updated_at')::timestamptz
  );
end;
$$;

create or replace function public.apply_plan_update(
  plan_payload jsonb,
  update_payload jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  update public.training_plans
  set
    summary = plan_payload->>'summary',
    split_label = plan_payload->>'split_label',
    plan_json = plan_payload->'plan_json',
    updated_at = (plan_payload->>'updated_at')::timestamptz
  where id = plan_payload->>'id'
    and user_id = plan_payload->>'user_id';

  if not found then
    raise exception 'training plan not found';
  end if;

  insert into public.plan_adjustments (
    id,
    user_id,
    plan_id,
    workout_day_id,
    workout_exercise_id,
    previous_exercise_id,
    new_exercise_id,
    reason,
    created_at
  )
  values (
    update_payload->>'id',
    update_payload->>'user_id',
    update_payload->>'plan_id',
    update_payload->>'workout_day_id',
    update_payload->>'workout_exercise_id',
    update_payload->>'previous_exercise_id',
    update_payload->>'new_exercise_id',
    update_payload->>'reason',
    (update_payload->>'created_at')::timestamptz
  );
end;
$$;
