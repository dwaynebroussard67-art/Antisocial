-- =====================================================================
-- THE GATHERED LIGHT — schema, with the RLS tightened
--
-- Run this INSTEAD OF the shipped gatheredLightSchema.sql.
--
-- WHY: the shipped file grants anon full read AND full update on every
-- row of both tables:
--
--   create policy "sessions can be updated by anyone"
--     on public.game_sessions for update using (true);
--   create policy "interactions are readable by anyone"
--     on public.gather_light_interactions for select using (true);
--
-- Its own comment flags this — "Adjust to your app's auth model as
-- needed" — so this is that adjustment, not a disagreement with it.
--
-- What those policies allow, concretely:
--   * anyone can SELECT every session row, so the join codes that are
--     supposed to be the access control are themselves world-readable —
--     the code stops being a secret and the door stops being shut
--   * anyone can UPDATE any session, so a stranger can move another
--     pair's flame, drain their light, or mark their walk complete
--   * gather_light_interactions is an append-only behavioural log —
--     every tick, timestamped, tied to player ids — readable by the
--     whole internet
--
-- That last one matters most here. This is a two-person game about
-- staying close; its interaction log is a record of who sat with whom
-- and for how long. On a site whose stated third priority is privacy,
-- that table must not be world-readable.
--
-- THE FIX, and why it keeps the game working:
--   Reads and writes are scoped to a session whose code you present.
--   You still don't need an account — the code is still the key — but
--   now you have to KNOW a code to touch that row, which is what the
--   original design assumed was already true.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  game text not null default 'gathered_light',
  skin text not null default 'street',
  status text not null default 'waiting',
  mode text not null default 'duo',
  player1_id text,
  player2_id text,
  player1_y numeric not null default 0,
  player2_y numeric not null default 0,
  gathered_light numeric not null default 0,
  path_progress numeric not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_sessions_code_idx on public.game_sessions (code);

create table if not exists public.gather_light_interactions (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  player_id text,
  player1_y numeric,
  player2_y numeric,
  distance numeric,
  gathered_light numeric,
  path_progress numeric,
  event text not null default 'tick',
  created_at timestamptz not null default now()
);

create index if not exists gather_light_interactions_session_idx
  on public.gather_light_interactions (session_id, created_at);

create or replace function public.touch_game_sessions_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_game_sessions on public.game_sessions;
create trigger trg_touch_game_sessions
  before update on public.game_sessions
  for each row execute function public.touch_game_sessions_updated_at();

-- ---------------------------------------------------------------------
-- Sessions older than a day are finished. Nobody is resuming a walk from
-- last week, and an abandoned row is just a record of who was together.
-- ---------------------------------------------------------------------
create or replace function public.gathered_light_session_is_live(p_code text)
returns boolean language sql stable
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.game_sessions
     where code = p_code
       and created_at > now() - interval '24 hours'
  );
$$;

alter table public.game_sessions enable row level security;
alter table public.gather_light_interactions enable row level security;

-- Replace the permissive originals if they were already applied.
drop policy if exists "sessions are readable by anyone with the code" on public.game_sessions;
drop policy if exists "sessions can be created by anyone" on public.game_sessions;
drop policy if exists "sessions can be updated by anyone" on public.game_sessions;
drop policy if exists "interactions are readable by anyone" on public.gather_light_interactions;
drop policy if exists "interactions can be logged by anyone" on public.gather_light_interactions;

-- ---------------------------------------------------------------------
-- SESSIONS
--
-- Reading requires naming the code. `code = current_setting(...)` means a
-- client that sets the request-local `app.session_code` sees exactly the
-- one row it holds a code for, and enumeration returns nothing.
--
-- The client sets it per request:
--   await supabase.rpc('set_config', {
--     setting_name: 'app.session_code', new_value: code, is_local: true
--   });
-- ---------------------------------------------------------------------
create policy "read only the session you hold the code for"
  on public.game_sessions for select
  using (code = current_setting('app.session_code', true));

-- Creating stays open: a new session is a fresh random code and reveals
-- nothing about anyone else.
create policy "anyone may open a new session"
  on public.game_sessions for insert
  with check (true);

-- Updating requires the code AND the session still being live, so an old
-- row can't be rewritten later.
create policy "update only the session you hold the code for"
  on public.game_sessions for update
  using (
    code = current_setting('app.session_code', true)
    and created_at > now() - interval '24 hours'
  );

-- ---------------------------------------------------------------------
-- INTERACTIONS — the behavioural log. Write-mostly by design.
--
-- No SELECT policy at all, deliberately. RLS denies by default, so the
-- log is invisible to clients entirely: the game never needs to read its
-- own ticks back, and nobody should be able to reconstruct who sat with
-- whom. Add a staff-scoped read policy later if it's ever actually
-- needed — don't open it to anon to make a debugging session easier.
-- ---------------------------------------------------------------------
create policy "log a tick against a session you hold the code for"
  on public.gather_light_interactions for insert
  with check (
    exists (
      select 1 from public.game_sessions s
       where s.id = session_id
         and s.code = current_setting('app.session_code', true)
    )
  );

-- ---------------------------------------------------------------------
-- Retention. The game keeps no scores by design; the log shouldn't
-- quietly become the permanent record the game refuses to keep.
-- Schedule with pg_cron, or call it from any admin task.
-- ---------------------------------------------------------------------
create or replace function public.prune_gathered_light(older_than interval default interval '30 days')
returns integer language plpgsql
set search_path = pg_catalog, public as $$
declare
  removed integer;
begin
  delete from public.game_sessions
   where created_at < now() - older_than;
  get diagnostics removed = row_count;
  return removed;  -- interactions cascade with their session
end;
$$;

comment on function public.prune_gathered_light(interval) is
  'Deletes sessions (and their cascaded interaction logs) older than the '
  'given interval. The game keeps no scores; its log should not outlive '
  'the walk it recorded.';
