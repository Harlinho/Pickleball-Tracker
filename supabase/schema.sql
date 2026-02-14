-- Pickleball Tracker - Supabase starter schema
-- Purpose: minimum viable tables for current app model (players + matches)
-- NOTE: Dev policies below allow open read/write for now. Lock down later.

-- 1) Extension for UUID generation
create extension if not exists pgcrypto;

-- 2) Utility trigger function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) Players table
-- Mirrors current TS Player shape in src/types.ts
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,

  name text not null,
  avatar_color text,
  favorite_tennis_player text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every update

drop trigger if exists trg_players_set_updated_at on public.players;
create trigger trg_players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

-- 4) Matches table
-- Mirrors current TS Match shape in src/types.ts
-- Complex nested parts are stored as jsonb:
--   participants: { "A": [playerId], "B": [playerId] }
--   sets: [{ scoreA, scoreB, winnerSide, note }, ...]
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,

  match_date date not null,
  status text not null check (status in ('Completed', 'Not completed')),
  format text not null check (format in ('Singles', 'Doubles')),

  participants jsonb not null,
  set_count integer not null check (set_count between 1 and 5),
  sets jsonb not null default '[]'::jsonb,

  match_winner_side text check (match_winner_side in ('A', 'B')),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every update

drop trigger if exists trg_matches_set_updated_at on public.matches;
create trigger trg_matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

-- 5) Indexes (minimum sensible set)
create index if not exists idx_players_group_id
  on public.players (group_id);

create index if not exists idx_matches_group_id
  on public.matches (group_id);

create index if not exists idx_matches_match_date
  on public.matches (match_date desc);

create index if not exists idx_matches_group_date
  on public.matches (group_id, match_date desc);

-- 6) Enable RLS
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- 7) TEMP DEV POLICIES (open access for now)
-- WARNING: These are intentionally permissive for development only.
-- Replace with auth/group-scoped policies before production usage.

drop policy if exists "dev_full_access_players" on public.players;
create policy "dev_full_access_players"
on public.players
for all
to public
using (true)
with check (true);

drop policy if exists "dev_full_access_matches" on public.matches;
create policy "dev_full_access_matches"
on public.matches
for all
to public
using (true)
with check (true);
