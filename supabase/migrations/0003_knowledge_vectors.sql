create extension if not exists vector with schema extensions;

create type public.knowledge_chunk_type as enum (
  'exercise_cue',
  'substitution_reason',
  'limitation_guidance',
  'planning_rule',
  'split_pattern'
);

create table if not exists public.knowledge_chunks (
  id text primary key,
  chunk_type public.knowledge_chunk_type not null,
  title text not null,
  body text not null,
  embedding extensions.vector(384) not null,
  metadata jsonb not null default '{}'::jsonb,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Knowledge chunks are global coaching content: every user reads, only the
-- service role (via the seed script) writes. Enable RLS and grant a SELECT
-- policy to anon and authenticated; INSERT/UPDATE/DELETE require service role
-- (which bypasses RLS).
alter table public.knowledge_chunks enable row level security;

create policy "Anyone can read knowledge chunks"
  on public.knowledge_chunks for select
  to anon, authenticated
  using (true);

create or replace function public.match_knowledge_chunks(
  query_embedding text,
  match_count integer default 8,
  match_threshold float default 0.5
)
returns table (
  id text,
  chunk_type public.knowledge_chunk_type,
  title text,
  body text,
  similarity float,
  metadata jsonb
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.chunk_type,
    kc.title,
    kc.body,
    1 - (kc.embedding <=> query_embedding::extensions.vector) as similarity,
    kc.metadata
  from public.knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding::extensions.vector) > match_threshold
  order by kc.embedding <=> query_embedding::extensions.vector
  limit match_count;
end;
$$;
