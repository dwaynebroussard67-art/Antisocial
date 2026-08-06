-- The Gathered Light — Supabase schema
-- Run this in the Supabase SQL editor for your project.
-- No scores, no rankings — only a shared, append-only session log.

create extension if not exists "pgcrypto";

-- One row per two-player (or solo) session.
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- short join code shared between two devices
  game text not null default 'gathered_light',
  skin text not null default 'street',       -- 'street' | 'block' | 'crib'
  status text not null default 'waiting',    -- 'waiting' | 'active' | 'complete'
  mode text not null default 'duo',          -- 'duo' | 'solo'
  player1_id text,
  player2_id text,
  player1_y numeric not null default 0,
  player2_y numeric not null default 0,
  gathered_light numeric not null default 0, -- 0-100
  path_progress numeric not null default 0,  -- 0-100
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_sessions_code_idx on public.game_sessions (code);

-- Append-only log of gathered-light ticks. Never updated, never scored.
create table if not exists public.gather_light_interactions (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  player_id text,
  player1_y numeric,
  player2_y numeric,
  distance numeric,
  gathered_light numeric,
  path_progress numeric,
  event text not null default 'tick', -- 'join' | 'tick' | 'complete'
  created_at timestamptz not null default now()
);

create index if not exists gather_light_interactions_session_idx
  on public.gather_light_interactions (session_id, created_at);

-- Keep updated_at fresh on every write.
create or replace function public.touch_game_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_game_sessions on public.game_sessions;
create trigger trg_touch_game_sessions
  before update on public.game_sessions
  for each row execute function public.touch_game_sessions_updated_at();

-- Row Level Security: open read/write for anon since sessions are joined
-- by a short random code, not authenticated identity. Adjust to your
-- app's auth model as needed.
alter table public.game_sessions enable row level security;
alter table public.gather_light_interactions enable row level security;

create policy "sessions are readable by anyone with the code"
  on public.game_sessions for select using (true);
create policy "sessions can be created by anyone"
  on public.game_sessions for insert with check (true);
create policy "sessions can be updated by anyone"
  on public.game_sessions for update using (true);

create policy "interactions are readable by anyone"
  on public.gather_light_interactions for select using (true);
create policy "interactions can be logged by anyone"
  on public.gather_light_interactions for insert with check (true);
