-- ============================================================
-- PLAYOFF PICKS — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- SPORTS & SEASONS
-- ============================================================

create table sports (
  id text primary key,  -- 'nba', 'nfl', 'nhl', 'mlb'
  name text not null,
  logo_url text
);

insert into sports (id, name) values
  ('nba', 'NBA'),
  ('nfl', 'NFL'),
  ('nhl', 'NHL'),
  ('mlb', 'MLB');

create table finish_levels (
  id uuid primary key default uuid_generate_v4(),
  sport_id text references sports(id),
  level integer not null,           -- 1=lowest, 6=highest etc.
  label text not null,              -- e.g. 'NBA Champion'
  multiplier numeric not null,
  unique(sport_id, level)
);

-- NBA finish levels
insert into finish_levels (sport_id, level, label, multiplier) values
  ('nba', 1, 'Missed Playoffs',        1),
  ('nba', 2, 'Playoff Team',           1.875),
  ('nba', 3, 'Conference Semifinalist',3.75),
  ('nba', 4, 'Conference Finalist',    7.5),
  ('nba', 5, 'NBA Finals Runner-Up',   15),
  ('nba', 6, 'NBA Champion',           30);

-- NFL finish levels (adapt as needed)
insert into finish_levels (sport_id, level, label, multiplier) values
  ('nfl', 1, 'Missed Playoffs',        1),
  ('nfl', 2, 'Wild Card',              1.5),
  ('nfl', 3, 'Divisional Round',       3),
  ('nfl', 4, 'Conference Championship',6),
  ('nfl', 5, 'Super Bowl Runner-Up',   12),
  ('nfl', 6, 'Super Bowl Champion',    24);

-- NHL finish levels
insert into finish_levels (sport_id, level, label, multiplier) values
  ('nhl', 1, 'Missed Playoffs',        1),
  ('nhl', 2, 'Playoff Team',           1.875),
  ('nhl', 3, 'Second Round',           3.75),
  ('nhl', 4, 'Conference Finalist',    7.5),
  ('nhl', 5, 'Stanley Cup Runner-Up',  15),
  ('nhl', 6, 'Stanley Cup Champion',   30);

-- MLB finish levels
insert into finish_levels (sport_id, level, label, multiplier) values
  ('mlb', 1, 'Missed Playoffs',        1),
  ('mlb', 2, 'Wild Card Round',        1.5),
  ('mlb', 3, 'Division Series',        3),
  ('mlb', 4, 'Championship Series',    6),
  ('mlb', 5, 'World Series Runner-Up', 15),
  ('mlb', 6, 'World Series Champion',  30);

create table seasons (
  id uuid primary key default uuid_generate_v4(),
  sport_id text references sports(id),
  name text not null,               -- e.g. '2024-25 NBA Season'
  regular_season_deadline timestamptz not null,
  playoff_deadline timestamptz not null,
  status text default 'upcoming'    -- 'upcoming', 'regular_season', 'playoffs', 'complete'
);

create table teams (
  id uuid primary key default uuid_generate_v4(),
  sport_id text references sports(id),
  name text not null,
  abbreviation text not null,
  logo_url text,
  active boolean default true
);

-- ============================================================
-- USERS & PROFILES
-- ============================================================

-- Supabase auth.users handles the actual auth.
-- This table stores public profile info.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),  -- default username from email
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- LEAGUES
-- ============================================================

create table leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  invite_code text unique not null default substring(md5(random()::text), 1, 8),
  owner_id uuid references profiles(id),
  is_public boolean default false,  -- always false for private leagues
  created_at timestamptz default now()
);

create table league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- ============================================================
-- PICKS
-- ============================================================

create table picks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  season_id uuid references seasons(id),
  team_id uuid references teams(id),
  predicted_finish_level integer not null,  -- the finish level number
  submitted_at timestamptz default now(),
  deadline_type text not null,              -- 'regular_season' or 'playoff'
  is_latest boolean default true,
  unique(user_id, season_id, team_id, deadline_type)
);

-- ============================================================
-- RESULTS (admin-entered actual playoff outcomes)
-- ============================================================

create table results (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id),
  team_id uuid references teams(id),
  actual_finish_level integer not null,
  entered_at timestamptz default now(),
  entered_by uuid references profiles(id),
  unique(season_id, team_id)
);

-- ============================================================
-- SCORES (calculated and cached)
-- ============================================================

create table scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  season_id uuid references seasons(id),
  team_id uuid references teams(id),
  final_predicted_level numeric not null,   -- may be avg of two deadlines
  actual_level integer,
  deviation numeric,
  base_points numeric,
  multiplier numeric,
  final_score numeric,
  calculated_at timestamptz default now(),
  unique(user_id, season_id, team_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table picks enable row level security;
alter table results enable row level security;
alter table scores enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Leagues: anyone can read, authenticated users can create
create policy "Anyone can view leagues"
  on leagues for select using (true);
create policy "Authenticated users can create leagues"
  on leagues for insert with check (auth.uid() = owner_id);
create policy "Owner can update league"
  on leagues for update using (auth.uid() = owner_id);

-- League members: members can see their own leagues
create policy "Users can see their memberships"
  on league_members for select using (auth.uid() = user_id);
create policy "Users can join leagues"
  on league_members for insert with check (auth.uid() = user_id);

-- Picks: users manage own picks, others can read
create policy "Anyone can view picks"
  on picks for select using (true);
create policy "Users manage own picks"
  on picks for insert with check (auth.uid() = user_id);
create policy "Users update own picks"
  on picks for update using (auth.uid() = user_id);

-- Results: only admins insert (enforced in app logic + RLS)
create policy "Anyone can view results"
  on results for select using (true);

-- Scores: public read
create policy "Anyone can view scores"
  on scores for select using (true);

-- Sports, finish_levels, seasons, teams: public read
alter table sports enable row level security;
alter table finish_levels enable row level security;
alter table seasons enable row level security;
alter table teams enable row level security;

create policy "Public read sports" on sports for select using (true);
create policy "Public read finish_levels" on finish_levels for select using (true);
create policy "Public read seasons" on seasons for select using (true);
create policy "Public read teams" on teams for select using (true);
